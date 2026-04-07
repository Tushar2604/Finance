import dbConnect from '@/lib/db/connection'
import Expense, { IExpense } from '@/lib/db/models/Expense'
import AuditLog from '@/lib/db/models/AuditLog'
import mongoose from 'mongoose'
import { paginate, buildPaginationMeta } from '@/lib/utils'

export interface ExpenseFilters {
  projectId?: string
  employeeId?: string
  status?: 'Pending' | 'Approved' | 'Rejected'
  page?: number
  limit?: number
}

export interface PaginatedExpenses {
  data: IExpense[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export async function getExpenses(filters: ExpenseFilters): Promise<PaginatedExpenses> {
  await dbConnect()

  const { projectId, employeeId, status, page = 1, limit = 20 } = filters
  const { skip, limit: safeLimit } = paginate(page, limit)

  const query: mongoose.FilterQuery<IExpense> = {}

  if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
    query.projectId = new mongoose.Types.ObjectId(projectId)
  }
  if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
    query.employeeId = new mongoose.Types.ObjectId(employeeId)
  }
  if (status) query.status = status

  const [data, total] = await Promise.all([
    Expense.find(query)
      .populate('employeeId', 'firstName lastName')
      .populate('projectId', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Expense.countDocuments(query),
  ])

  return {
    data: data as unknown as IExpense[],
    pagination: buildPaginationMeta(total, page, safeLimit),
  }
}

export async function getExpenseById(id: string): Promise<IExpense> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid expense ID'), { statusCode: 400 })
  }

  const expense = await Expense.findById(id).populate('employeeId').populate('projectId').lean()
  if (!expense) {
    throw Object.assign(new Error('Expense not found'), { statusCode: 404 })
  }

  return expense as unknown as IExpense
}

export async function createExpense(data: Partial<IExpense>, userId: string): Promise<IExpense> {
  await dbConnect()
  
  if(!data.employeeId) {
     data.employeeId = new mongoose.Types.ObjectId(userId)
  }

  const expense = await Expense.create(data)

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(userId),
    action: 'CREATE',
    entityType: 'Expense',
    entityId: expense._id,
    previousData: null,
    newData: expense.toObject(),
  })

  return expense
}

export async function updateExpense(id: string, data: Partial<IExpense>, userId: string): Promise<IExpense> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid expense ID'), { statusCode: 400 })
  }

  const existing = await Expense.findById(id)
  if (!existing) {
    throw Object.assign(new Error('Expense not found'), { statusCode: 404 })
  }

  const previousData = existing.toObject()
  const updated = await Expense.findByIdAndUpdate(id, data, { new: true, runValidators: true })

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(userId),
    action: 'UPDATE',
    entityType: 'Expense',
    entityId: new mongoose.Types.ObjectId(id),
    previousData,
    newData: updated?.toObject(),
  })

  return updated as IExpense
}

export async function deleteExpense(id: string, userId: string): Promise<void> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid expense ID'), { statusCode: 400 })
  }

  const existing = await Expense.findById(id)
  if (!existing) {
    throw Object.assign(new Error('Expense not found'), { statusCode: 404 })
  }

  const previousData = existing.toObject()
  await Expense.findByIdAndDelete(id)

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(userId),
    action: 'DELETE',
    entityType: 'Expense',
    entityId: new mongoose.Types.ObjectId(id),
    previousData,
    newData: null,
  })
}
