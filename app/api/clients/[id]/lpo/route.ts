import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import LPO from '@/lib/db/models/LPO'
import mongoose from 'mongoose'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (_req: NextRequest, context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { id } = context.params
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json(apiError('Invalid client ID'), { status: 400 })
      }
      await dbConnect()
      const lpos = await LPO.find({ clientId: new mongoose.Types.ObjectId(id) })
        .sort({ createdAt: -1 })
        .lean()
      return NextResponse.json(apiSuccess(lpos))
    } catch (err) {
      console.error('[GET /api/clients/[id]/lpo]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance']
)

export const POST = withAuth(
  async (req: NextRequest, context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { id } = context.params
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json(apiError('Invalid client ID'), { status: 400 })
      }
      await dbConnect()
      const body = await req.json()

      // Auto-calc VAT & total
      const exclVAT = Number(body.totalPOAmountExclVAT ?? 0)
      const vatPct = Number(body.vatApplicablePct ?? 5)
      const vatAmount = Math.round(exclVAT * vatPct) / 100
      const inclVAT = exclVAT + vatAmount

      const lpo = await LPO.create({
        ...body,
        clientId: new mongoose.Types.ObjectId(id),
        vatAmount,
        totalPOAmountInclVAT: inclVAT,
      })
      return NextResponse.json(apiSuccess(lpo, 'LPO created'), { status: 201 })
    } catch (err: unknown) {
      const error = err as Error & { code?: number }
      if (error.code === 11000) {
        return NextResponse.json(apiError('LPO number already exists'), { status: 409 })
      }
      console.error('[POST /api/clients/[id]/lpo]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance']
)
