import dbConnect from '@/lib/db/connection'
import Invoice, { IInvoice, InvoiceStatus } from '@/lib/db/models/Invoice'
import Timesheet from '@/lib/db/models/Timesheet'
import Client from '@/lib/db/models/Client'
import AuditLog from '@/lib/db/models/AuditLog'
import mongoose from 'mongoose'
import {
  paginate,
  buildPaginationMeta,
  generateInvoiceNumber,
  calculateVAT,
} from '@/lib/utils'

export interface InvoiceFilters {
  clientId?: string
  status?: string
  month?: string
  page?: number
  limit?: number
}

export interface PaginatedInvoices {
  data: IInvoice[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface ReceivableAgingBucket {
  count: number
  totalAmount: number
  invoices: Array<{ _id: string; invoiceNumber: string; clientName: string; amount: number; daysOverdue: number }>
}

export interface ReceivableAging {
  '0-30': ReceivableAgingBucket
  '30-60': ReceivableAgingBucket
  '60+': ReceivableAgingBucket
  totalUnpaid: number
}

export interface VATReport {
  month: string
  totalInvoiced: number
  totalSubtotal: number
  totalVAT: number
  vatPayable: number
  invoiceCount: number
}

type InvoiceMutationInput = Omit<Partial<IInvoice>, 'clientId' | 'employeeId' | 'projectId' | 'timesheetId'> & {
  clientId?: mongoose.Types.ObjectId | string
  employeeId?: mongoose.Types.ObjectId | string | null
  projectId?: mongoose.Types.ObjectId | string | null
  timesheetId?: mongoose.Types.ObjectId | string | null
}

function normalizeObjectId(
  value: mongoose.Types.ObjectId | string | null | undefined,
  fieldName: string
): mongoose.Types.ObjectId | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (value instanceof mongoose.Types.ObjectId) return value
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw Object.assign(new Error(`Invalid ${fieldName}`), { statusCode: 400 })
  }
  return new mongoose.Types.ObjectId(value)
}

function normalizeInvoiceMutationInput(data: InvoiceMutationInput): Partial<IInvoice> {
  return {
    ...data,
    clientId: normalizeObjectId(data.clientId, 'client ID') as mongoose.Types.ObjectId | undefined,
    employeeId: normalizeObjectId(data.employeeId, 'employee ID'),
    projectId: normalizeObjectId(data.projectId, 'project ID'),
    timesheetId: normalizeObjectId(data.timesheetId, 'timesheet ID'),
  } as Partial<IInvoice>
}

export async function getInvoices(filters: InvoiceFilters): Promise<PaginatedInvoices> {
  await dbConnect()

  const { clientId, status, month, page = 1, limit = 20 } = filters
  const { skip, limit: safeLimit } = paginate(page, limit)

  const query: mongoose.FilterQuery<IInvoice> = {}
  if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
    query.clientId = new mongoose.Types.ObjectId(clientId)
  }
  if (status) query.status = status
  if (month) query.month = month

  const [data, total] = await Promise.all([
    Invoice.find(query)
      .populate('clientId', 'name companyDetails')
      .populate('employeeId', 'name employeeCode')
      .populate('projectId', 'name')
      .sort({ invoiceDate: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Invoice.countDocuments(query),
  ])

  return {
    data: data as unknown as IInvoice[],
    pagination: buildPaginationMeta(total, page, safeLimit),
  }
}

export async function getInvoiceById(id: string): Promise<IInvoice> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid invoice ID'), { statusCode: 400 })
  }

  const invoice = await Invoice.findById(id)
    .populate('clientId', 'name companyDetails rateCard billingType creditTerms')
    .populate('employeeId', 'name employeeCode position')
    .populate('projectId', 'name status')
    .populate('timesheetId', 'month workingDays hours overtimeHours status')
    .lean()

  if (!invoice) {
    throw Object.assign(new Error('Invoice not found'), { statusCode: 404 })
  }

  return invoice as unknown as IInvoice
}

