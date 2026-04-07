import dbConnect from '@/lib/db/connection'
import Employee from '@/lib/db/models/Employee'
import Timesheet from '@/lib/db/models/Timesheet'
import Salary from '@/lib/db/models/Salary'
import Invoice from '@/lib/db/models/Invoice'
import BankTransaction from '@/lib/db/models/BankTransaction'
import { getDefaultAIProvider } from './ai.factory'
import type { AnomalyResult } from './provider.interface'

function getMonthDateRange(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split('-').map(Number)
  const start = new Date(year, mon - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, mon, 0, 23, 59, 59, 999)
  return { start, end }
}

interface AuditFinding {
  type: string
  entity: string
  entityId?: string
  description: string
  expectedValue?: number
  actualValue?: number
  variance?: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

async function detectMissingInvoices(month: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = []

  // Find employees with approved timesheets but no invoice for the month
  const timesheets = await Timesheet.find({ month, status: 'Approved' })
    .populate('employeeId', 'name')
    .populate('clientId', 'name')
    .lean()

  const invoices = await Invoice.find({ month, status: { $ne: 'Cancelled' } }).lean()

  for (const ts of timesheets) {
    // Check if there's an invoice for this employee+client+month
    const hasInvoice = invoices.some(
      (inv) =>
        inv.employeeId?.toString() === ts.employeeId.toString() &&
        inv.clientId.toString() === ts.clientId.toString()
    )

    if (!hasInvoice) {
      const emp = ts.employeeId as unknown as { name?: string }
      const cli = ts.clientId as unknown as { name?: string }
      findings.push({
        type: 'MissingInvoice',
        entity: emp?.name ?? ts.employeeId.toString(),
        entityId: ts._id.toString(),
        description: `Employee ${emp?.name ?? ts.employeeId} has an approved timesheet for client ${cli?.name ?? ts.clientId} in ${month} but no invoice was raised`,
        riskLevel: 'high',
      })
    }
  }

  return findings
}

async function detectMissingTimesheets(month: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = []

  // Find active employees with no timesheet for the month
  const activeEmployees = await Employee.find({ status: 'Active' }).lean()
  const timesheets = await Timesheet.find({ month }).lean()
  const employeeIdsWithTimesheet = new Set(timesheets.map((ts) => ts.employeeId.toString()))

  for (const employee of activeEmployees) {
    if (!employeeIdsWithTimesheet.has(employee._id.toString())) {
      findings.push({
        type: 'MissingTimesheet',
        entity: employee.name,
        entityId: employee._id.toString(),
        description: `Active employee ${employee.name} has no timesheet for ${month}`,
        riskLevel: 'medium',
      })
    }
  }

  return findings
}

async function detectSalaryInconsistencies(month: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = []
  const TOLERANCE_PCT = 0.1 // 10%

  const salaries = await Salary.find({ month })
    .populate('employeeId', 'name baseSalary')
    .lean()

  for (const salary of salaries) {
    const employee = salary.employeeId as unknown as { name?: string; baseSalary?: number }
    const baseSalary = employee?.baseSalary ?? 0

    if (baseSalary <= 0) continue

    const variance = Math.abs(salary.netSalary - baseSalary)
    const variancePct = variance / baseSalary

    if (variancePct > TOLERANCE_PCT) {
      findings.push({
        type: 'SalaryInconsistency',
        entity: employee?.name ?? salary.employeeId.toString(),
        entityId: salary._id.toString(),
        description: `Salary for ${employee?.name} in ${month} differs from base salary by ${(variancePct * 100).toFixed(1)}%`,
        expectedValue: baseSalary,
        actualValue: salary.netSalary,
        variance,
        riskLevel: variancePct > 0.3 ? 'high' : 'medium',
      })
    }
  }

  return findings
}

async function detectSuspiciousBankTransactions(month: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = []
  const { start, end } = getMonthDateRange(month)
  const HIGH_AMOUNT_THRESHOLD = 50000

  const transactions = await BankTransaction.find({
    date: { $gte: start, $lte: end },
  }).lean()

  for (const tx of transactions) {
    const amount = tx.transactionType === 'Credit' ? tx.credit : tx.debit

    // Flag large transactions
    if (amount > HIGH_AMOUNT_THRESHOLD) {
      findings.push({
        type: 'LargeTransaction',
        entity: tx._id.toString(),
        entityId: tx._id.toString(),
        description: `Large ${tx.transactionType.toLowerCase()} transaction of ${amount.toFixed(2)} AED on ${new Date(tx.date).toLocaleDateString('en-AE')}: ${tx.description}`,
        actualValue: amount,
        riskLevel: amount > 200000 ? 'critical' : 'high',
      })
    }

    // Flag unmatched transactions older than 7 days
    const ageMs = Date.now() - new Date(tx.date).getTime()
    const ageDays = ageMs / (1000 * 60 * 60 * 24)
    if (tx.matchStatus === 'Unmatched' && ageDays > 7 && amount > 5000) {
      findings.push({
        type: 'UnmatchedHighValue',
        entity: tx._id.toString(),
        entityId: tx._id.toString(),
        description: `Unmatched ${tx.transactionType.toLowerCase()} of ${amount.toFixed(2)} AED unresolved for ${Math.floor(ageDays)} days: ${tx.description}`,
        actualValue: amount,
        riskLevel: amount > 20000 ? 'high' : 'medium',
      })
    }
  }

  // Detect unusual patterns: multiple debits to same description within short period
  const debitsByDesc = new Map<string, typeof transactions>()
  for (const tx of transactions.filter((t) => t.transactionType === 'Debit')) {
    const key = tx.description.substring(0, 30).toLowerCase()
    const group = debitsByDesc.get(key) ?? []
    group.push(tx)
    debitsByDesc.set(key, group)
  }

  for (const [desc, txGroup] of debitsByDesc.entries()) {
    if (txGroup.length > 3) {
      const total = txGroup.reduce((sum, tx) => sum + tx.debit, 0)
      findings.push({
        type: 'RepetitiveDebits',
        entity: desc,
        description: `${txGroup.length} debits with similar description "${desc}" totaling ${total.toFixed(2)} AED in ${month}`,
        actualValue: total,
        riskLevel: 'medium',
      })
    }
  }

  return findings
}

export async function runAIAuditDetection(
  month?: string,
  userId = 'anonymous'
): Promise<AnomalyResult[]> {
  await dbConnect()

  const targetMonth =
    month ??
    (() => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })()

