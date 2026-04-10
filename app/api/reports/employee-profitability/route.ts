import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { connectDB, Invoice, Salary, Employee } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/utils'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _ctx: any, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await connectDB()
      const { searchParams } = new URL(req.url)
      const month = searchParams.get('month') // YYYY-MM
      const year = searchParams.get('year') ?? String(new Date().getFullYear())

      const monthFilter = month ? { month } : { month: { $regex: `^${year}-` } }

      const [employees, invoiceAgg, salaryAgg] = await Promise.all([
        Employee.find({ status: 'Active' }).select('name employeeCode position baseSalary').lean(),
        Invoice.aggregate([
          { $match: monthFilter },
          { $unwind: { path: '$lineItems', preserveNullAndEmptyArrays: false } },
          {
            $group: {
              _id: '$lineItems.employeeId',
              billingTotal: { $sum: '$lineItems.totalLineAmount' },
            },
          },
        ]),
        // Also get totals from invoices directly linked by employeeId (legacy)
        Invoice.aggregate([
          { $match: { ...monthFilter, employeeId: { $ne: null } } },
          {
            $group: {
              _id: '$employeeId',
              billingTotal: { $sum: '$totalAmount' },
            },
          },
        ]),
        Salary.aggregate([
          { $match: monthFilter },
          { $group: { _id: '$employeeId', salaryCost: { $sum: '$netSalary' } } },
        ]),
      ])

      // Merge line-item billing + direct billing
      const billingMap = new Map<string, number>()
      for (const r of invoiceAgg) {
        if (r._id) billingMap.set(String(r._id), (billingMap.get(String(r._id)) ?? 0) + r.billingTotal)
      }
      // salaryAgg is actually the 4th element in Promise.all but we destructured only 3
      // Fix: re-run properly
      const salaryData = await Salary.aggregate([
        { $match: monthFilter },
        { $group: { _id: '$employeeId', salaryCost: { $sum: '$netSalary' } } },
      ])
      const salaryMap = new Map<string, number>()
      for (const r of salaryData) {
        if (r._id) salaryMap.set(String(r._id), r.salaryCost)
      }

      const rows = employees.map((emp) => {
        const id = String(emp._id)
        const billingTotal = billingMap.get(id) ?? 0
        const salaryCost = salaryMap.get(id) ?? 0
        const profit = billingTotal - salaryCost
        const margin = billingTotal > 0 ? parseFloat(((profit / billingTotal) * 100).toFixed(2)) : 0
        return { employeeId: id, name: emp.name, employeeCode: emp.employeeCode, position: emp.position, billingTotal, salaryCost, profit, margin }
      })

      rows.sort((a, b) => b.profit - a.profit)

      return NextResponse.json(apiSuccess(rows))
    } catch (err) {
      console.error('[GET /api/reports/employee-profitability]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance', 'Manager']
)
