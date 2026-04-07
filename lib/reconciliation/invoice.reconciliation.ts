import dbConnect from '@/lib/db/connection'
import Invoice, { IInvoice } from '@/lib/db/models/Invoice'
import BankTransaction, { IBankTransaction } from '@/lib/db/models/BankTransaction'
import Client, { IClient } from '@/lib/db/models/Client'
import ReconciliationRecord from '@/lib/db/models/ReconciliationRecord'

export interface InvoiceMatchedItem {
  invoiceId: string
  bankTransactionId: string
  client: string
  amount: number
}

export interface InvoiceUnpaidItem {
  invoiceId: string
  client: string
  amount: number
  dueDate: Date
  daysOverdue: number
}

export interface InvoicePartialItem {
  invoiceId: string
  client: string
  invoiceAmount: number
  receivedAmount: number
  shortfall: number
}

export interface InvoiceOverpaidItem {
  invoiceId: string
  bankTransactionId: string
  excess: number
}

export interface InvoiceUnknownItem {
  bankTransactionId: string
  amount: number
  description: string
}

export interface InvoiceReconciliationResult {
  matched: InvoiceMatchedItem[]
  unpaid: InvoiceUnpaidItem[]
  partial: InvoicePartialItem[]
  overpaid: InvoiceOverpaidItem[]
  unknown: InvoiceUnknownItem[]
}

const INVOICE_TOLERANCE_AED = 50

function getMonthDateRange(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split('-').map(Number)
  const start = new Date(year, mon - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, mon, 0, 23, 59, 59, 999)
  return { start, end }
}

function creditMatchesInvoice(
  tx: IBankTransaction,
  invoice: IInvoice,
  clientName: string
): boolean {
  const diff = Math.abs(tx.credit - invoice.totalAmount)
  if (diff > INVOICE_TOLERANCE_AED * 2) return false // Allow wider range for partial check

  const desc = tx.description.toLowerCase()
  const ref = tx.reference.toLowerCase()
  const nameParts = clientName.toLowerCase().split(/\s+/)
  const nameMatch = nameParts.some(
    (part) => part.length > 2 && (desc.includes(part) || ref.includes(part))
  )

  const invNumMatch =
    desc.includes(invoice.invoiceNumber.toLowerCase()) ||
    ref.includes(invoice.invoiceNumber.toLowerCase())

  return nameMatch || invNumMatch
}

