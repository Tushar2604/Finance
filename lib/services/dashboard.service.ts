import dbConnect from '@/lib/db/connection'
import Invoice from '@/lib/db/models/Invoice'
import Employee from '@/lib/db/models/Employee'
import Expense from '@/lib/db/models/Expense'
import Salary from '@/lib/db/models/Salary'

export interface DashboardMetrics {
  totalRevenue: number
  totalCosts: number
  netProfit: number
  profitMargin: number
  activeEmployees: number
  outstandingInvoices: number
  monthlyRevenue: number[] // Last 6 months array
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  await dbConnect()

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  // 1. Total Revenue (Paid + PartiallyPaid invoices)
  const revenueAgg = await Invoice.aggregate([
    { $match: { status: { $in: ['Paid', 'PartiallyPaid'] } } },
    { $group: { _id: null, total: { $sum: '$paidAmount' } } }
  ])
  const totalRevenue = revenueAgg[0]?.total || 0

  // 2. Total Costs (Paid Salaries + Approved Expenses)
  const salaryAgg = await Salary.aggregate([
    { $match: { paymentStatus: 'Paid' } },
    { $group: { _id: null, total: { $sum: '$netSalary' } } }
  ])
  const expenseAgg = await Expense.aggregate([
    { $match: { status: 'Approved' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ])
  const totalCosts = (salaryAgg[0]?.total || 0) + (expenseAgg[0]?.total || 0)

  // 3. Outstanding Invoices count
  const outstandingInvoices = await Invoice.countDocuments({ status: { $in: ['Sent', 'Overdue'] } })
  
  // 4. Employees count
  const activeEmployees = await Employee.countDocuments({ status: 'Active' })

  const netProfit = totalRevenue - totalCosts
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  // 5. Monthly Revenue trend (Last 6 Months)
  // Simple grouping by month (Assumes invoices have issuedDate)
  const trendAgg = await Invoice.aggregate([
    { 
      $match: { 
        status: { $in: ['Paid', 'PartiallyPaid', 'Sent', 'Overdue'] },
        issuedDate: { $gte: sixMonthsAgo }
      } 
    },
    {
      $group: {
        _id: { $month: "$issuedDate" },
        total: { $sum: "$totalAmount" }
      }
    },
    { $sort: { _id: 1 } }
  ])

  // Map to simple array of numbers, this is mocked mapping
  const monthlyRevenue = [0, 0, 0, 0, 0, 0]
  trendAgg.forEach((agg, idx) => {
     if(idx < 6) monthlyRevenue[idx] = agg.total
  })

  return {
    totalRevenue,
    totalCosts,
    netProfit,
    profitMargin,
    activeEmployees,
    outstandingInvoices,
    monthlyRevenue
  }
}
