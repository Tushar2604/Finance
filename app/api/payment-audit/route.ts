import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { runPaymentAudit } from '@/lib/services/payment-integrity.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _context: unknown, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(req.url)
      const monthsParam = searchParams.get('months')
      const months = monthsParam ? monthsParam.split(',').filter(Boolean) : undefined
      const result = await runPaymentAudit(months)
      return NextResponse.json(apiSuccess(result))
    } catch (err) {
      console.error('[GET /api/payment-audit]', err)
      return NextResponse.json(apiError('Failed to run audit'), { status: 500 })
    }
  },
  ['Admin', 'Finance']
)
