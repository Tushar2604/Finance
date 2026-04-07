import dbConnect from '@/lib/db/connection'
import BankTransaction, { IBankTransaction } from '@/lib/db/models/BankTransaction'
import Invoice, { IInvoice } from '@/lib/db/models/Invoice'
import Salary, { ISalary } from '@/lib/db/models/Salary'
import Expense, { IExpense } from '@/lib/db/models/Expense'
import Employee from '@/lib/db/models/Employee'
import Client from '@/lib/db/models/Client'
import { getDefaultAIProvider } from './ai.factory'
import type { MatchResult } from './provider.interface'

export interface FuzzyMatchResult {
  transactionId: string
  description: string
  amount: number
  transactionType: 'Credit' | 'Debit'
  matchedEntityType: 'Invoice' | 'Salary' | 'Expense' | null
  matchedEntityId: string | null
  confidence: number
  reasoning: string
  status: 'auto-matched' | 'needs-review' | 'unknown'
}

interface EntityCandidate {
  id: string
  type: 'Invoice' | 'Salary' | 'Expense'
  label: string
  amount: number
  date: Date
}

const AUTO_MATCH_THRESHOLD = 85
const REVIEW_THRESHOLD = 50
const AMOUNT_WINDOW_PCT = 0.1 // 10%

function buildCandidates(
  tx: IBankTransaction,
  invoices: IInvoice[],
  salaries: ISalary[],
  expenses: IExpense[],
  employeeMap: Map<string, string>,
  clientMap: Map<string, string>
): EntityCandidate[] {
  const candidates: EntityCandidate[] = []
  const txAmount = tx.transactionType === 'Credit' ? tx.credit : tx.debit
  const minAmount = txAmount * (1 - AMOUNT_WINDOW_PCT)
  const maxAmount = txAmount * (1 + AMOUNT_WINDOW_PCT)

  if (tx.transactionType === 'Credit') {
    // For credits, look at invoices
    for (const inv of invoices) {
      if (inv.totalAmount >= minAmount && inv.totalAmount <= maxAmount) {
        const clientName = clientMap.get(inv.clientId.toString()) ?? 'Unknown'
        candidates.push({
          id: inv._id.toString(),
          type: 'Invoice',
          label: `Invoice ${inv.invoiceNumber} — ${clientName} — ${inv.totalAmount.toFixed(2)} AED`,
          amount: inv.totalAmount,
          date: new Date(inv.invoiceDate),
        })
      }
    }
  } else {
    // For debits, look at salaries and expenses
    for (const sal of salaries) {
      if (sal.netSalary >= minAmount && sal.netSalary <= maxAmount) {
        const empName = employeeMap.get(sal.employeeId.toString()) ?? 'Unknown'
        candidates.push({
          id: sal._id.toString(),
          type: 'Salary',
          label: `Salary ${sal.month} — ${empName} — ${sal.netSalary.toFixed(2)} AED`,
          amount: sal.netSalary,
          date: sal.paymentDate ? new Date(sal.paymentDate) : new Date(),
        })
      }
    }

    for (const exp of expenses) {
      if (exp.amount >= minAmount && exp.amount <= maxAmount) {
        candidates.push({
          id: exp._id.toString(),
          type: 'Expense',
          label: `Expense ${exp.category} — ${exp.description.substring(0, 40)} — ${exp.amount.toFixed(2)} AED`,
          amount: exp.amount,
          date: new Date(exp.date),
        })
      }
    }
  }

  return candidates
}

