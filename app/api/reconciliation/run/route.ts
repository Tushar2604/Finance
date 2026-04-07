import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import type { JWTPayload } from '@/lib/auth/jwt'
import { runFullReconciliation } from '@/lib/reconciliation/reconciliation.orchestrator'

const handler = async (
  req: NextRequest,
  _context: { params: Record<string, string> },
  user: JWTPayload
): Promise<NextResponse> => {
  try {
    const body = await req.json()
    const { month } = body

    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return NextResponse.json(
        { success: false, error: 'Valid month in YYYY-MM format is required' },
        { status: 400 }
      )
    }

    const result = await runFullReconciliation(month, user.sub)

    return NextResponse.json({
      success: true,
      data: {
        month: result.month,
        runAt: result.runAt,
        triggeredBy: result.triggeredBy,
        summary: {
          salary: {
            matched: result.salary.matched.length,
            missing: result.salary.missing.length,
            extra: result.salary.extra.length,
            duplicates: result.salary.duplicates.length,
            amountMismatches: result.salary.amountMismatches.length,
          },
          invoice: {
            matched: result.invoice.matched.length,
            unpaid: result.invoice.unpaid.length,
            partial: result.invoice.partial.length,
            overpaid: result.invoice.overpaid.length,
            unknown: result.invoice.unknown.length,
          },
          expense: {
            matched: result.expense.matched.length,
            unrecorded: result.expense.unrecorded.length,
            missing: result.expense.missing.length,
            duplicates: result.expense.duplicates.length,
          },
          unmatched: {
            totalCount: result.unmatched.totalCount,
            totalAmount: result.unmatched.totalAmount,
          },
        },
      },
    })
  } catch (error) {
    console.error('[POST /api/reconciliation/run]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to run reconciliation' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handler, ['Admin', 'Finance'])
