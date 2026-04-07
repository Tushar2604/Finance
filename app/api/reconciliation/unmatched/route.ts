import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import type { JWTPayload } from '@/lib/auth/jwt'
import { getUnmatchedSummary } from '@/lib/reconciliation/unmatched.reconciliation'

const handler = async (
  req: NextRequest,
  _context: { params: Record<string, string> },
  _user: JWTPayload
): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') ?? undefined

    if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return NextResponse.json(
        { success: false, error: 'Month must be in YYYY-MM format' },
        { status: 400 }
      )
    }

    const summary = await getUnmatchedSummary(month)

    return NextResponse.json({
      success: true,
      data: summary,
      month: month ?? 'all',
    })
  } catch (error) {
    console.error('[GET /api/reconciliation/unmatched]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch unmatched transactions' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handler, ['Admin', 'Finance', 'Manager'])
