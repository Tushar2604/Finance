import dbConnect from '@/lib/db/connection'
import Invoice from '@/lib/db/models/Invoice'
import Salary from '@/lib/db/models/Salary'
import Expense from '@/lib/db/models/Expense'
import Employee from '@/lib/db/models/Employee'
import Client from '@/lib/db/models/Client'
import { getDefaultAIProvider } from './ai.factory'
import type { ChatMessage } from './provider.interface'

export type QueryType =
  | 'profit_summary'
  | 'loss_making_employees'
  | 'unpaid_invoices'
  | 'top_clients'
  | 'expense_summary'
  | 'general'

export interface FinanceQueryResult {
  answer: string
  data: unknown
  queryType: QueryType
  mongoOperation?: string
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getMonthDateRange(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split('-').map(Number)
  const start = new Date(year, mon - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, mon, 0, 23, 59, 59, 999)
  return { start, end }
}

async function classifyQueryIntent(query: string, userId: string): Promise<QueryType> {
  const lower = query.toLowerCase()

  // Rule-based classification first (avoid AI call for common patterns)
  if (/profit|margin|net income|p&l|earning/.test(lower)) return 'profit_summary'
  if (/loss.making|losing money|negative margin|unprofitable employee/.test(lower))
    return 'loss_making_employees'
  if (/unpaid|overdue|outstanding|receivable|aged/.test(lower)) return 'unpaid_invoices'
  if (/top client|best client|revenue.*client|client.*revenue/.test(lower)) return 'top_clients'
  if (/expense|cost|spend|spending/.test(lower)) return 'expense_summary'

  // Fallback to AI classification
  const provider = getDefaultAIProvider(userId)
  const classificationMessages: ChatMessage[] = [
    {
      role: 'system',
      content: `Classify the following finance query into exactly one of these types:
- profit_summary: questions about profit, margins, P&L
- loss_making_employees: questions about employees who cost more than they bill
- unpaid_invoices: questions about overdue or unpaid invoices/receivables
- top_clients: questions about client revenue rankings
- expense_summary: questions about costs and expenses
- general: anything else

Respond with ONLY the type string, nothing else.`,
    },
    { role: 'user', content: query },
  ]

  try {
    const result = await provider.chat(classificationMessages)
    const cleaned = result.trim().toLowerCase().replace(/[^a-z_]/g, '')
    const validTypes: QueryType[] = [
      'profit_summary',
      'loss_making_employees',
      'unpaid_invoices',
      'top_clients',
      'expense_summary',
      'general',
    ]
    return validTypes.includes(cleaned as QueryType) ? (cleaned as QueryType) : 'general'
  } catch {
    return 'general'
  }
}

async function runProfitSummary(month: string): Promise<{ data: unknown; mongoOp: string }> {
  const { start, end } = getMonthDateRange(month)
  const [invoices, salaries, expenses] = await Promise.all([
    Invoice.find({ month, status: { $ne: 'Cancelled' } }).lean(),
    Salary.find({ month }).lean(),
    Expense.find({ date: { $gte: start, $lte: end } }).lean(),
  ])

  const revenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
  const salaryTotal = salaries.reduce((sum, s) => sum + s.netSalary, 0)
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalCosts = salaryTotal + expenseTotal
  const profit = revenue - totalCosts
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0

  return {
    data: {
      month,
      revenue,
      salaryTotal,
      expenseTotal,
      totalCosts,
      profit,
      marginPct: Math.round(marginPct * 100) / 100,
    },
    mongoOp: `Invoice.find({month:'${month}'}) + Salary.find({month:'${month}'}) + Expense.find({date:{gte:start,lte:end}})`,
  }
}

async function runLossMakingEmployees(month: string): Promise<{ data: unknown; mongoOp: string }> {
  const salaries = await Salary.find({ month })
    .populate('employeeId', 'name position assignedClientId')
    .lean()

  const invoices = await Invoice.find({ month, status: { $ne: 'Cancelled' } }).lean()

  const employeeMargins = salaries.map((s) => {
    const emp = s.employeeId as unknown as { name?: string; position?: string }
    const billed = invoices
      .filter((inv) => inv.employeeId?.toString() === s.employeeId.toString())
      .reduce((sum, inv) => sum + inv.totalAmount, 0)
    const margin = billed - s.netSalary
    return {
      employee: emp?.name ?? s.employeeId.toString(),
      position: emp?.position ?? '',
      salary: s.netSalary,
      billedRevenue: billed,
      margin,
      isLossMaking: margin < 0,
    }
  })

  const lossMakers = employeeMargins.filter((e) => e.isLossMaking)
  lossMakers.sort((a, b) => a.margin - b.margin)

  return {
    data: { month, lossMakingEmployees: lossMakers, total: lossMakers.length },
    mongoOp: `Salary.find({month:'${month}'}).populate('employeeId') + Invoice.find({month:'${month}'})`,
  }
}

async function runUnpaidInvoices(days?: number): Promise<{ data: unknown; mongoOp: string }> {
  const cutoffDate = new Date()
  if (days) {
    cutoffDate.setDate(cutoffDate.getDate() - days)
  }

  const filter: Record<string, unknown> = {
    status: { $in: ['Sent', 'Overdue', 'PartiallyPaid'] },
  }
  if (days) {
    filter.dueDate = { $lte: cutoffDate }
  }

  const unpaidInvoices = await Invoice.find(filter)
    .populate('clientId', 'name creditTerms')
    .sort({ dueDate: 1 })
    .lean()

  const now = new Date()
  const invoiceData = unpaidInvoices.map((inv) => {
    const client = inv.clientId as unknown as { name?: string }
    const dueDate = new Date(inv.dueDate)
    const daysOverdue = Math.max(
      0,
      Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    )
    return {
      invoiceNumber: inv.invoiceNumber,
      client: client?.name ?? 'Unknown',
      amount: inv.totalAmount,
      paidAmount: inv.paidAmount,
      outstanding: inv.totalAmount - inv.paidAmount,
      dueDate,
      daysOverdue,
      status: inv.status,
    }
  })

  const totalOutstanding = invoiceData.reduce((sum, inv) => sum + inv.outstanding, 0)

  return {
    data: {
      invoices: invoiceData,
      totalOutstanding,
      count: invoiceData.length,
      overdueCount: invoiceData.filter((i) => i.daysOverdue > 0).length,
    },
    mongoOp: `Invoice.find({status:{$in:['Sent','Overdue','PartiallyPaid']}${days ? `,dueDate:{$lte:${days}daysAgo}` : ''}})`,
  }
}

async function runTopClientsByRevenue(
  month?: string,
  limit = 10
): Promise<{ data: unknown; mongoOp: string }> {
  const filter: Record<string, unknown> = { status: { $ne: 'Cancelled' } }
  if (month) filter.month = month

  const pipeline = [
    { $match: filter },
    {
      $group: {
        _id: '$clientId',
        totalRevenue: { $sum: '$totalAmount' },
        invoiceCount: { $sum: 1 },
        paidRevenue: {
          $sum: {
            $cond: [{ $in: ['$status', ['Paid', 'PartiallyPaid']] }, '$paidAmount', 0],
          },
        },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'clients',
        localField: '_id',
        foreignField: '_id',
        as: 'client',
      },
    },
    { $unwind: { path: '$client', preserveNullAndEmpty: true } },
    {
      $project: {
        _id: 0,
        client: { $ifNull: ['$client.name', 'Unknown'] },
        totalRevenue: 1,
        invoiceCount: 1,
        paidRevenue: 1,
        collectionRate: {
          $cond: [
            { $gt: ['$totalRevenue', 0] },
            { $multiply: [{ $divide: ['$paidRevenue', '$totalRevenue'] }, 100] },
            0,
          ],
        },
      },
    },
  ]

  const results = await Invoice.aggregate(pipeline)

  return {
    data: { topClients: results, month: month ?? 'all-time' },
    mongoOp: `Invoice.aggregate([{$match:...},{$group:...},{$sort:{totalRevenue:-1}},{$limit:${limit}}])`,
  }
}

async function runExpenseSummary(month: string): Promise<{ data: unknown; mongoOp: string }> {
  const { start, end } = getMonthDateRange(month)

  const pipeline = [
    {
      $match: {
        date: { $gte: start, $lte: end },
        status: { $ne: 'Rejected' },
      },
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
      },
    },
    { $sort: { total: -1 } },
  ]

