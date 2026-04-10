import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { connectDB, Deployment, Employee, Client, Project } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/utils'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _ctx: any, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await connectDB()
      const { searchParams } = new URL(req.url)
      const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
      const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10))
      const skip = (page - 1) * limit

      const filter: Record<string, any> = {}
      if (searchParams.get('clientId')) filter.clientId = searchParams.get('clientId')
      if (searchParams.get('employeeId')) filter.employeeId = searchParams.get('employeeId')
      if (searchParams.get('projectId')) filter.projectId = searchParams.get('projectId')
      if (searchParams.get('status')) filter.status = searchParams.get('status')

      const [data, total] = await Promise.all([
        Deployment.find(filter)
          .populate('employeeId', 'name employeeCode position')
          .populate('clientId', 'name')
          .populate('projectId', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Deployment.countDocuments(filter),
      ])

      return NextResponse.json(
        apiSuccess({
          data,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1,
          },
        })
      )
    } catch (err) {
      console.error('[GET /api/deployments]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  }
)

export const POST = withAuth(
  async (req: NextRequest, _ctx: any, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await connectDB()
      const body = await req.json()
      const { employeeId, clientId, projectId, lpoId, position, billingRate, billingType, salary, startDate, endDate, status, mobilizationStatus, visaStatus, notes } = body

      if (!employeeId || !clientId || !startDate) {
        return NextResponse.json(apiError('employeeId, clientId, and startDate are required'), { status: 422 })
      }

      const deployment = await Deployment.create({
        employeeId,
        clientId,
        projectId: projectId ?? null,
        lpoId: lpoId ?? null,
        position: position ?? '',
        billingRate: billingRate ?? 0,
        billingType: billingType ?? 'Monthly',
        salary: salary ?? 0,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: status ?? 'Active',
        mobilizationStatus: mobilizationStatus ?? '',
        visaStatus: visaStatus ?? '',
        notes: notes ?? '',
      })

      const populated = await Deployment.findById(deployment._id)
        .populate('employeeId', 'name employeeCode position')
        .populate('clientId', 'name')
        .populate('projectId', 'name')
        .lean()

      return NextResponse.json(apiSuccess(populated, 'Deployment created'), { status: 201 })
    } catch (err: any) {
      console.error('[POST /api/deployments]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'HR', 'Finance']
)
