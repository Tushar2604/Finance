import dbConnect from '@/lib/db/connection'
import Alert, { IAlert } from '@/lib/db/models/Alert'
import mongoose from 'mongoose'
import { paginate, buildPaginationMeta } from '@/lib/utils'

export interface AlertFilters {
  isResolved?: boolean
  isRead?: boolean
  severity?: 'Low' | 'Medium' | 'High' | 'Critical'
  type?: string
  page?: number
  limit?: number
}

export interface PaginatedAlerts {
  data: IAlert[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export async function getAlerts(filters: AlertFilters): Promise<PaginatedAlerts> {
  await dbConnect()

  const { isResolved, isRead, severity, type, page = 1, limit = 20 } = filters
  const { skip, limit: safeLimit } = paginate(page, limit)

  const query: mongoose.FilterQuery<IAlert> = {}

  if (typeof isResolved === 'boolean') query.isResolved = isResolved
  if (typeof isRead === 'boolean') query.isRead = isRead
  if (severity) query.severity = severity
  if (type) query.type = type

  const [data, total] = await Promise.all([
    Alert.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    Alert.countDocuments(query),
  ])

  return {
    data: data as unknown as IAlert[],
    pagination: buildPaginationMeta(total, page, safeLimit),
  }
}

export async function markAlertRead(id: string): Promise<IAlert> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid alert ID'), { statusCode: 400 })
  }

  const alert = await Alert.findByIdAndUpdate(id, { isRead: true }, { new: true })
  if (!alert) {
    throw Object.assign(new Error('Alert not found'), { statusCode: 404 })
  }

  return alert
}

export async function resolveAlert(id: string, userId: string): Promise<IAlert> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid alert ID'), { statusCode: 400 })
  }

  const alert = await Alert.findByIdAndUpdate(
    id,
    { 
      isResolved: true, 
      resolvedBy: new mongoose.Types.ObjectId(userId),
      resolvedAt: new Date()
    },
    { new: true }
  )
  
  if (!alert) {
    throw Object.assign(new Error('Alert not found'), { statusCode: 404 })
  }

  return alert
}