export async function createInvoice(data: InvoiceMutationInput, userId: string): Promise<IInvoice> {
  await dbConnect()

  // Auto-generate invoice number
  const invoiceNumber = generateInvoiceNumber()

  // Auto-calculate subtotal, VAT, total if not provided
  const normalizedData = normalizeInvoiceMutationInput(data)
  const rate = normalizedData.rate ?? 0
  const hours = normalizedData.hours ?? 0
  const subtotal = data.subtotal ?? parseFloat((rate * hours).toFixed(2))
  const { vatAmount, totalWithVAT } = calculateVAT(subtotal)

  const invoiceData = {
    ...normalizedData,
    invoiceNumber,
    subtotal: normalizedData.subtotal ?? subtotal,
    vatAmount: normalizedData.vatAmount ?? vatAmount,
    totalAmount: normalizedData.totalAmount ?? totalWithVAT,
  }

  const invoice = await Invoice.create(invoiceData)

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(userId),
    action: 'CREATE',
    entityType: 'Invoice',
    entityId: invoice._id,
    previousData: null,
    newData: invoice.toObject(),
  })

  return invoice
}

export async function updateInvoice(
  id: string,
  data: InvoiceMutationInput,
  userId: string
): Promise<IInvoice> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid invoice ID'), { statusCode: 400 })
  }

  const existing = await Invoice.findById(id)
  if (!existing) {
    throw Object.assign(new Error('Invoice not found'), { statusCode: 404 })
  }

  if (existing.status === 'Cancelled') {
    throw Object.assign(new Error('Cannot update a cancelled invoice'), { statusCode: 400 })
  }

  const previousData = existing.toObject()
  const updated = await Invoice.findByIdAndUpdate(id, normalizeInvoiceMutationInput(data), {
    new: true,
    runValidators: true,
  })

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(userId),
    action: 'UPDATE',
    entityType: 'Invoice',
    entityId: new mongoose.Types.ObjectId(id),
    previousData,
    newData: updated?.toObject(),
  })

  return updated as IInvoice
}

export async function recordPayment(
  invoiceId: string,
  amount: number,
  paymentDate: Date,
  userId: string
): Promise<IInvoice> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    throw Object.assign(new Error('Invalid invoice ID'), { statusCode: 400 })
  }

  const invoice = await Invoice.findById(invoiceId)
  if (!invoice) {
    throw Object.assign(new Error('Invoice not found'), { statusCode: 404 })
  }

  if (invoice.status === 'Paid') {
    throw Object.assign(new Error('Invoice is already fully paid'), { statusCode: 400 })
  }

  if (invoice.status === 'Cancelled') {
    throw Object.assign(new Error('Cannot record payment for a cancelled invoice'), { statusCode: 400 })
  }

  const newPaidAmount = parseFloat((invoice.paidAmount + amount).toFixed(2))

  if (newPaidAmount > invoice.totalAmount) {
    throw Object.assign(
      new Error(`Payment amount exceeds invoice total. Outstanding: ${invoice.totalAmount - invoice.paidAmount}`),
      { statusCode: 400 }
    )
  }

  let newStatus: InvoiceStatus
  if (newPaidAmount >= invoice.totalAmount) {
    newStatus = 'Paid'
  } else if (newPaidAmount > 0) {
    newStatus = 'PartiallyPaid'
  } else {
    newStatus = invoice.status
  }

  const previousData = invoice.toObject()
  const updated = await Invoice.findByIdAndUpdate(
    invoiceId,
    {
      paidAmount: newPaidAmount,
      paidDate: newStatus === 'Paid' ? paymentDate : invoice.paidDate,
      status: newStatus,
    },
    { new: true }
  )

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(userId),
    action: 'PAYMENT_RECORDED',
    entityType: 'Invoice',
    entityId: new mongoose.Types.ObjectId(invoiceId),
    previousData,
    newData: { paidAmount: newPaidAmount, status: newStatus },
  })

  return updated as IInvoice
}

