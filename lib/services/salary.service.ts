import dbConnect from '@/lib/db/connection'
import Salary, { ISalary, PaymentStatus } from '@/lib/db/models/Salary'
import AuditLog from '@/lib/db/models/AuditLog'
import mongoose from 'mongoose'
import { paginate, buildPaginationMeta } from '@/lib/utils'

export interface SalaryFilters {
  employeeId?: string
  month?: string
  paymentStatus?: PaymentStatus
  search?: string
  page?: number
  limit?: number
}

export interface PaginatedSalaries {
  data: ISalary[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

type SalaryMutationInput = Omit<Partial<ISalary>, 'employeeId'> & {
  employeeId?: mongoose.Types.ObjectId | string
}

function normalizeSalaryMutationInput(data: SalaryMutationInput): Partial<ISalary> {
  const normalized: SalaryMutationInput = { ...data }
  if (data.employeeId !== undefined) {
    if (data.employeeId instanceof mongoose.Types.ObjectId) {
      normalized.employeeId = data.employeeId
    } else if (mongoose.Types.ObjectId.isValid(data.employeeId)) {
      normalized.employeeId = new mongoose.Types.ObjectId(data.employeeId)
    } else {
      throw Object.assign(new Error('Invalid employee ID'), { statusCode: 400 })
    }
  }
  return normalized as Partial<ISalary>
}

export async function getSalaries(filters: SalaryFilters): Promise<PaginatedSalaries> {
  await dbConnect()

  const { employeeId, month, paymentStatus, search, page = 1, limit = 20 } = filters
  const { skip, limit: safeLimit } = paginate(page, limit)

  const query: mongoose.FilterQuery<ISalary> = {}

  if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
    query.employeeId = new mongoose.Types.ObjectId(employeeId)
  }

  if (month) query.month = month
  if (paymentStatus) query.paymentStatus = paymentStatus

  if (search) {
    const Employee = (await import('@/lib/db/models/Employee')).default
    const matchingEmployees = await Employee.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
      ],
    }).select('_id')
    const empIds = matchingEmployees.map((e: { _id: mongoose.Types.ObjectId }) => e._id)
    query.employeeId = { $in: empIds }
  }

  const [data, total] = await Promise.all([
    Salary.find(query)
      .populate('employeeId', 'name employeeCode')
      .sort({ month: -1, createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Salary.countDocuments(query),
  ])

  return {
    data: data as unknown as ISalary[],
    pagination: buildPaginationMeta(total, page, safeLimit),
  }
}

export async function getSalaryById(id: string): Promise<ISalary> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid salary ID'), { statusCode: 400 })
  }

  const salary = await Salary.findById(id).populate('employeeId').lean()
  if (!salary) {
    throw Object.assign(new Error('Salary not found'), { statusCode: 404 })
  }

  return salary as unknown as ISalary
}

export async function createSalary(data: SalaryMutationInput, userId: string): Promise<ISalary> {
  await dbConnect()
  const normalizedData = normalizeSalaryMutationInput(data)

  // Prevent duplicate month for same employee
  const existing = await Salary.findOne({ employeeId: normalizedData.employeeId, month: normalizedData.month })
  if (existing) {
    throw Object.assign(new Error(`Salary for ${data.month} already exists for this employee.`), { statusCode: 400 })
  }

  const salary = await Salary.create(normalizedData)

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(userId),
    action: 'CREATE',
    entityType: 'Salary',
    entityId: salary._id,
    previousData: null,
    newData: salary.toObject(),
  })

  return salary
}

export async function updateSalary(id: string, data: SalaryMutationInput, userId: string): Promise<ISalary> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid salary ID'), { statusCode: 400 })
  }

  const existing = await Salary.findById(id)
  if (!existing) {
    throw Object.assign(new Error('Salary not found'), { statusCode: 404 })
  }

  const previousData = existing.toObject()
  const updated = await Salary.findByIdAndUpdate(id, normalizeSalaryMutationInput(data), {
    new: true,
    runValidators: true,
  })

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(userId),
    action: 'UPDATE',
    entityType: 'Salary',
    entityId: new mongoose.Types.ObjectId(id),
    previousData,
    newData: updated?.toObject(),
  })

  return updated as ISalary
}

export async function deleteSalary(id: string, userId: string): Promise<void> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid salary ID'), { statusCode: 400 })
  }

  const existing = await Salary.findById(id)
  if (!existing) {
    throw Object.assign(new Error('Salary not found'), { statusCode: 404 })
  }

  const previousData = existing.toObject()
  await Salary.findByIdAndDelete(id)

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(userId),
    action: 'DELETE',
    entityType: 'Salary',
    entityId: new mongoose.Types.ObjectId(id),
    previousData,
    newData: null,
  })
}

export async function generateWpsFile(month: string): Promise<string> {
  // Mock WPS generation logic
  await dbConnect()
  
  const salaries = await Salary.find({ month, paymentStatus: 'Pending', paymentMode: 'WPS' }).populate('employeeId')
  
  if (!salaries.length) return ''
  
  // Basic CSV-like WPS format
  const header = 'Employee ID,Bank Routing,Account,Amount,Month'
  const rows = salaries.map(s => {
    const emp: any = s.employeeId
    return `${emp.employeeId || 'N/A'},${emp.bankDetails?.routingNumber || '000000'},${emp.bankDetails?.accountNumber || '0000'},${s.netSalary},${s.month}`
  })
  
  return [header, ...rows].join('\n')
}
