import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { connectDB, Invoice, Salary, Expense } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/utils'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _ctx: any, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await connectDB()
      const { searchParams } = new URL(req.url)
      const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10)
      const monthFilter = searchParams.get('month') // optional YYYY-MM

      const months = monthFilter
        ? [monthFilter]
        : Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)

      const results = await Promise.all(
        months.map(async (month) => {
          const [revenueAgg, salaryAgg, expenseAgg] = await Promise.all([
            Invoice.aggregate([
              { $match: { month, status: { $in: ['Sent', 'Acknowledged', 'PartiallyPaid', 'Paid'] } } },
              { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]),
            Salary.aggregate([
              { $match: { month } },
              { $group: { _id: null, total: { $sum: '$netSalary' } } },
            ]),
            Expense.aggregate([
              {
                $match: {
                  $expr: {
                    $eq: [
                      { $substr: ['$date', 0, 7] },
                      month,
                    ],
                  },
                  status: { $in: ['Approved', 'Paid'] },
                },
              },
              { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
          ])

          const revenue = revenueAgg[0]?.total ?? 0
          const salaryCost = salaryAgg[0]?.total ?? 0
          const expenses = expenseAgg[0]?.total ?? 0
          const netProfit = revenue - salaryCost - expenses
          const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0

          return { month, revenue, salaryCost, expenses, netProfit, margin: parseFloat(margin.toFixed(2)) }
        })
      )

      const totals = results.reduce(
        (acc, r) => ({
          revenue: acc.revenue + r.revenue,
          salaryCost: acc.salaryCost + r.salaryCost,
          expenses: acc.expenses + r.expenses,
          netProfit: acc.netProfit + r.netProfit,
        }),
        { revenue: 0, salaryCost: 0, expenses: 0, netProfit: 0 }
      )
      const totalMargin = totals.revenue > 0 ? (totals.netProfit / totals.revenue) * 100 : 0

      return NextResponse.json(
        apiSuccess({ months: results, totals: { ...totals, margin: parseFloat(totalMargin.toFixed(2)) } })
      )
    } catch (err) {
      console.error('[GET /api/reports/pl]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance', 'Manager']
)
