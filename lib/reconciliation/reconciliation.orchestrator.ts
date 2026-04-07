import dbConnect from '@/lib/db/connection'
import { reconcileSalaries, SalaryReconciliationResult } from './salary.reconciliation'
import { reconcileInvoices, InvoiceReconciliationResult } from './invoice.reconciliation'
import { reconcileExpenses, ExpenseReconciliationResult } from './expense.reconciliation'
import {
  flagUnmatchedTransactions,
  getUnmatchedSummary,
  UnmatchedSummary,
} from './unmatched.reconciliation'
import Alert from '@/lib/db/models/Alert'
import mongoose from 'mongoose'

export interface ReconciliationRunResult {
  salary: SalaryReconciliationResult
  invoice: InvoiceReconciliationResult
  expense: ExpenseReconciliationResult
  unmatched: UnmatchedSummary
  runAt: Date
  month: string
  triggeredBy: string
}

// In-memory store for the last run result per month
// In production this could be stored in a dedicated MongoDB collection
const runCache = new Map<string, ReconciliationRunResult>()

async function createMismatchAlerts(
  salary: SalaryReconciliationResult,
  invoice: InvoiceReconciliationResult,
  expense: ExpenseReconciliationResult,
  month: string
): Promise<void> {
  const alertDocs: Array<{
    type: 'SalaryMismatch' | 'UnpaidInvoice' | 'CostAnomaly' | 'RevenueGap'
    severity: 'Low' | 'Medium' | 'High' | 'Critical'
    title: string
    message: string
    entityType: string
    entityId: mongoose.Types.ObjectId | null
    isRead: boolean
    isResolved: boolean
  }> = []

  // Salary mismatch alerts
  for (const mismatch of salary.amountMismatches) {
    alertDocs.push({
      type: 'SalaryMismatch',
      severity: mismatch.variance > 500 ? 'High' : 'Medium',
      title: `Salary mismatch: variance ${mismatch.variance.toFixed(2)} AED`,
      message: `Salary record (${mismatch.salaryId}) amount ${mismatch.salaryAmount} AED differs from bank debit ${mismatch.bankAmount} AED by ${mismatch.variance.toFixed(2)} AED`,
      entityType: 'Salary',
      entityId: new mongoose.Types.ObjectId(mismatch.salaryId),
      isRead: false,
      isResolved: false,
    })
  }

  // Missing salary alerts
  for (const missing of salary.missing) {
    alertDocs.push({
      type: 'SalaryMismatch',
      severity: 'High',
      title: `Missing salary payment: ${missing.employee}`,
      message: `No bank debit found for salary of ${missing.employee} for ${month}. Expected: ${missing.expectedAmount} AED`,
      entityType: 'Salary',
      entityId: new mongoose.Types.ObjectId(missing.employeeId),
      isRead: false,
      isResolved: false,
    })
  }

  // Unpaid invoice alerts
  for (const unpaid of invoice.unpaid) {
    alertDocs.push({
      type: 'UnpaidInvoice',
      severity: unpaid.daysOverdue > 60 ? 'Critical' : unpaid.daysOverdue > 30 ? 'High' : 'Medium',
      title: `Unpaid invoice: ${unpaid.client} — ${unpaid.amount.toFixed(2)} AED`,
      message: `Invoice for ${unpaid.client} (${unpaid.amount.toFixed(2)} AED) is ${unpaid.daysOverdue} days overdue`,
      entityType: 'Invoice',
      entityId: new mongoose.Types.ObjectId(unpaid.invoiceId),
      isRead: false,
      isResolved: false,
    })
  }

  // Partial payment alerts
  for (const partial of invoice.partial) {
    alertDocs.push({
      type: 'RevenueGap',
      severity: partial.shortfall > 10000 ? 'High' : 'Medium',
      title: `Partial invoice payment: ${partial.client}`,
      message: `Invoice for ${partial.client} partially paid. Received ${partial.receivedAmount.toFixed(2)} AED of ${partial.invoiceAmount.toFixed(2)} AED. Shortfall: ${partial.shortfall.toFixed(2)} AED`,
      entityType: 'Invoice',
      entityId: new mongoose.Types.ObjectId(partial.invoiceId),
      isRead: false,
      isResolved: false,
    })
  }

  // Expense anomaly alerts
  for (const unrecorded of expense.unrecorded) {
    if (unrecorded.amount > 1000) {
      alertDocs.push({
        type: 'CostAnomaly',
        severity: unrecorded.amount > 10000 ? 'High' : 'Medium',
        title: `Unrecorded expense: ${unrecorded.amount.toFixed(2)} AED`,
        message: `Bank debit of ${unrecorded.amount.toFixed(2)} AED has no matching expense record. Description: ${unrecorded.description}`,
        entityType: 'BankTransaction',
        entityId: new mongoose.Types.ObjectId(unrecorded.bankTransactionId),
        isRead: false,
        isResolved: false,
      })
    }
  }

  if (alertDocs.length > 0) {
    await Alert.insertMany(alertDocs)
  }
}

export async function runFullReconciliation(
  month: string,
  userId: string
): Promise<ReconciliationRunResult> {
  await dbConnect()

  // Run all three reconciliations in parallel
  const [salary, invoice, expense] = await Promise.all([
    reconcileSalaries(month),
    reconcileInvoices(month),
    reconcileExpenses(month),
  ])

  // Run unmatched pass after
  await flagUnmatchedTransactions(month)
  const unmatched = await getUnmatchedSummary(month)

  // Remove old mismatch alerts for the period before creating new ones
  await Alert.deleteMany({
    type: { $in: ['SalaryMismatch', 'UnpaidInvoice', 'CostAnomaly', 'RevenueGap'] },
    createdAt: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
    },
  })

  // Trigger alert creation for all mismatches
  await createMismatchAlerts(salary, invoice, expense, month)

  const runResult: ReconciliationRunResult = {
    salary,
    invoice,
    expense,
    unmatched,
    runAt: new Date(),
    month,
    triggeredBy: userId,
  }

  // Cache the run result keyed by month
  runCache.set(month, runResult)

  return runResult
}

export function getLastRunResult(month: string): ReconciliationRunResult | undefined {
  return runCache.get(month)
}

export function getAllRunResults(): ReconciliationRunResult[] {
  return Array.from(runCache.values()).sort(
    (a, b) => b.runAt.getTime() - a.runAt.getTime()
  )
}
