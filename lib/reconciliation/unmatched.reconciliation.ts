import dbConnect from '@/lib/db/connection'
import BankTransaction from '@/lib/db/models/BankTransaction'
import Alert from '@/lib/db/models/Alert'

export interface UnmatchedCreditSummary {
  count: number
  totalAmount: number
  transactions: Array<{
    id: string
    amount: number
    description: string
    date: Date
  }>
}

export interface UnmatchedDebitSummary {
  count: number
  totalAmount: number
  transactions: Array<{
    id: string
    amount: number
    description: string
    date: Date
  }>
}

export interface UnmatchedSummary {
  credits: UnmatchedCreditSummary
  debits: UnmatchedDebitSummary
  totalCount: number
  totalAmount: number
}

const HIGH_SEVERITY_THRESHOLD = 5000

function getMonthDateRange(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split('-').map(Number)
  const start = new Date(year, mon - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, mon, 0, 23, 59, 59, 999)
  return { start, end }
}

export async function flagUnmatchedTransactions(month: string): Promise<void> {
  await dbConnect()

  const { start, end } = getMonthDateRange(month)

  // Find all unmatched transactions for the month
  const unmatchedTransactions = await BankTransaction.find({
    matchStatus: 'Unmatched',
    date: { $gte: start, $lte: end },
  }).lean()

  if (unmatchedTransactions.length === 0) return

  // Remove existing unmatched alerts for the same period to keep idempotency
  const transactionIds = unmatchedTransactions.map((tx) => tx._id)
  await Alert.deleteMany({
    type: 'UnmatchedBank',
    entityType: 'BankTransaction',
    entityId: { $in: transactionIds },
  })

  // Create alerts for each unmatched transaction
  const alertDocs = unmatchedTransactions.map((tx) => {
    const amount = tx.transactionType === 'Credit' ? tx.credit : tx.debit
    const severity = amount > HIGH_SEVERITY_THRESHOLD ? 'High' : 'Medium'
    const direction = tx.transactionType === 'Credit' ? 'credit' : 'debit'

    return {
      type: 'UnmatchedBank' as const,
      severity: severity as 'High' | 'Medium',
      title: `Unmatched ${direction} transaction: ${amount.toFixed(2)} AED`,
      message: `Bank transaction on ${new Date(tx.date).toLocaleDateString('en-AE')} for ${amount.toFixed(2)} AED could not be matched to any ${direction === 'credit' ? 'invoice' : 'salary/expense'} record. Description: ${tx.description}`,
      entityType: 'BankTransaction',
      entityId: tx._id,
      isRead: false,
      isResolved: false,
    }
  })

  await Alert.insertMany(alertDocs)
}

export async function getUnmatchedSummary(month?: string): Promise<UnmatchedSummary> {
  await dbConnect()

  const filter: Record<string, unknown> = { matchStatus: 'Unmatched' }

  if (month) {
    const { start, end } = getMonthDateRange(month)
    filter.date = { $gte: start, $lte: end }
  }

  const unmatchedTransactions = await BankTransaction.find(filter)
    .sort({ date: -1 })
    .lean()

  const credits = unmatchedTransactions.filter((tx) => tx.transactionType === 'Credit')
  const debits = unmatchedTransactions.filter((tx) => tx.transactionType === 'Debit')

  const creditTotal = credits.reduce((sum, tx) => sum + tx.credit, 0)
  const debitTotal = debits.reduce((sum, tx) => sum + tx.debit, 0)

  return {
    credits: {
      count: credits.length,
      totalAmount: creditTotal,
      transactions: credits.map((tx) => ({
        id: tx._id.toString(),
        amount: tx.credit,
        description: tx.description,
        date: new Date(tx.date),
      })),
    },
    debits: {
      count: debits.length,
      totalAmount: debitTotal,
      transactions: debits.map((tx) => ({
        id: tx._id.toString(),
        amount: tx.debit,
        description: tx.description,
        date: new Date(tx.date),
      })),
    },
    totalCount: unmatchedTransactions.length,
    totalAmount: creditTotal + debitTotal,
  }
}