export async function generateFromTimesheet(timesheetId: string, userId: string): Promise<IInvoice> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(timesheetId)) {
    throw Object.assign(new Error('Invalid timesheet ID'), { statusCode: 400 })
  }

  const timesheet = await Timesheet.findById(timesheetId)
    .populate('clientId', 'rateCard creditTerms')
    .populate('employeeId', 'name')

  if (!timesheet) {
    throw Object.assign(new Error('Timesheet not found'), { statusCode: 404 })
  }

  if (timesheet.status !== 'Approved') {
    throw Object.assign(new Error('Can only generate invoices from approved timesheets'), { statusCode: 400 })
  }

  const existing = await Invoice.findOne({ timesheetId: timesheet._id })
  if (existing) {
    throw Object.assign(new Error('Invoice already exists for this timesheet'), { statusCode: 409 })
  }

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

  return createInvoice(
    {
      invoiceNumber: generateInvoiceNumber(),
      clientId: timesheet.clientId as mongoose.Types.ObjectId,
      employeeId: timesheet.employeeId as mongoose.Types.ObjectId,
      projectId: timesheet.projectId,
      timesheetId: timesheet._id as mongoose.Types.ObjectId,
      month: timesheet.month,
      rate,
      hours,
      subtotal,
      vatAmount,
      totalAmount: totalWithVAT,
      status: 'Draft',
      invoiceDate,
      dueDate,
    },
    userId
  )
}

export async function getReceivableAging(): Promise<ReceivableAging> {
  await dbConnect()

  const now = new Date()

  const unpaidInvoices = await Invoice.find({
    status: { $in: ['Sent', 'PartiallyPaid', 'Overdue'] },
  })
    .populate('clientId', 'name')
    .lean()

  const result: ReceivableAging = {
    '0-30': { count: 0, totalAmount: 0, invoices: [] },
    '30-60': { count: 0, totalAmount: 0, invoices: [] },
    '60+': { count: 0, totalAmount: 0, invoices: [] },
    totalUnpaid: 0,
  }

  for (const inv of unpaidInvoices) {
    const outstanding = inv.totalAmount - inv.paidAmount
    const dueDate = new Date(inv.dueDate)
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
    const client = inv.clientId as unknown as { name: string }

    const entry = {
      _id: inv._id.toString(),
      invoiceNumber: inv.invoiceNumber,
      clientName: client?.name ?? 'Unknown',
      amount: outstanding,
      daysOverdue,
    }

    result.totalUnpaid += outstanding

    if (daysOverdue <= 30) {
      result['0-30'].count++
      result['0-30'].totalAmount += outstanding
      result['0-30'].invoices.push(entry)
    } else if (daysOverdue <= 60) {
      result['30-60'].count++
      result['30-60'].totalAmount += outstanding
      result['30-60'].invoices.push(entry)
    } else {
      result['60+'].count++
      result['60+'].totalAmount += outstanding
      result['60+'].invoices.push(entry)
    }
  }

  result.totalUnpaid = parseFloat(result.totalUnpaid.toFixed(2))
  result['0-30'].totalAmount = parseFloat(result['0-30'].totalAmount.toFixed(2))
  result['30-60'].totalAmount = parseFloat(result['30-60'].totalAmount.toFixed(2))
  result['60+'].totalAmount = parseFloat(result['60+'].totalAmount.toFixed(2))

  return result
}

export async function getVATReport(month: string): Promise<VATReport> {
  await dbConnect()

  const result = await Invoice.aggregate([
    {
      $match: {
        month,
        status: { $in: ['Sent', 'PartiallyPaid', 'Paid', 'Overdue'] },
      },
    },
    {
      $group: {
        _id: null,
        totalInvoiced: { $sum: '$totalAmount' },
        totalSubtotal: { $sum: '$subtotal' },
        totalVAT: { $sum: '$vatAmount' },
        invoiceCount: { $sum: 1 },
      },
    },
  ])

  const data = result[0] ?? {
    totalInvoiced: 0,
    totalSubtotal: 0,
    totalVAT: 0,
    invoiceCount: 0,
  }

  return {
    month,
    totalInvoiced: parseFloat((data.totalInvoiced ?? 0).toFixed(2)),
    totalSubtotal: parseFloat((data.totalSubtotal ?? 0).toFixed(2)),
    totalVAT: parseFloat((data.totalVAT ?? 0).toFixed(2)),
    vatPayable: parseFloat((data.totalVAT ?? 0).toFixed(2)),
    invoiceCount: data.invoiceCount ?? 0,
  }
}
