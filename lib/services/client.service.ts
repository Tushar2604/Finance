import dbConnect from '@/lib/db/connection'
import Client, { IClient } from '@/lib/db/models/Client'
import Invoice from '@/lib/db/models/Invoice'
import Employee from '@/lib/db/models/Employee'
import Project from '@/lib/db/models/Project'
import AuditLog from '@/lib/db/models/AuditLog'
import mongoose from 'mongoose'
import { paginate, buildPaginationMeta } from '@/lib/utils'

export interface ClientFilters {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}

export interface ClientSummary {
  clientId: string
  clientName: string
  totalRevenue: number
  totalEmployees: number
  activeProjects: number
  unpaidInvoices: number
  unpaidAmount: number
}

export interface PaginatedClients {
  data: IClient[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export async function getClients(filters: ClientFilters): Promise<PaginatedClients> {
  await dbConnect()

  const { search, isActive, page = 1, limit = 20 } = filters
  const { skip, limit: safeLimit } = paginate(page, limit)

  const query: mongoose.FilterQuery<IClient> = {}

  if (typeof isActive === 'boolean') {
    query.isActive = isActive
  }

  if (search && search.trim()) {
    query.$or = [
      { name: { $regex: search.trim(), $options: 'i' } },
      { 'companyDetails.email': { $regex: search.trim(), $options: 'i' } },
      { 'companyDetails.phone': { $regex: search.trim(), $options: 'i' } },
    ]
  }

  const [data, total] = await Promise.all([
    Client.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    Client.countDocuments(query),
  ])

  return {
    data: data as unknown as IClient[],
    pagination: buildPaginationMeta(total, page, safeLimit),
  }
}

export async function getClientById(id: string): Promise<IClient> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid client ID'), { statusCode: 400 })
  }

  const client = await Client.findById(id).lean()
  if (!client) {
    throw Object.assign(new Error('Client not found'), { statusCode: 404 })
  }

  return client as unknown as IClient
}

export async function createClient(
  data: Partial<IClient>,
  userId: string
): Promise<IClient> {
  await dbConnect()

  const client = await Client.create(data)

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(userId),
    action: 'CREATE',
    entityType: 'Client',
    entityId: client._id,
    previousData: null,
    newData: client.toObject(),
  })

  return client
}

export async function updateClient(
  id: string,
  data: Partial<IClient>,
  userId: string
): Promise<IClient> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid client ID'), { statusCode: 400 })
  }

  const existing = await Client.findById(id)
  if (!existing) {
    throw Object.assign(new Error('Client not found'), { statusCode: 404 })
  }

  const previousData = existing.toObject()
  const updated = await Client.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  })

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(userId),
    action: 'UPDATE',
    entityType: 'Client',
    entityId: new mongoose.Types.ObjectId(id),
    previousData,
    newData: updated?.toObject(),
  })

  return updated as IClient
}

export async function deleteClient(id: string, userId: string): Promise<void> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid client ID'), { statusCode: 400 })
  }

  const existing = await Client.findById(id)
  if (!existing) {
    throw Object.assign(new Error('Client not found'), { statusCode: 404 })
  }

  const previousData = existing.toObject()
  await Client.findByIdAndUpdate(id, { isActive: false })

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(userId),
    action: 'SOFT_DELETE',
    entityType: 'Client',
    entityId: new mongoose.Types.ObjectId(id),
    previousData,
    newData: { isActive: false },
  })
}

export async function getClientSummary(clientId: string): Promise<ClientSummary> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    throw Object.assign(new Error('Invalid client ID'), { statusCode: 400 })
  }

  const client = await Client.findById(clientId)
  if (!client) {
    throw Object.assign(new Error('Client not found'), { statusCode: 404 })
  }

  const clientObjId = new mongoose.Types.ObjectId(clientId)

  const [revenueResult, totalEmployees, activeProjects, unpaidInvoicesResult] = await Promise.all([
    Invoice.aggregate([
      { $match: { clientId: clientObjId, status: { $in: ['Sent', 'PartiallyPaid', 'Paid', 'Overdue'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Employee.countDocuments({ assignedClientId: clientObjId, status: 'Active' }),
    Project.countDocuments({ clientId: clientObjId, status: 'Active' }),
    Invoice.aggregate([
      {
        $match: {
          clientId: clientObjId,
          status: { $in: ['Sent', 'PartiallyPaid', 'Overdue'] },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalUnpaid: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } },
        },
      },
    ]),
  ])

  return {
    clientId,
    clientName: client.name,
    totalRevenue: revenueResult[0]?.total ?? 0,
    totalEmployees,
    activeProjects,
    unpaidInvoices: unpaidInvoicesResult[0]?.count ?? 0,
    unpaidAmount: unpaidInvoicesResult[0]?.totalUnpaid ?? 0,
  }
}
