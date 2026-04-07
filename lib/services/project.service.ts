import dbConnect from '@/lib/db/connection'
import Project, { IProject } from '@/lib/db/models/Project'
import Invoice from '@/lib/db/models/Invoice'
import Salary from '@/lib/db/models/Salary'
import Expense from '@/lib/db/models/Expense'
import Employee from '@/lib/db/models/Employee'
import mongoose from 'mongoose'
import { paginate, buildPaginationMeta } from '@/lib/utils'

export interface ProjectFilters {
  clientId?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}

export interface ProjectMargin {
  projectId: string
  projectName: string
  budget: number
  totalRevenue: number
  totalSalaryCost: number
  totalExpenses: number
  grossMargin: number
  marginPercent: number
}

export interface PaginatedProjects {
  data: IProject[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

type ProjectMutationInput = Omit<Partial<IProject>, 'clientId'> & {
  clientId?: mongoose.Types.ObjectId | string
}

function normalizeProjectMutationInput(data: ProjectMutationInput): Partial<IProject> {
  const normalized: ProjectMutationInput = { ...data }
  if (data.clientId !== undefined) {
    if (data.clientId instanceof mongoose.Types.ObjectId) {
      normalized.clientId = data.clientId
    } else if (mongoose.Types.ObjectId.isValid(data.clientId)) {
      normalized.clientId = new mongoose.Types.ObjectId(data.clientId)
    } else {
      throw Object.assign(new Error('Invalid client ID'), { statusCode: 400 })
    }
  }
  return normalized as Partial<IProject>
}

export async function getProjects(filters: ProjectFilters): Promise<PaginatedProjects> {
  await dbConnect()

  const { clientId, status, search, page = 1, limit = 20 } = filters
  const { skip, limit: safeLimit } = paginate(page, limit)

  const query: mongoose.FilterQuery<IProject> = {}

  if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
    query.clientId = new mongoose.Types.ObjectId(clientId)
  }
  if (status) {
    query.status = status
  }
  if (search && search.trim()) {
    query.$or = [
      { name: { $regex: search.trim(), $options: 'i' } },
      { description: { $regex: search.trim(), $options: 'i' } },
    ]
  }

  const [data, total] = await Promise.all([
    Project.find(query)
      .populate('clientId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Project.countDocuments(query),
  ])

  return {
    data: data as unknown as IProject[],
    pagination: buildPaginationMeta(total, page, safeLimit),
  }
}

export async function getProjectById(id: string): Promise<IProject> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid project ID'), { statusCode: 400 })
  }

  const project = await Project.findById(id).populate('clientId', 'name companyDetails').lean()
  if (!project) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 })
  }

  return project as unknown as IProject
}

export async function createProject(data: ProjectMutationInput): Promise<IProject> {
  await dbConnect()
  const project = await Project.create(normalizeProjectMutationInput(data))
  return project
}

export async function updateProject(id: string, data: ProjectMutationInput): Promise<IProject> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid project ID'), { statusCode: 400 })
  }

  const updated = await Project.findByIdAndUpdate(id, normalizeProjectMutationInput(data), {
    new: true,
    runValidators: true,
  })

  if (!updated) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 })
  }

  return updated
}

export async function deleteProject(id: string): Promise<void> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid project ID'), { statusCode: 400 })
  }

  const deleted = await Project.findByIdAndDelete(id)
  if (!deleted) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 })
  }
}

export async function getProjectMargin(projectId: string): Promise<ProjectMargin> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw Object.assign(new Error('Invalid project ID'), { statusCode: 400 })
  }

  const project = await Project.findById(projectId)
  if (!project) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 })
  }

  const projectObjId = new mongoose.Types.ObjectId(projectId)

  // Find employees assigned to this project
  const employees = await Employee.find({ assignedProjectId: projectObjId }).select('_id')
  const employeeIds = employees.map((e) => e._id)

  const [revenueResult, salaryResult, expenseResult] = await Promise.all([
    Invoice.aggregate([
      {
        $match: {
          projectId: projectObjId,
          status: { $in: ['Sent', 'PartiallyPaid', 'Paid', 'Overdue'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Salary.aggregate([
      {
        $match: {
          employeeId: { $in: employeeIds },
          paymentStatus: 'Paid',
        },
      },
      { $group: { _id: null, total: { $sum: '$netSalary' } } },
    ]),
    Expense.aggregate([
      {
        $match: {
          projectId: projectObjId,
          status: 'Approved',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ])

  const totalRevenue = revenueResult[0]?.total ?? 0
  const totalSalaryCost = salaryResult[0]?.total ?? 0
  const totalExpenses = expenseResult[0]?.total ?? 0
  const grossMargin = totalRevenue - totalSalaryCost - totalExpenses
  const marginPercent = totalRevenue > 0 ? parseFloat(((grossMargin / totalRevenue) * 100).toFixed(2)) : 0

  return {
    projectId,
    projectName: project.name,
    budget: project.budget,
    totalRevenue,
    totalSalaryCost,
    totalExpenses,
    grossMargin,
    marginPercent,
  }
}