  // Run all detection checks in parallel
  const [missingInvoices, missingTimesheets, salaryInconsistencies, suspiciousTxs] =
    await Promise.all([
      detectMissingInvoices(targetMonth),
      detectMissingTimesheets(targetMonth),
      detectSalaryInconsistencies(targetMonth),
      detectSuspiciousBankTransactions(targetMonth),
    ])

  const allFindings = [
    ...missingInvoices,
    ...missingTimesheets,
    ...salaryInconsistencies,
    ...suspiciousTxs,
  ]

  if (allFindings.length === 0) {
    return []
  }

  const provider = getDefaultAIProvider(userId)

  // Pass findings to AI for severity scoring and narrative explanation
  const aiResults = await provider.detectAnomalies({
    month: targetMonth,
    findings: allFindings,
    totalEmployees: await Employee.countDocuments({ status: 'Active' }),
    findingCount: allFindings.length,
  })

  // Merge AI-scored results with our findings if AI returned results
  if (aiResults.length > 0 && aiResults[0].type !== 'SystemNotice') {
    return aiResults
  }

  // Fallback: convert our findings to AnomalyResult format
  return allFindings.map(
    (f): AnomalyResult => ({
      type: f.type,
      entity: f.entity,
      description: f.description,
      severity: f.riskLevel,
      expectedValue: f.expectedValue,
      actualValue: f.actualValue,
      variance: f.variance,
    })
  )
}
