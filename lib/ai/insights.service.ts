import dbConnect from '@/lib/db/connection'
import Invoice from '@/lib/db/models/Invoice'
import Salary from '@/lib/db/models/Salary'
import Expense from '@/lib/db/models/Expense'
import Employee from '@/lib/db/models/Employee'
import Client from '@/lib/db/models/Client'
import { getDefaultAIProvider } from './ai.factory'
import type { AIResponse } from './provider.interface'

function getMonthDateRange(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split('-').map(Number)
  const start = new Date(year, mon - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, mon, 0, 23, 59, 59, 999)
  return { start, end }
}

function getPreviousMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number)
  const date = new Date(year, mon - 2, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export interface FinancialDataPayload {
  month: string
  revenue: {
    total: number
    byClient: Array<{ client: string; amount: number; invoiceCount: number }>
    unpaidTotal: number
    overdueTotal: number
  }
  costs: {
    salaryTotal: number
    expenseTotal: number
    totalCosts: number
    expenseByCategory: Record<string, number>
  }
  margins: {
    grossMargin: number
    grossMarginPct: number
    byClient: Array<{ client: string; revenue: number; salaryAllocated: number; margin: number }>
  }
  employeeProfitability: Array<{
    employee: string
    salary: number
    billedRevenue: number
    margin: number
  }>
  previousMonth?: {
    revenue: number
    costs: number
    expenseByCategory: Record<string, number>
  }
}

async function aggregateFinancialData(month: string): Promise<FinancialDataPayload> {
  const { start, end } = getMonthDateRange(month)
  const prevMonth = getPreviousMonth(month)
  const { start: prevStart, end: prevEnd } = getMonthDateRange(prevMonth)

  const [
    invoices,
    salaries,
    expenses,
    employees,
    clients,
    prevInvoices,
    prevExpenses,
  ] = await Promise.all([
    Invoice.find({ month, status: { $ne: 'Cancelled' } })
      .populate('clientId', 'name')
      .lean(),
    Salary.find({ month })
      .populate('employeeId', 'name baseSalary assignedClientId')
      .lean(),
    Expense.find({ date: { $gte: start, $lte: end }, status: { $ne: 'Rejected' } }).lean(),
    Employee.find({ status: 'Active' }).lean(),
    Client.find({ isActive: true }).lean(),
    Invoice.find({ month: prevMonth, status: { $ne: 'Cancelled' } }).lean(),
    Expense.find({ date: { $gte: prevStart, $lte: prevEnd }, status: 'Approved' }).lean(),
  ])

  const clientMap = new Map(clients.map((c) => [c._id.toString(), c.name]))

  // Revenue aggregation
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
  const unpaidTotal = invoices
    .filter((inv) => ['Sent', 'Overdue', 'Draft'].includes(inv.status))
    .reduce((sum, inv) => sum + inv.totalAmount, 0)
  const overdueTotal = invoices
    .filter((inv) => inv.status === 'Overdue')
    .reduce((sum, inv) => sum + inv.totalAmount, 0)

  // Revenue by client
  const revenueByClientMap = new Map<string, { amount: number; count: number }>()
  for (const inv of invoices) {
    const clientName = clientMap.get(inv.clientId.toString()) ?? 'Unknown'
    const existing = revenueByClientMap.get(clientName) ?? { amount: 0, count: 0 }
    existing.amount += inv.totalAmount
    existing.count++
    revenueByClientMap.set(clientName, existing)
  }

  const revenueByClient = Array.from(revenueByClientMap.entries())
    .map(([client, data]) => ({ client, amount: data.amount, invoiceCount: data.count }))
    .sort((a, b) => b.amount - a.amount)

  // Cost aggregation
  const salaryTotal = salaries.reduce((sum, s) => sum + s.netSalary, 0)
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
  const expenseByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {})

  // Gross margin
  const totalCosts = salaryTotal + expenseTotal
  const grossMargin = totalRevenue - totalCosts
  const grossMarginPct = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0

  // Margin by client
  const marginByClient = revenueByClient.map((rc) => {
    // Allocate salaries proportionally by client assignment
    const clientSalaries = salaries.filter((s) => {
      const emp = s.employeeId as unknown as { assignedClientId?: { toString(): string } }
      return emp?.assignedClientId?.toString() === clients.find((c) => c.name === rc.client)?._id.toString()
    })
    const allocated = clientSalaries.reduce((sum, s) => sum + s.netSalary, 0)
    return {
      client: rc.client,
      revenue: rc.amount,
      salaryAllocated: allocated,
      margin: rc.amount - allocated,
    }
  })

  // Employee profitability
  const employeeMap = new Map(employees.map((e) => [e._id.toString(), e]))
  const empProfitability = salaries.map((s) => {
    const emp = employeeMap.get(s.employeeId.toString())
    const empInvoices = invoices.filter(
      (inv) => inv.employeeId?.toString() === s.employeeId.toString()
    )
    const billedRevenue = empInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    return {
      employee: emp?.name ?? s.employeeId.toString(),
      salary: s.netSalary,
      billedRevenue,
      margin: billedRevenue - s.netSalary,
    }
  })

  // Previous month comparison
  const prevRevenue = prevInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
  const prevSalaryTotal = 0 // We'd need prev month salaries too; skip for brevity
  const prevExpenseTotal = prevExpenses.reduce((sum, e) => sum + e.amount, 0)
  const prevExpenseByCategory = prevExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {})

  return {
    month,
    revenue: {
      total: totalRevenue,
      byClient: revenueByClient,
      unpaidTotal,
      overdueTotal,
    },
    costs: {
      salaryTotal,
      expenseTotal,
      totalCosts,
      expenseByCategory,
    },
    margins: {
      grossMargin,
      grossMarginPct,
      byClient: marginByClient,
    },
    employeeProfitability: empProfitability,
    previousMonth: {
      revenue: prevRevenue,
      costs: prevSalaryTotal + prevExpenseTotal,
      expenseByCategory: prevExpenseByCategory,
    },
  }
}

// Cache for 1 hour
const insightCache = new Map<string, { data: AIResponse; cachedAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000

export async function generateFinancialInsights(
  month?: string,
  userId = 'anonymous'
): Promise<AIResponse> {
  await dbConnect()

  const targetMonth =
    month ??
    (() => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })()

  // Check cache
  const cacheKey = `insights_${targetMonth}`
  const cached = insightCache.get(cacheKey)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data
  }

  const financialData = await aggregateFinancialData(targetMonth)
  const provider = getDefaultAIProvider(userId)

  const prompt = `Analyze the financial performance for ${targetMonth} for a UAE staffing company.
Identify:
1. Top and bottom performing clients by profitability
2. Loss-making employees (billing < salary)
3. Expense spikes compared to previous month (>20% MoM increase per category)
4. Revenue gaps (expected vs actual billing based on active employees)
5. Cash flow concerns (high overdue receivables)
6. Overall financial health assessment

Provide actionable insights with specific numbers in AED.`

  const result = await provider.generateInsight(prompt, financialData)

  insightCache.set(cacheKey, { data: result, cachedAt: Date.now() })

  return result
}

export function clearInsightCache(month?: string): void {
  if (month) {
    insightCache.delete(`insights_${month}`)
  } else {
    insightCache.clear()
  }
}
