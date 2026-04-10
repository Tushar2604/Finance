import dbConnect from '@/lib/db/connection'
import Timesheet, { ITimesheet } from '@/lib/db/models/Timesheet'
import Employee from '@/lib/db/models/Employee'
import Invoice from '@/lib/db/models/Invoice'
import Client from '@/lib/db/models/Client'
import mongoose from 'mongoose'
import { paginate, buildPaginationMeta, generateInvoiceNumber, calculateVAT, getMonthRange } from '@/lib/utils'

export interface TimesheetFilters {
  employeeId?: string
  clientId?: string
  month?: string
  status?: string
  hrApprovalStatus?: string
  signedTimesheetStatus?: string
  page?: number
  limit?: number
}

export interface PaginatedTimesheets {
  data: ITimesheet[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

type TimesheetMutationInput = Omit<Partial<ITimesheet>, 'employeeId' | 'clientId' | 'projectId'> & {
  employeeId?: mongoose.Types.ObjectId | string
  clientId?: mongoose.Types.ObjectId | string
  projectId?: mongoose.Types.ObjectId | string | null
}

function normalizeTimesheetMutationInput(data: TimesheetMutationInput): Partial<ITimesheet> {
  const normalized: TimesheetMutationInput = { ...data }

  if (data.employeeId !== undefined) {
    if (data.employeeId instanceof mongoose.Types.ObjectId) {
      normalized.employeeId = data.employeeId
    } else if (mongoose.Types.ObjectId.isValid(data.employeeId)) {
      normalized.employeeId = new mongoose.Types.ObjectId(data.employeeId)
    } else {
      throw Object.assign(new Error('Invalid employee ID'), { statusCode: 400 })
    }
  }

  if (data.clientId !== undefined) {
    if (data.clientId instanceof mongoose.Types.ObjectId) {
      normalized.clientId = data.clientId
    } else if (mongoose.Types.ObjectId.isValid(data.clientId)) {
      normalized.clientId = new mongoose.Types.ObjectId(data.clientId)
    } else {
      throw Object.assign(new Error('Invalid client ID'), { statusCode: 400 })
    }
  }

  if (data.projectId !== undefined) {
    if (data.projectId === null || data.projectId instanceof mongoose.Types.ObjectId) {
      normalized.projectId = data.projectId
    } else if (mongoose.Types.ObjectId.isValid(data.projectId)) {
      normalized.projectId = new mongoose.Types.ObjectId(data.projectId)
    } else {
      throw Object.assign(new Error('Invalid project ID'), { statusCode: 400 })
    }
  }

  return normalized as Partial<ITimesheet>
}

export async function getTimesheets(filters: TimesheetFilters): Promise<PaginatedTimesheets> {
  await dbConnect()

  const { employeeId, clientId, month, status, hrApprovalStatus, signedTimesheetStatus, page = 1, limit = 20 } = filters
  const { skip, limit: safeLimit } = paginate(page, limit)

  const query: mongoose.FilterQuery<ITimesheet> = {}

  if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
    query.employeeId = new mongoose.Types.ObjectId(employeeId)
  }
  if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
    query.clientId = new mongoose.Types.ObjectId(clientId)
  }
  if (month) query.month = month
  if (status) query.status = status
  if (hrApprovalStatus) query.hrApprovalStatus = hrApprovalStatus
  if (signedTimesheetStatus) query.signedTimesheetStatus = signedTimesheetStatus

  const [data, total] = await Promise.all([
    Timesheet.find(query)
      .populate('employeeId', 'name employeeCode position')
      .populate('clientId', 'name')
      .populate('projectId', 'name')
      .sort({ month: -1, createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Timesheet.countDocuments(query),
  ])

  return {
    data: data as unknown as ITimesheet[],
    pagination: buildPaginationMeta(total, page, safeLimit),
  }
}

export async function getTimesheetById(id: string): Promise<ITimesheet> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid timesheet ID'), { statusCode: 400 })
  }

