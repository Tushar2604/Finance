import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import BankTransaction from '@/lib/db/models/BankTransaction'
import mongoose from 'mongoose'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (_req: NextRequest, context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { id } = context.params
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json(apiError('Invalid transaction ID'), { status: 400 })
      }

      await dbConnect()
      const tx = await BankTransaction.findById(id).lean()

      if (!tx) {
        return NextResponse.json(apiError('Transaction not found'), { status: 404 })
      }

      return NextResponse.json(apiSuccess(tx))
    } catch (err) {
      console.error('[GET /api/bank/[id]]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance']
)
