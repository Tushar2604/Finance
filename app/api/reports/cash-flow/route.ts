import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { connectDB, Invoice, Salary, Expense } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/utils'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _ctx: any, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await connectDB()
      const year = parseInt(new URL(req.url).searchParams.get('year') ?? String(new Date().getFullYear()), 10)

      const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)

      let runningBalance = 0
      const rows = await Promise.all(
        months.map(async (month) => {
          const startOfMonth = new Date(`${month}-01`)
          const endOfMonth = new Date(startOfMonth)
          endOfMonth.setMonth(endOfMonth.getMonth() + 1)

          const [inflowAgg, salaryAgg, expenseAgg] = await Promise.all([
            Invoice.aggregate([
              { $match: { paidDate: { $gte: startOfMonth, $lt: endOfMonth } } },
              { $group: { _id: null, total: { $sum: '$paidAmount' } } },
            ]),
            Salary.aggregate([
              { $match: { paymentDate: { $gte: startOfMonth, $lt: endOfMonth }, paymentStatus: 'Paid' } },
              { $group: { _id: null, total: { $sum: '$netSalary' } } },
            ]),
            Expense.aggregate([
              { $match: { date: { $gte: startOfMonth, $lt: endOfMonth }, status: { $in: ['Approved', 'Paid'] } } },
              { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
          ])

          const inflow = inflowAgg[0]?.total ?? 0
          const salaryOutflow = salaryAgg[0]?.total ?? 0
          const expenseOutflow = expenseAgg[0]?.total ?? 0
          const netCashFlow = inflow - salaryOutflow - expenseOutflow
          runningBalance += netCashFlow

          return { month, inflow, salaryOutflow, expenseOutflow, netCashFlow, runningBalance }
        })
      )

      return NextResponse.json(apiSuccess(rows))
    } catch (err) {
      console.error('[GET /api/reports/cash-flow]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance', 'Manager']
)