export async function reconcileInvoices(month: string): Promise<InvoiceReconciliationResult> {
  await dbConnect()

  const { start, end } = getMonthDateRange(month)
  // Extend window by 30 days for late payments
  const extendedEnd = new Date(end)
  extendedEnd.setDate(extendedEnd.getDate() + 30)

  // Clear previous reconciliation records for this month + type
  await ReconciliationRecord.deleteMany({ type: 'Invoice', month })

  // Fetch all non-cancelled invoices for the month
  const invoices = await Invoice.find({
    month,
    status: { $ne: 'Cancelled' },
  }).lean()

  const clientIds = invoices.map((inv) => inv.clientId)
  const clients = await Client.find({ _id: { $in: clientIds } }).lean()
  const clientMap = new Map<string, IClient>(
    clients.map((c) => [c._id.toString(), c as IClient])
  )

  // Fetch all bank credit transactions in the month period + 30 days
  const bankCredits = await BankTransaction.find({
    transactionType: 'Credit',
    date: { $gte: start, $lte: extendedEnd },
  }).lean()

  const result: InvoiceReconciliationResult = {
    matched: [],
    unpaid: [],
    partial: [],
    overpaid: [],
    unknown: [],
  }

  const usedBankTxIds = new Set<string>()
  const now = new Date()

  for (const invoice of invoices) {
    const client = clientMap.get(invoice.clientId.toString())
    const clientName = client?.name ?? ''

    // Find credits that could match this invoice (amount within tolerance + client name match)
    const candidates = bankCredits.filter(
      (tx) =>
        !usedBankTxIds.has(tx._id.toString()) &&
        creditMatchesInvoice(tx as IBankTransaction, invoice as IInvoice, clientName)
    )

    if (candidates.length === 0) {
      // Check if overdue
      const dueDate = new Date(invoice.dueDate)
      if (dueDate < now) {
        const daysOverdue = Math.floor(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        result.unpaid.push({
          invoiceId: invoice._id.toString(),
          client: clientName,
          amount: invoice.totalAmount,
          dueDate,
          daysOverdue,
        })

        await ReconciliationRecord.create({
          type: 'Invoice',
          entityId: invoice._id,
          bankTransactionId: null,
          status: 'Missing',
          discrepancyAmount: invoice.totalAmount,
          notes: `Invoice ${invoice.invoiceNumber} unpaid, ${daysOverdue} days overdue`,
          month,
        })

        // Update invoice status to Overdue
        await Invoice.findByIdAndUpdate(invoice._id, { status: 'Overdue' })
      }
      continue
    }

    // Pick best candidate: sort by amount proximity
    candidates.sort(
      (a, b) =>
        Math.abs(a.credit - invoice.totalAmount) - Math.abs(b.credit - invoice.totalAmount)
    )
    const bestMatch = candidates[0]
    usedBankTxIds.add(bestMatch._id.toString())

    const diff = bestMatch.credit - invoice.totalAmount

    if (Math.abs(diff) <= INVOICE_TOLERANCE_AED) {
      // Exact match (within tolerance)
      result.matched.push({
        invoiceId: invoice._id.toString(),
        bankTransactionId: bestMatch._id.toString(),
        client: clientName,
        amount: invoice.totalAmount,
      })

      await ReconciliationRecord.create({
        type: 'Invoice',
        entityId: invoice._id,
        bankTransactionId: bestMatch._id,
        status: 'Matched',
        discrepancyAmount: 0,
        notes: `Invoice ${invoice.invoiceNumber} matched with bank credit`,
        month,
      })

      await Invoice.findByIdAndUpdate(invoice._id, {
        status: 'Paid',
        paidAmount: bestMatch.credit,
        paidDate: bestMatch.date,
      })
      await BankTransaction.findByIdAndUpdate(bestMatch._id, {
        matchStatus: 'Matched',
        matchedEntityType: 'Invoice',
        matchedEntityId: invoice._id,
        matchConfidence: 100,
      })
    } else if (diff < -INVOICE_TOLERANCE_AED) {
      // Partial payment
      const received = bestMatch.credit
      const shortfall = invoice.totalAmount - received
      result.partial.push({
        invoiceId: invoice._id.toString(),
        client: clientName,
        invoiceAmount: invoice.totalAmount,
        receivedAmount: received,
        shortfall,
      })

      await ReconciliationRecord.create({
        type: 'Invoice',
        entityId: invoice._id,
        bankTransactionId: bestMatch._id,
        status: 'Mismatched',
        discrepancyAmount: shortfall,
        notes: `Partial payment for ${invoice.invoiceNumber}: received ${received} AED, expected ${invoice.totalAmount} AED`,
        month,
      })

      await Invoice.findByIdAndUpdate(invoice._id, {
        status: 'PartiallyPaid',
        paidAmount: received,
      })
      await BankTransaction.findByIdAndUpdate(bestMatch._id, {
        matchStatus: 'Partial',
        matchedEntityType: 'Invoice',
        matchedEntityId: invoice._id,
        matchConfidence: 75,
      })
    } else {
      // Overpayment
      result.overpaid.push({
        invoiceId: invoice._id.toString(),
        bankTransactionId: bestMatch._id.toString(),
        excess: diff,
      })

      await ReconciliationRecord.create({
        type: 'Invoice',
        entityId: invoice._id,
        bankTransactionId: bestMatch._id,
        status: 'Mismatched',
        discrepancyAmount: diff,
        notes: `Overpayment for ${invoice.invoiceNumber}: received ${bestMatch.credit} AED, expected ${invoice.totalAmount} AED, excess ${diff} AED`,
        month,
      })

      await Invoice.findByIdAndUpdate(invoice._id, {
        status: 'Paid',
        paidAmount: bestMatch.credit,
        paidDate: bestMatch.date,
      })
      await BankTransaction.findByIdAndUpdate(bestMatch._id, {
        matchStatus: 'Matched',
        matchedEntityType: 'Invoice',
        matchedEntityId: invoice._id,
        matchConfidence: 90,
      })
    }
  }

  // Any bank credits not matched to any invoice
  for (const tx of bankCredits) {
    if (!usedBankTxIds.has(tx._id.toString())) {
      result.unknown.push({
        bankTransactionId: tx._id.toString(),
        amount: tx.credit,
        description: tx.description,
      })
    }
  }

  return result
}
