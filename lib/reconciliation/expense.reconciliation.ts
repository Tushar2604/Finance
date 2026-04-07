import dbConnect from '@/lib/db/connection'
import Expense, { IExpense } from '@/lib/db/models/Expense'
import BankTransaction, { IBankTransaction } from '@/lib/db/models/BankTransaction'
import ReconciliationRecord from '@/lib/db/models/ReconciliationRecord'

export interface ExpenseMatchedItem {
  expenseId: string
  bankTransactionId: string
  amount: number
  category: string
}

export interface ExpenseUnrecordedItem {
  bankTransactionId: string
  amount: number
  description: string
}

export interface ExpenseMissingItem {
  expenseId: string
  amount: number
  description: string
}

export interface ExpenseDuplicateItem {
  expenseIds: string[]
  amount: number
  date: Date
}

export interface ExpenseReconciliationResult {
  matched: ExpenseMatchedItem[]
  unrecorded: ExpenseUnrecordedItem[]
  missing: ExpenseMissingItem[]
  duplicates: ExpenseDuplicateItem[]
}

const EXPENSE_TOLERANCE_AED = 10
const DATE_TOLERANCE_DAYS = 3

function getMonthDateRange(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split('-').map(Number)
  const start = new Date(year, mon - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, mon, 0, 23, 59, 59, 999)
  return { start, end }
}

function withinDateTolerance(expenseDate: Date, txDate: Date): boolean {
  const diffMs = Math.abs(expenseDate.getTime() - txDate.getTime())
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= DATE_TOLERANCE_DAYS
}

function transactionMatchesExpense(
  tx: IBankTransaction,
  expense: IExpense
): boolean {
  const amountDiff = Math.abs(tx.debit - expense.amount)
  if (amountDiff > EXPENSE_TOLERANCE_AED) return false
  return withinDateTolerance(new Date(expense.date), new Date(tx.date))
}

function detectDuplicateExpenses(expenses: IExpense[]): ExpenseDuplicateItem[] {
  const duplicates: ExpenseDuplicateItem[] = []
  const processed = new Set<string>()

  for (let i = 0; i < expenses.length; i++) {
    if (processed.has(expenses[i]._id.toString())) continue

    const group = [expenses[i]]
    for (let j = i + 1; j < expenses.length; j++) {
      if (processed.has(expenses[j]._id.toString())) continue

      const amountMatch =
        Math.abs(expenses[i].amount - expenses[j].amount) <= EXPENSE_TOLERANCE_AED
      const dateMatch = withinDateTolerance(
        new Date(expenses[i].date),
        new Date(expenses[j].date)
      )

      if (amountMatch && dateMatch) {
        group.push(expenses[j])
      }
    }

    if (group.length > 1) {
      group.forEach((e) => processed.add(e._id.toString()))
      duplicates.push({
        expenseIds: group.map((e) => e._id.toString()),
        amount: expenses[i].amount,
        date: new Date(expenses[i].date),
      })
    }
  }

  return duplicates
}

export async function reconcileExpenses(month: string): Promise<ExpenseReconciliationResult> {
  await dbConnect()

  const { start, end } = getMonthDateRange(month)

  // Clear previous reconciliation records for this month + type
  await ReconciliationRecord.deleteMany({ type: 'Expense', month })

  // Fetch all expense records within the month
  const expenses = await Expense.find({
    date: { $gte: start, $lte: end },
    status: { $ne: 'Rejected' },
  }).lean()

  // Fetch all bank debit transactions within the month (with 3-day buffer)
  const bufferStart = new Date(start)
  bufferStart.setDate(bufferStart.getDate() - DATE_TOLERANCE_DAYS)
  const bufferEnd = new Date(end)
  bufferEnd.setDate(bufferEnd.getDate() + DATE_TOLERANCE_DAYS)

  const bankDebits = await BankTransaction.find({
    transactionType: 'Debit',
    date: { $gte: bufferStart, $lte: bufferEnd },
    // Only consider debits not already matched to salary
    $or: [{ matchStatus: 'Unmatched' }, { matchedEntityType: { $ne: 'Salary' } }],
  }).lean()

  const result: ExpenseReconciliationResult = {
    matched: [],
    unrecorded: [],
    missing: [],
    duplicates: [],
  }

  const usedBankTxIds = new Set<string>()
  const matchedExpenseIds = new Set<string>()

  // Detect duplicate expenses first
  result.duplicates = detectDuplicateExpenses(expenses as unknown as IExpense[])

  // Match each expense to a bank debit
  for (const expense of expenses) {
    const candidates = bankDebits.filter(
      (tx) =>
        !usedBankTxIds.has(tx._id.toString()) &&
        transactionMatchesExpense(tx as unknown as IBankTransaction, expense as unknown as IExpense)
    )

    if (candidates.length === 0) {
      // Expense exists but no bank debit found
      result.missing.push({
        expenseId: expense._id.toString(),
        amount: expense.amount,
        description: expense.description,
      })

      await ReconciliationRecord.create({
        type: 'Expense',
        entityId: expense._id,
        bankTransactionId: null,
        status: 'Missing',
        discrepancyAmount: expense.amount,
        notes: `No bank debit found for expense: ${expense.description} (${expense.amount} AED)`,
        month,
      })
    } else {
      // Sort by amount proximity, then date proximity
      candidates.sort((a, b) => {
        const aDiff = Math.abs(a.debit - expense.amount)
        const bDiff = Math.abs(b.debit - expense.amount)
        return aDiff - bDiff
      })

      const bestMatch = candidates[0]
      usedBankTxIds.add(bestMatch._id.toString())
      matchedExpenseIds.add(expense._id.toString())

      result.matched.push({
        expenseId: expense._id.toString(),
        bankTransactionId: bestMatch._id.toString(),
        amount: expense.amount,
        category: expense.category,
      })

      await ReconciliationRecord.create({
        type: 'Expense',
        entityId: expense._id,
        bankTransactionId: bestMatch._id,
        status: 'Matched',
        discrepancyAmount: Math.abs(bestMatch.debit - expense.amount),
        notes: `Expense matched: ${expense.description}`,
        month,
      })

      await BankTransaction.findByIdAndUpdate(bestMatch._id, {
        matchStatus: 'Matched',
        matchedEntityType: 'Expense',
        matchedEntityId: expense._id,
        matchConfidence: 90,
      })
    }
  }

  // Find bank debits within month range not matched to any expense
  const strictDebits = bankDebits.filter(
    (tx) => new Date(tx.date) >= start && new Date(tx.date) <= end
  )

  for (const tx of strictDebits) {
    if (!usedBankTxIds.has(tx._id.toString())) {
      result.unrecorded.push({
        bankTransactionId: tx._id.toString(),
        amount: tx.debit,
        description: tx.description,
      })
    }
  }

  return result
}
