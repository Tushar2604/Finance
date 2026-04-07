import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import type { JWTPayload } from '@/lib/auth/jwt'
import { getAllRunResults } from '@/lib/reconciliation/reconciliation.orchestrator'
import dbConnect from '@/lib/db/connection'
import ReconciliationRecord from '@/lib/db/models/ReconciliationRecord'

const handler = async (
  req: NextRequest,
  _context: { params: Record<string, string> },
  _user: JWTPayload
): Promise<NextResponse> => {
  try {
    await dbConnect()

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')

    // Return cached run results if available
    const allRuns = getAllRunResults()
    if (allRuns.length > 0) {
      const filtered = month
        ? allRuns.filter((r) => r.month === month)
        : allRuns

      if (filtered.length > 0) {
        const run = filtered[0]
        return NextResponse.json({
          success: true,
          data: {
            lastRun: run.runAt,
            month: run.month,
            salary: {
              matched: run.salary.matched.length,
              missing: run.salary.missing.length,
              extra: run.salary.extra.length,
              duplicates: run.salary.duplicates.length,
              amountMismatches: run.salary.amountMismatches.length,
            },
            invoice: {
              matched: run.invoice.matched.length,
              unpaid: run.invoice.unpaid.length,
              partial: run.invoice.partial.length,
              overpaid: run.invoice.overpaid.length,
              unknown: run.invoice.unknown.length,
            },
            expense: {
              matched: run.expense.matched.length,
              unrecorded: run.expense.unrecorded.length,
              missing: run.expense.missing.length,
              duplicates: run.expense.duplicates.length,
            },
            unmatched: run.unmatched,
          },
        })
      }
    }

    // Fallback: aggregate from DB records if cache is cold
    const filter: Record<string, unknown> = {}
    if (month) filter.month = month

    const [salaryStats, invoiceStats, expenseStats] = await Promise.all([
      ReconciliationRecord.aggregate([
        { $match: { type: 'Salary', ...filter } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      ReconciliationRecord.aggregate([
        { $match: { type: 'Invoice', ...filter } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      ReconciliationRecord.aggregate([
        { $match: { type: 'Expense', ...filter } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ])

    const toMap = (stats: Array<{ _id: string; count: number }>) =>
      Object.fromEntries(stats.map((s) => [s._id, s.count]))

    return NextResponse.json({
      success: true,
      data: {
        lastRun: null,
        month: month ?? 'all',
        salary: toMap(salaryStats),
        invoice: toMap(invoiceStats),
        expense: toMap(expenseStats),
      },
    })
  } catch (error) {
    console.error('[GET /api/reconciliation/summary]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reconciliation summary' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handler, ['Admin', 'Finance', 'Manager'])