export async function fuzzyMatchTransactions(
  transactions: IBankTransaction[],
  entities: { invoices: IInvoice[]; salaries: ISalary[]; expenses: IExpense[] },
  userId = 'anonymous'
): Promise<FuzzyMatchResult[]> {
  if (transactions.length === 0) return []

  const provider = getDefaultAIProvider(userId)
  const results: FuzzyMatchResult[] = []

  // Build lookup maps
  const employeeIds = entities.salaries.map((s) => s.employeeId)
  const clientIds = entities.invoices.map((inv) => inv.clientId)

  const [employees, clients] = await Promise.all([
    Employee.find({ _id: { $in: employeeIds } }).lean(),
    Client.find({ _id: { $in: clientIds } }).lean(),
  ])

  const employeeMap = new Map(employees.map((e) => [e._id.toString(), e.name]))
  const clientMap = new Map(clients.map((c) => [c._id.toString(), c.name]))

  for (const tx of transactions) {
    const candidates = buildCandidates(
      tx,
      entities.invoices,
      entities.salaries,
      entities.expenses,
      employeeMap,
      clientMap
    )

    if (candidates.length === 0) {
      results.push({
        transactionId: tx._id.toString(),
        description: tx.description,
        amount: tx.transactionType === 'Credit' ? tx.credit : tx.debit,
        transactionType: tx.transactionType,
        matchedEntityType: null,
        matchedEntityId: null,
        confidence: 0,
        reasoning: 'No candidates within 10% amount range',
        status: 'unknown',
      })
      continue
    }

    // Use AI fuzzy matching
    const query = `${tx.description} ${tx.reference} amount:${tx.transactionType === 'Credit' ? tx.credit : tx.debit}`
    const candidateLabels = candidates.map((c) => c.label)

    let matchResults: MatchResult[]
    try {
      matchResults = await provider.fuzzyMatch(query, candidateLabels)
    } catch {
      matchResults = candidates.map((c) => ({
        candidate: c.label,
        confidence: 0,
        reasoning: 'AI matching failed',
      }))
    }

    // Merge AI scores with candidates
    const scoredCandidates = candidates.map((candidate, idx) => {
      const aiResult = matchResults.find(
        (r) => r.candidate === candidate.label || matchResults[idx]
      )
      return {
        ...candidate,
        confidence: aiResult?.confidence ?? 0,
        reasoning: aiResult?.reasoning ?? 'No reasoning provided',
      }
    })

    // Find best match
    scoredCandidates.sort((a, b) => b.confidence - a.confidence)
    const best = scoredCandidates[0]

    let status: 'auto-matched' | 'needs-review' | 'unknown'
    if (best.confidence >= AUTO_MATCH_THRESHOLD) {
      status = 'auto-matched'
      // Update the bank transaction in DB
      await BankTransaction.findByIdAndUpdate(tx._id, {
        matchStatus: 'Matched',
        matchedEntityType: best.type,
        matchedEntityId: best.id,
        matchConfidence: best.confidence,
      })
    } else if (best.confidence >= REVIEW_THRESHOLD) {
      status = 'needs-review'
      await BankTransaction.findByIdAndUpdate(tx._id, {
        matchConfidence: best.confidence,
      })
    } else {
      status = 'unknown'
    }

    results.push({
      transactionId: tx._id.toString(),
      description: tx.description,
      amount: tx.transactionType === 'Credit' ? tx.credit : tx.debit,
      transactionType: tx.transactionType,
      matchedEntityType: status !== 'unknown' ? best.type : null,
      matchedEntityId: status !== 'unknown' ? best.id : null,
      confidence: best.confidence,
      reasoning: best.reasoning,
      status,
    })
  }

  return results
}

export async function runFuzzyMatchForMonth(
  month: string,
  userId = 'anonymous'
): Promise<FuzzyMatchResult[]> {
  await dbConnect()

  const [year, mon] = month.split('-').map(Number)
  const start = new Date(year, mon - 1, 1)
  const end = new Date(year, mon, 0, 23, 59, 59, 999)

  // Get all unmatched transactions for the month
  const unmatchedTxs = await BankTransaction.find({
    matchStatus: 'Unmatched',
    date: { $gte: start, $lte: end },
  }).lean()

  if (unmatchedTxs.length === 0) return []

  // Get all potential matching entities
  const [invoices, salaries, expenses] = await Promise.all([
    Invoice.find({ month, status: { $ne: 'Cancelled' } }).lean(),
    Salary.find({ month }).lean(),
    Expense.find({ date: { $gte: start, $lte: end } }).lean(),
  ])

  return fuzzyMatchTransactions(
    unmatchedTxs as IBankTransaction[],
    {
      invoices: invoices as IInvoice[],
      salaries: salaries as ISalary[],
      expenses: expenses as IExpense[],
    },
    userId
  )
}