  const timesheet = await Timesheet.findById(id)
    .populate('employeeId', 'name employeeCode position baseSalary')
    .populate('clientId', 'name rateCard billingType')
    .populate('projectId', 'name')
    .populate('approvedBy', 'name email')
    .lean()

  if (!timesheet) {
    throw Object.assign(new Error('Timesheet not found'), { statusCode: 404 })
  }

  return timesheet as unknown as ITimesheet
}

export async function createTimesheet(data: TimesheetMutationInput): Promise<ITimesheet> {
  await dbConnect()
  const normalizedData = normalizeTimesheetMutationInput(data)

  // Check for duplicate
  const existing = await Timesheet.findOne({
    employeeId: normalizedData.employeeId,
    clientId: normalizedData.clientId,
    month: normalizedData.month,
  })

  if (existing) {
    throw Object.assign(
      new Error(`Timesheet already exists for this employee, client, and month (${normalizedData.month})`),
      { statusCode: 409 }
    )
  }

  const timesheet = await Timesheet.create(normalizedData)
  return timesheet
}

export async function updateTimesheet(id: string, data: TimesheetMutationInput): Promise<ITimesheet> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid timesheet ID'), { statusCode: 400 })
  }

  const timesheet = await Timesheet.findById(id)
  if (!timesheet) {
    throw Object.assign(new Error('Timesheet not found'), { statusCode: 404 })
  }

  if (timesheet.status === 'Approved') {
    throw Object.assign(new Error('Cannot update an approved timesheet'), { statusCode: 400 })
  }

  const updated = await Timesheet.findByIdAndUpdate(id, normalizeTimesheetMutationInput(data), {
    new: true,
    runValidators: true,
  })

  return updated as ITimesheet
}

export async function deleteTimesheet(id: string): Promise<void> {
  await dbConnect()
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid timesheet ID'), { statusCode: 400 })
  }
  const deleted = await Timesheet.findByIdAndDelete(id)
  if (!deleted) {
    throw Object.assign(new Error('Timesheet not found'), { statusCode: 404 })
  }
}

export async function approveTimesheet(id: string, approverId: string): Promise<ITimesheet> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid timesheet ID'), { statusCode: 400 })
  }

  const timesheet = await Timesheet.findById(id)
  if (!timesheet) {
    throw Object.assign(new Error('Timesheet not found'), { statusCode: 404 })
  }

  if (timesheet.status === 'Approved') {
    throw Object.assign(new Error('Timesheet is already approved'), { statusCode: 400 })
  }

  const updated = await Timesheet.findByIdAndUpdate(
    id,
    {
      status: 'Approved',
      approvedBy: new mongoose.Types.ObjectId(approverId),
      approvalDate: new Date(),
    },
    { new: true }
  )

  // Trigger invoice generation
  try {
    await generateInvoicesFromTimesheets_internal(id)
  } catch (err) {
    console.error('[approveTimesheet] Invoice generation failed:', err)
  }

  return updated as ITimesheet
}

export async function rejectTimesheet(
  id: string,
  approverId: string,
  reason: string
): Promise<ITimesheet> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid timesheet ID'), { statusCode: 400 })
  }

  const timesheet = await Timesheet.findById(id)
  if (!timesheet) {
    throw Object.assign(new Error('Timesheet not found'), { statusCode: 404 })
  }

  if (timesheet.status === 'Approved') {
    throw Object.assign(new Error('Cannot reject an already approved timesheet'), { statusCode: 400 })
  }

  const updated = await Timesheet.findByIdAndUpdate(
    id,
    {
      status: 'Rejected',
      approvedBy: new mongoose.Types.ObjectId(approverId),
      approvalDate: new Date(),
      notes: reason || timesheet.notes,
    },
    { new: true }
  )

  return updated as ITimesheet
}

export interface MissingTimesheetResult {
  employeeId: string
  employeeName: string
  employeeCode: string
  clientId: string
  clientName: string
  month: string
}

