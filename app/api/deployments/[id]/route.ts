import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { connectDB, Deployment } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/utils'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (_req: NextRequest, ctx: any, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await connectDB()
      const { id } = await ctx.params
      const deployment = await Deployment.findById(id)
        .populate('employeeId', 'name employeeCode position nationality phone')
        .populate('clientId', 'name companyDetails')
        .populate('projectId', 'name status')
        .lean()
      if (!deployment) return NextResponse.json(apiError('Deployment not found'), { status: 404 })
      return NextResponse.json(apiSuccess(deployment))
    } catch (err) {
      console.error('[GET /api/deployments/[id]]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  }
)

export const PUT = withAuth(
  async (req: NextRequest, ctx: any, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await connectDB()
      const { id } = await ctx.params
      const body = await req.json()
      const deployment = await Deployment.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true })
        .populate('employeeId', 'name employeeCode position')
        .populate('clientId', 'name')
        .populate('projectId', 'name')
        .lean()
      if (!deployment) return NextResponse.json(apiError('Deployment not found'), { status: 404 })
      return NextResponse.json(apiSuccess(deployment, 'Deployment updated'))
    } catch (err) {
      console.error('[PUT /api/deployments/[id]]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'HR', 'Finance']
)

export const DELETE = withAuth(
  async (_req: NextRequest, ctx: any, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await connectDB()
      const { id } = await ctx.params
      const deployment = await Deployment.findByIdAndDelete(id)
      if (!deployment) return NextResponse.json(apiError('Deployment not found'), { status: 404 })
      return NextResponse.json(apiSuccess(null, 'Deployment deleted'))
    } catch (err) {
      console.error('[DELETE /api/deployments/[id]]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin']
)