  const byCategory = await Expense.aggregate(pipeline)
  const grandTotal = byCategory.reduce((sum: number, cat: { total: number }) => sum + cat.total, 0)

  return {
    data: {
      month,
      byCategory: byCategory.map((c: { _id: string; total: number; count: number; avgAmount: number }) => ({
        category: c._id,
        total: c.total,
        count: c.count,
        avgAmount: Math.round(c.avgAmount * 100) / 100,
        pct: grandTotal > 0 ? Math.round((c.total / grandTotal) * 10000) / 100 : 0,
      })),
      grandTotal,
    },
    mongoOp: `Expense.aggregate([{$match:{date:{gte:${start}}}},{$group:{_id:'$category',total:{$sum:'$amount'}}}])`,
  }
}

export async function handleFinanceQuery(
  query: string,
  userId: string
): Promise<FinanceQueryResult> {
  await dbConnect()

  const currentMonth = getCurrentMonth()
  const queryType = await classifyQueryIntent(query, userId)

  let dbData: unknown
  let mongoOp: string

  // Extract month from query if present
  const monthMatch = query.match(/\b(\d{4})[-/](\d{2})\b/)
  const queryMonth = monthMatch
    ? `${monthMatch[1]}-${monthMatch[2]}`
    : currentMonth

  // Extract days from query if present (e.g., "60 days")
  const daysMatch = query.match(/(\d+)\s*days?/)
  const queryDays = daysMatch ? parseInt(daysMatch[1], 10) : undefined

  switch (queryType) {
    case 'profit_summary': {
      const result = await runProfitSummary(queryMonth)
      dbData = result.data
      mongoOp = result.mongoOp
      break
    }
    case 'loss_making_employees': {
      const result = await runLossMakingEmployees(queryMonth)
      dbData = result.data
      mongoOp = result.mongoOp
      break
    }
    case 'unpaid_invoices': {
      const result = await runUnpaidInvoices(queryDays)
      dbData = result.data
      mongoOp = result.mongoOp
      break
    }
    case 'top_clients': {
      const result = await runTopClientsByRevenue(queryMonth)
      dbData = result.data
      mongoOp = result.mongoOp
      break
    }
    case 'expense_summary': {
      const result = await runExpenseSummary(queryMonth)
      dbData = result.data
      mongoOp = result.mongoOp
      break
    }
    default: {
      dbData = { message: 'General query — limited data context available' }
      mongoOp = 'none'
      break
    }
  }

  // Generate human-readable explanation with AI
  const provider = getDefaultAIProvider(userId)
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are BIM Finance Assistant — a financial AI for a UAE staffing company.
Answer finance questions clearly and concisely in plain English.
All amounts are in AED (UAE Dirham).
Use the provided data to give a specific, accurate answer.
Format numbers with commas (e.g., 125,000 AED).
Be direct and actionable. Maximum 3 paragraphs.`,
    },
    {
      role: 'user',
      content: `Question: ${query}\n\nData from database:\n${JSON.stringify(dbData, null, 2)}`,
    },
  ]

  const answer = await provider.chat(messages)

  return {
    answer,
    data: dbData,
    queryType,
    mongoOperation: mongoOp,
  }
}
