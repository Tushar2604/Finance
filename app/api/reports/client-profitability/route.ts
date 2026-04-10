import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { connectDB, Invoice, Salary, Client, Employee } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/utils'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _ctx: any, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await connectDB()
      const { searchParams } = new URL(req.url)
      const month = searchParams.get('month')
      const year = searchParams.get('year') ?? String(new Date().getFullYear())
      const monthFilter = month ? { month } : { month: { $regex: `^${year}-` } }

      const [clients, invoiceAgg, employeesByClient] = await Promise.all([
        Client.find({}).select('name industry clientStatus').lean(),
        Invoice.aggregate([
          { $match: { ...monthFilter, status: { $in: ['Sent', 'Acknowledged', 'PartiallyPaid', 'Paid'] } } },
          { $group: { _id: '$clientId', revenue: { $sum: '$totalAmount' } } },
        ]),
        Employee.find({ assignedClientId: { $ne: null } }).select('assignedClientId baseSalary currentMonthlySalary').lean(),
      ])

      // Build revenue map
      const revenueMap = new Map<string, number>()
      for (const r of invoiceAgg) {
        if (r._id) revenueMap.set(String(r._id), r.revenue)
      }

      // Estimate cost per client from assigned employees
      const costMap = new Map<string, number>()
      for (const emp of employeesByClient) {
        const cid = String(emp.assignedClientId)
        const sal = (emp as any).currentMonthlySalary || emp.baseSalary || 0
        costMap.set(cid, (costMap.get(cid) ?? 0) + sal)
      }

      const rows = clients.map((client) => {
        const id = String(client._id)
        const revenue = revenueMap.get(id) ?? 0
        const cost = costMap.get(id) ?? 0
        const profit = revenue - cost
        const margin = revenue > 0 ? parseFloat(((profit / revenue) * 100).toFixed(2)) : 0
        return { clientId: id, name: client.name, industry: client.industry, clientStatus: (client as any).clientStatus, revenue, cost, profit, margin }
      })

      rows.sort((a, b) => b.revenue - a.revenue)

      return NextResponse.json(apiSuccess(rows))
    } catch (err) {
      console.error('[GET /api/reports/client-profitability]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance', 'Manager']
)
