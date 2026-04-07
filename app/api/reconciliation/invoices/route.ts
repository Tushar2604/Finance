import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import type { JWTPayload } from '@/lib/auth/jwt'
import dbConnect from '@/lib/db/connection'
import ReconciliationRecord from '@/lib/db/models/ReconciliationRecord'
import { getLastRunResult } from '@/lib/reconciliation/reconciliation.orchestrator'

const handler = async (
  req: NextRequest,
  _context: { params: Record<string, string> },
  _user: JWTPayload
): Promise<NextResponse> => {
  try {
    await dbConnect()

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')

    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return NextResponse.json(
        { success: false, error: 'Valid month in YYYY-MM format is required' },
        { status: 400 }
      )
    }

    // Return cached result if available
    const cached = getLastRunResult(month)
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached.invoice,
        month,
        runAt: cached.runAt,
      })
    }

    // Fallback: fetch from DB
    const records = await ReconciliationRecord.find({
      type: 'Invoice',
      month,
    })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      data: records,
      month,
      runAt: null,
    })
  } catch (error) {
    console.error('[GET /api/reconciliation/invoices]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoice reconciliation results' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handler, ['Admin', 'Finance', 'Manager'])