export async function getMissingTimesheets(month: string): Promise<MissingTimesheetResult[]> {
  await dbConnect()

  // Get all active employees with assigned clients
  const activeEmployees = await Employee.find({
    status: 'Active',
    assignedClientId: { $ne: null },
  })
    .populate('assignedClientId', 'name')
    .lean()

  const missing: MissingTimesheetResult[] = []

  for (const emp of activeEmployees) {
    const exists = await Timesheet.exists({
      employeeId: emp._id,
      clientId: emp.assignedClientId,
      month,
    })

    if (!exists) {
      const client = emp.assignedClientId as unknown as { _id: mongoose.Types.ObjectId; name: string }
      missing.push({
        employeeId: emp._id.toString(),
        employeeName: emp.name,
        employeeCode: emp.employeeCode,
        clientId: client._id.toString(),
        clientName: client.name,
        month,
      })
    }
  }

  return missing
}

async function generateInvoicesFromTimesheets_internal(timesheetId: string): Promise<void> {
  const timesheet = await Timesheet.findById(timesheetId)
    .populate('clientId', 'rateCard billingType creditTerms')
    .populate('employeeId', 'name')

  if (!timesheet || timesheet.status !== 'Approved') return

  // Check invoice doesn't already exist for this timesheet
  const existingInvoice = await Invoice.findOne({ timesheetId: timesheet._id })
  if (existingInvoice) return

  const client = timesheet.clientId as unknown as {
    _id: mongoose.Types.ObjectId
    rateCard: number
    creditTerms: number
  }

  const rate = client.rateCard ?? 0
  const hours = timesheet.hours
  const subtotal = parseFloat((rate * hours).toFixed(2))
  const { vatAmount, totalWithVAT } = calculateVAT(subtotal)

  const invoiceDate = new Date()
  const dueDate = new Date(invoiceDate)
  dueDate.setDate(dueDate.getDate() + (client.creditTerms ?? 30))

  await Invoice.create({
    invoiceNumber: generateInvoiceNumber(),
    clientId: timesheet.clientId,
    employeeId: timesheet.employeeId,
    projectId: timesheet.projectId,
    timesheetId: timesheet._id,
    month: timesheet.month,
    rate,
    hours,
    subtotal,
    vatAmount,
    totalAmount: totalWithVAT,
    status: 'Draft',
    invoiceDate,
    dueDate,
  })
}

export interface GenerateInvoicesResult {
  processed: number
  created: number
  skipped: number
  errors: string[]
}

export async function generateInvoicesFromTimesheets(month: string): Promise<GenerateInvoicesResult> {
  await dbConnect()

  const approvedTimesheets = await Timesheet.find({ month, status: 'Approved' })
    .populate('clientId', 'rateCard creditTerms')
    .lean()

  let created = 0
  let skipped = 0
  const errors: string[] = []

  for (const ts of approvedTimesheets) {
    try {
      const existing = await Invoice.findOne({ timesheetId: ts._id })
      if (existing) {
        skipped++
        continue
      }

      const client = ts.clientId as unknown as {
        _id: mongoose.Types.ObjectId
        rateCard: number
        creditTerms: number
      }

      const rate = client.rateCard ?? 0
      const hours = ts.hours
      const subtotal = parseFloat((rate * hours).toFixed(2))
      const { vatAmount, totalWithVAT } = calculateVAT(subtotal)

      const invoiceDate = new Date()
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + (client.creditTerms ?? 30))

      await Invoice.create({
        invoiceNumber: generateInvoiceNumber(),
        clientId: ts.clientId,
        employeeId: ts.employeeId,
        projectId: ts.projectId,
        timesheetId: ts._id,
        month: ts.month,
        rate,
        hours,
        subtotal,
        vatAmount,
        totalAmount: totalWithVAT,
        status: 'Draft',
        invoiceDate,
        dueDate,
      })

      created++
    } catch (err) {
      const error = err as Error
      errors.push(`Timesheet ${ts._id}: ${error.message}`)
    }
  }

  return {
    processed: approvedTimesheets.length,
    created,
    skipped,
    errors,
  }
}
