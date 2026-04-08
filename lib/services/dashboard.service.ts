import dbConnect from '@/lib/db/connection'
import Invoice from '@/lib/db/models/Invoice'
import Employee from '@/lib/db/models/Employee'
import Expense from '@/lib/db/models/Expense'
import Salary from '@/lib/db/models/Salary'

export interface MonthlySnapshot {
  month: string   // YYYY-MM
  label: string   // e.g. "Nov"
  revenue: number
  salary: number
  expenses: number
  profit: number
  profitPct: number
}

export interface DashboardMetrics {
  // Totals (all-time)
  totalRevenue: number
  totalCosts: number
  netProfit: number
  profitMargin: number
  // Current month
  currentMonth: string
  currentRevenue: number
  currentSalary: number
  currentExpenses: number
  currentProfit: number
  currentProfitPct: number
  // Outstanding
  outstandingAmount: number
  outstandingCount: number
  overdueAmount: number
  overdueCount: number
  // Headcount
  activeEmployees: number
  totalEmployees: number
  // Trend
  monthlySnapshots: MonthlySnapshot[]
}

function getMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short' })
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getLast6Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  await dbConnect()

  const currentMonth = getCurrentMonth()
  const last6 = getLast6Months()

  // --- Revenue aggregation by month ---
  const revenueByMonth = await Invoice.aggregate([
    { $match: { status: { $ne: 'Cancelled' }, month: { $in: last6 } } },
    { $group: { _id: '$month', revenue: { $sum: '$totalAmount' } } },
  ])
  const revenueMap: Record<string, number> = {}
  revenueByMonth.forEach((r: { _id: string; revenue: number }) => { revenueMap[r._id] = r.revenue })

  // --- Salary aggregation by month ---
  const salaryByMonth = await Salary.aggregate([
    { $match: { month: { $in: last6 } } },
    { $group: { _id: '$month', salary: { $sum: '$netSalary' } } },
  ])
  const salaryMap: Record<string, number> = {}
  salaryByMonth.forEach((r: { _id: string; salary: number }) => { salaryMap[r._id] = r.salary })

  // --- Expense aggregation by month (using date field) ---
  const expenseByMonth = await Expense.aggregate([
    { $match: { status: { $ne: 'Rejected' } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m', date: '$date' },
        },
        expenses: { $sum: '$amount' },
      },
    },
    { $match: { _id: { $in: last6 } } },
  ])
  const expenseMap: Record<string, number> = {}
  expenseByMonth.forEach((r: { _id: string; expenses: number }) => { expenseMap[r._id] = r.expenses })

  // --- Build monthly snapshots ---
  const monthlySnapshots: MonthlySnapshot[] = last6.map((m) => {
    const revenue = revenueMap[m] ?? 0
    const salary = salaryMap[m] ?? 0
    const expenses = expenseMap[m] ?? 0
    const profit = revenue - salary - expenses
    const profitPct = revenue > 0 ? (profit / revenue) * 100 : 0
    return { month: m, label: getMonthLabel(m), revenue, salary, expenses, profit, profitPct }
  })

  // --- All-time totals ---
  const allRevAgg = await Invoice.aggregate([
    { $match: { status: { $in: ['Paid', 'PartiallyPaid'] } } },
    { $group: { _id: null, total: { $sum: '$paidAmount' } } },
  ])
  const totalRevenue = allRevAgg[0]?.total ?? 0

  const allSalAgg = await Salary.aggregate([
    { $match: { paymentStatus: 'Paid' } },
    { $group: { _id: null, total: { $sum: '$netSalary' } } },
  ])
  const allExpAgg = await Expense.aggregate([
    { $match: { status: 'Approved' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const totalCosts = (allSalAgg[0]?.total ?? 0) + (allExpAgg[0]?.total ?? 0)
  const netProfit = totalRevenue - totalCosts
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  // --- Outstanding / Overdue ---
  const outstandingAgg = await Invoice.aggregate([
    { $match: { status: { $in: ['Sent', 'Overdue', 'PartiallyPaid'] } } },
    {
      $group: {
        _id: '$status',
        amount: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } },
        count: { $sum: 1 },
      },
    },
  ])
  let outstandingAmount = 0
  let outstandingCount = 0
  let overdueAmount = 0
  let overdueCount = 0
  outstandingAgg.forEach((r: { _id: string; amount: number; count: number }) => {
    outstandingAmount += r.amount
    outstandingCount += r.count
    if (r._id === 'Overdue') {
      overdueAmount += r.amount
      overdueCount += r.count
    }
  })

  // --- Headcount ---
  const [activeEmployees, totalEmployees] = await Promise.all([
    Employee.countDocuments({ status: 'Active' }),
    Employee.countDocuments({}),
  ])

  // --- Current month snapshot ---
  const cur = monthlySnapshots.find(s => s.month === currentMonth) ?? {
    month: currentMonth, label: getMonthLabel(currentMonth),
    revenue: 0, salary: 0, expenses: 0, profit: 0, profitPct: 0,
  }

  return {
    totalRevenue,
    totalCosts,
    netProfit,
    profitMargin,
    currentMonth,
    currentRevenue: cur.revenue,
    currentSalary: cur.salary,
    currentExpenses: cur.expenses,
    currentProfit: cur.profit,
    currentProfitPct: cur.profitPct,
    outstandingAmount,
    outstandingCount,
    overdueAmount,
    overdueCount,
    activeEmployees,
    totalEmployees,
    monthlySnapshots,
  }
}
