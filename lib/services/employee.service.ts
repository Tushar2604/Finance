import dbConnect from '@/lib/db/connection'
import Employee, { IEmployee } from '@/lib/db/models/Employee'
import Invoice from '@/lib/db/models/Invoice'
import Salary from '@/lib/db/models/Salary'
import Timesheet from '@/lib/db/models/Timesheet'
import Project from '@/lib/db/models/Project'
import mongoose from 'mongoose'
import { paginate, buildPaginationMeta, generateEmployeeCode } from '@/lib/utils'
import { differenceInMonths, parseISO } from 'date-fns'

export interface EmployeeFilters {
  status?: string
  clientId?: string
  search?: string
  page?: number
  limit?: number
}

export interface PaginatedEmployees {
  data: IEmployee[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface Employee360 {
  employee: IEmployee
  tenure: number // months
  totalRevenueGenerated: number
  totalSalaryPaid: number
  profitContribution: number
  utilizationRate: number // percentage
  projectHistory: Array<{
    _id: string
    name: string
    status: string
    startDate: Date
    endDate: Date | null
  }>
  recentTimesheets: Array<{
    month: string
    hours: number
    status: string
  }>
}

export async function getEmployees(filters: EmployeeFilters): Promise<PaginatedEmployees> {
  await dbConnect()

  const { status, clientId, search, page = 1, limit = 20 } = filters
  const { skip, limit: safeLimit } = paginate(page, limit)

  const query: mongoose.FilterQuery<IEmployee> = {}

  if (status) query.status = status
  if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
    query.assignedClientId = new mongoose.Types.ObjectId(clientId)
  }
  if (search && search.trim()) {
    query.$or = [
      { name: { $regex: search.trim(), $options: 'i' } },
      { email: { $regex: search.trim(), $options: 'i' } },
      { employeeCode: { $regex: search.trim(), $options: 'i' } },
      { position: { $regex: search.trim(), $options: 'i' } },
    ]
  }

  const [data, total] = await Promise.all([
    Employee.find(query)
      .populate('assignedClientId', 'name')
      .populate('assignedProjectId', 'name status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Employee.countDocuments(query),
  ])

  return {
    data: data as unknown as IEmployee[],
    pagination: buildPaginationMeta(total, page, safeLimit),
  }
}

export async function getEmployeeById(id: string): Promise<IEmployee> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid employee ID'), { statusCode: 400 })
  }

  const employee = await Employee.findById(id)
    .populate('assignedClientId', 'name companyDetails')
    .populate('assignedProjectId', 'name status startDate endDate')
    .lean()

  if (!employee) {
    throw Object.assign(new Error('Employee not found'), { statusCode: 404 })
  }

  return employee as unknown as IEmployee
}

export async function createEmployee(data: Partial<IEmployee>): Promise<IEmployee> {
  await dbConnect()

  // Auto-generate employee code if not provided
  if (!data.employeeCode) {
    const count = await Employee.countDocuments()
    data.employeeCode = generateEmployeeCode(count + 1)
  }

  // Ensure unique code
  let code = data.employeeCode
  let attempts = 0
  while (await Employee.exists({ employeeCode: code })) {
    const count = await Employee.countDocuments()
    code = generateEmployeeCode(count + attempts + 2)
    attempts++
    if (attempts > 10) throw new Error('Could not generate unique employee code')
  }
  data.employeeCode = code

  const employee = await Employee.create(data)
  return employee
}

export async function updateEmployee(id: string, data: Partial<IEmployee>): Promise<IEmployee> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid employee ID'), { statusCode: 400 })
  }

  const updated = await Employee.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  })

  if (!updated) {
    throw Object.assign(new Error('Employee not found'), { statusCode: 404 })
  }

  return updated
}

export async function getEmployee360(employeeId: string): Promise<Employee360> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    throw Object.assign(new Error('Invalid employee ID'), { statusCode: 400 })
  }

  const employee = await Employee.findById(employeeId)
    .populate('assignedClientId', 'name')
    .populate('assignedProjectId', 'name status')
    .lean()

  if (!employee) {
    throw Object.assign(new Error('Employee not found'), { statusCode: 404 })
  }

  const empObjId = new mongoose.Types.ObjectId(employeeId)

  // Tenure in months
  const joiningDate = new Date(employee.joiningDate)
  const tenure = Math.max(0, differenceInMonths(new Date(), joiningDate))

  const [revenueResult, salaryResult, timesheets, projectHistory] = await Promise.all([
    Invoice.aggregate([
      {
        $match: {
          employeeId: empObjId,
          status: { $in: ['Sent', 'PartiallyPaid', 'Paid', 'Overdue'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Salary.aggregate([
      { $match: { employeeId: empObjId, paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$netSalary' } } },
    ]),
    Timesheet.find({ employeeId: empObjId })
      .sort({ month: -1 })
      .limit(12)
      .select('month hours status')
      .lean(),
    Project.find({
      $or: [
        { _id: (employee as IEmployee & { assignedProjectId?: mongoose.Types.ObjectId }).assignedProjectId },
      ],
    })
      .select('name status startDate endDate')
      .lean(),
  ])

  // Utilization: billed months (Approved timesheets) / total months employed
  const billedTimesheets = await Timesheet.countDocuments({
    employeeId: empObjId,
    status: 'Approved',
  })
  const utilizationRate = tenure > 0 ? parseFloat(((billedTimesheets / tenure) * 100).toFixed(2)) : 0

  const totalRevenueGenerated = revenueResult[0]?.total ?? 0
  const totalSalaryPaid = salaryResult[0]?.total ?? 0
  const profitContribution = totalRevenueGenerated - totalSalaryPaid

  return {
    employee: employee as unknown as IEmployee,
    tenure,
    totalRevenueGenerated,
    totalSalaryPaid,
    profitContribution,
    utilizationRate,
    projectHistory: projectHistory as Array<{
      _id: string
      name: string
      status: string
      startDate: Date
      endDate: Date | null
    }>,
    recentTimesheets: timesheets.map((t) => ({
      month: t.month,
      hours: t.hours,
      status: t.status,
    })),
  }
}
