import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { connectDB, Invoice } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/utils'
import type { JWTPayload } from '@/lib/auth/jwt'

function getBucket(days: number): string {
  if (days <= 0) return 'current'
  if (days <= 30) return 'bucket_0_30'
  if (days <= 60) return 'bucket_31_60'
  if (days <= 90) return 'bucket_61_90'
  return 'bucket_90_plus'
}

export const GET = withAuth(
  async (_req: NextRequest, _ctx: any, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await connectDB()
      const today = new Date()

      const invoices = await Invoice.find({
        status: { $in: ['Sent', 'Acknowledged', 'PartiallyPaid', 'Overdue'] },
      })
        .populate('clientId', 'name industry')
        .lean()

      const summary = { totalOutstanding: 0, current: 0, bucket_0_30: 0, bucket_31_60: 0, bucket_61_90: 0, bucket_90_plus: 0 }
      const clientMap = new Map<string, Record<string, number>>()
      const enriched = []

      for (const inv of invoices) {
        const outstanding = inv.totalAmount - (inv.paidAmount ?? 0)
        const daysPastDue = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        const bucket = getBucket(daysPastDue)

        summary.totalOutstanding += outstanding
        summary[bucket as keyof typeof summary] = (summary[bucket as keyof typeof summary] as number) + outstanding

        const cid = String(inv.clientId?._id ?? inv.clientId)
        if (!clientMap.has(cid)) clientMap.set(cid, { current: 0, bucket_0_30: 0, bucket_31_60: 0, bucket_61_90: 0, bucket_90_plus: 0, total: 0 })
        const cm = clientMap.get(cid)!
        cm[bucket] = (cm[bucket] ?? 0) + outstanding
        cm.total += outstanding

        enriched.push({ ...inv, outstanding, daysPastDue, bucket })
      }

      const clientBreakdown = Array.from(clientMap.entries()).map(([clientId, buckets]) => {
        const inv0 = invoices.find((i) => String(i.clientId?._id ?? i.clientId) === clientId)
        return { clientId, clientName: (inv0?.clientId as any)?.name ?? clientId, ...buckets }
      })

      return NextResponse.json(apiSuccess({ summary, clientBreakdown, invoices: enriched }))
    } catch (err) {
      console.error('[GET /api/reports/receivables-aging]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance', 'Manager']
)
