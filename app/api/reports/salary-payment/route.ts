import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { connectDB, Salary } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/utils'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _ctx: any, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await connectDB()
      const { searchParams } = new URL(req.url)
      const month = searchParams.get('month')
      if (!month) return NextResponse.json(apiError('month parameter is required (YYYY-MM)'), { status: 422 })
      const statusFilter = searchParams.get('status')

      const filter: Record<string, any> = { month }
      if (statusFilter) filter.paymentStatus = statusFilter

      const salaries = await Salary.find(filter)
        .populate('employeeId', 'name employeeCode position')
        .lean()

      const summary = { totalPaid: 0, totalPending: 0, totalFailed: 0, grandTotal: 0 }
      for (const s of salaries) {
        summary.grandTotal += s.netSalary
        if (s.paymentStatus === 'Paid') summary.totalPaid += s.netSalary
        else if (s.paymentStatus === 'Failed') summary.totalFailed += s.netSalary
        else summary.totalPending += s.netSalary
      }

      return NextResponse.json(apiSuccess({ salaries, summary }))
    } catch (err) {
      console.error('[GET /api/reports/salary-payment]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance', 'HR']
)
