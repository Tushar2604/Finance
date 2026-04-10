import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { getBankTransactions } from '@/lib/services/bank.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(req.url)
      const matchStatus = searchParams.get('matchStatus') as 'Matched' | 'Unmatched' | 'Partial' | undefined
      const transactionType = searchParams.get('transactionType') as 'Debit' | 'Credit' | undefined
      const uploadBatchId = searchParams.get('uploadBatchId') ?? undefined
      const description = searchParams.get('description') ?? undefined
      const dateFrom = searchParams.get('dateFrom') ?? undefined
      const dateTo = searchParams.get('dateTo') ?? undefined
      const page = parseInt(searchParams.get('page') ?? '1', 10)
      const limit = parseInt(searchParams.get('limit') ?? '50', 10)

      const result = await getBankTransactions({ matchStatus, transactionType, uploadBatchId, description, dateFrom, dateTo, page, limit })
      return NextResponse.json(apiSuccess(result))
    } catch (err: any) {
      console.error('[GET /api/bank]', err)
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  },
  ['Admin', 'Finance']
)
