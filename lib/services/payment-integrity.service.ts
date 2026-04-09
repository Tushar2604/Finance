/**
 * Payment Integrity Engine — Rule-based (no LLM, zero cost)
 *
 * Runs a set of deterministic rules against Salary, Timesheet, Employee,
 * Invoice, and BankTransaction records and returns a list of flagged issues
 * that the finance owner can review.
 */

import dbConnect from '@/lib/db/connection'
import Salary from '@/lib/db/models/Salary'
import Timesheet from '@/lib/db/models/Timesheet'
import Employee from '@/lib/db/models/Employee'
import Invoice from '@/lib/db/models/Invoice'
import BankTransaction from '@/lib/db/models/BankTransaction'

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertCategory =
  | 'OVERPAYMENT'
  | 'UNDERPAYMENT'
  | 'LATE_PAYMENT'
  | 'MISSING_PAYMENT'
  | 'DUPLICATE_PAYMENT'
  | 'BANK_UNMATCHED'
  | 'RATE_MISMATCH'
  | 'TIMESHEET_MISMATCH'

export interface PaymentAlert {
  id: string
  category: AlertCategory
  severity: AlertSeverity
  employeeId: string
  employeeName: string
  employeeCode: string
  month: string
  message: string
  expected?: number
  actual?: number
  delta?: number
  paymentDate?: string
  paymentMode?: string
  salaryId?: string
  bankTxId?: string
}

export interface AuditSummary {
  runAt: string
  monthsScanned: string[]
  totalSalaries: number
  totalAlerts: number
  criticalCount: number
  warningCount: number
  infoCount: number
  alerts: PaymentAlert[]
  cashFlow: MonthlyCashFlow[]
}

export interface MonthlyCashFlow {
  month: string
  totalRevenue: number
  totalSalaryOut: number
  totalExpenseOut: number
  netCashFlow: number
  salaryCount: number
}

// ── helpers ────────────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function getLast3Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function monthEnd(yyyyMm: string): Date {
  const [y, m] = yyyyMm.split('-').map(Number)
  return new Date(y, m, 0, 23, 59, 59, 999)   // last millisecond of month
}

// ── main function ──────────────────────────────────────────────────────────────

export async function runPaymentAudit(months?: string[]): Promise<AuditSummary> {
  await dbConnect()

  const targetMonths = months?.length ? months : getLast3Months()
  const alerts: PaymentAlert[] = []

  // Pre-fetch data for all target months
  const [salaries, timesheets, employees, bankTxs, invoices] = await Promise.all([
    Salary.find({ month: { $in: targetMonths } })
      .populate('employeeId', 'name employeeCode baseSalary position status')
      .lean(),
    Timesheet.find({ month: { $in: targetMonths } })
      .populate('employeeId', 'name employeeCode')
      .lean(),
    Employee.find({ status: 'Active' }).lean(),
    BankTransaction.find({
      transactionType: 'Debit',
      date: { $gte: new Date(targetMonths[0] + '-01') },
    }).lean(),
    Invoice.find({ month: { $in: targetMonths }, status: { $ne: 'Cancelled' } }).lean(),
  ])

  // Build lookups
  const timesheetByEmpMonth = new Map<string, any>()
  for (const ts of timesheets) {
    const empId = ts.employeeId?._id?.toString() ?? ts.employeeId?.toString()
    timesheetByEmpMonth.set(`${empId}__${ts.month}`, ts)
  }

  const salaryByEmpMonth = new Map<string, any[]>()
  for (const sal of salaries) {
    const empId = sal.employeeId?._id?.toString() ?? sal.employeeId?.toString()
    const key = `${empId}__${sal.month}`
    if (!salaryByEmpMonth.has(key)) salaryByEmpMonth.set(key, [])
    salaryByEmpMonth.get(key)!.push(sal)
  }

  // ── RULE 1: DUPLICATE PAYMENT ──────────────────────────────────────────────
  for (const [key, sals] of salaryByEmpMonth.entries()) {
    if (sals.length > 1) {
      const [empId, month] = key.split('__')
      const emp = sals[0].employeeId as any
      alerts.push({
        id: uid('DUP'),
        category: 'DUPLICATE_PAYMENT',
        severity: 'critical',
        employeeId: empId,
        employeeName: emp?.name ?? empId,
        employeeCode: emp?.employeeCode ?? '',
        month,
        message: `${sals.length} salary records found for the same employee in ${month}. Possible duplicate payment.`,
        actual: sals.reduce((s: number, r: any) => s + r.netSalary, 0),
        salaryId: sals[0]._id?.toString(),
      })
    }
  }

  for (const sal of salaries as any[]) {
    const emp = sal.employeeId as any
    const empId = emp?._id?.toString() ?? sal.employeeId?.toString()
    const empName = emp?.name ?? empId
    const empCode = emp?.employeeCode ?? ''
    const baseSalary = emp?.baseSalary ?? 0

    // ── RULE 2: RATE MISMATCH (paid ≠ contract base salary, >5% tolerance) ──
    if (baseSalary > 0) {
      const delta = sal.netSalary - baseSalary
      const pct = Math.abs(delta / baseSalary) * 100
      if (pct > 5) {
        alerts.push({
          id: uid('RATE'),
          category: delta > 0 ? 'OVERPAYMENT' : 'UNDERPAYMENT',
          severity: delta > 0 ? 'critical' : 'warning',
          employeeId: empId,
          employeeName: empName,
          employeeCode: empCode,
          month: sal.month,
          message: `Salary paid (AED ${sal.netSalary.toLocaleString()}) differs from contract base (AED ${baseSalary.toLocaleString()}) by ${pct.toFixed(1)}%.`,
          expected: baseSalary,
          actual: sal.netSalary,
          delta,
          salaryId: sal._id?.toString(),
        })
      }
    }

    // ── RULE 3: LATE PAYMENT (paymentDate > month-end + 7 days grace) ────────
    if (sal.paymentStatus === 'Paid' && sal.paymentDate) {
      const deadline = monthEnd(sal.month)
      deadline.setDate(deadline.getDate() + 7)  // 7-day grace
      const payDate = new Date(sal.paymentDate)
      if (payDate > deadline) {
        const daysLate = Math.ceil((payDate.getTime() - deadline.getTime()) / 86_400_000)
        alerts.push({
          id: uid('LATE'),
          category: 'LATE_PAYMENT',
          severity: daysLate > 14 ? 'critical' : 'warning',
          employeeId: empId,
          employeeName: empName,
          employeeCode: empCode,
          month: sal.month,
          message: `Salary for ${sal.month} was paid ${daysLate} days late (paid: ${payDate.toLocaleDateString()}).`,
          paymentDate: sal.paymentDate,
          paymentMode: sal.paymentMode ?? '',
          salaryId: sal._id?.toString(),
        })
      }
    }

    // ── RULE 4: BANK TRANSACTION MATCH (paid salary should have bank debit) ──
    if (sal.paymentStatus === 'Paid' && sal.paymentMode === 'Bank') {
      const payDate = sal.paymentDate ? new Date(sal.paymentDate) : null
      const matchTolerance = sal.netSalary * 0.02   // 2% amount tolerance
      const dateTolerance = 3 * 86_400_000           // 3-day date window

      const match = bankTxs.find((tx: any) => {
        const amtMatch = Math.abs(tx.debit - sal.netSalary) <= matchTolerance
        const dateMatch = payDate
          ? Math.abs(new Date(tx.date).getTime() - payDate.getTime()) <= dateTolerance
          : true
        return amtMatch && dateMatch
      })

      if (!match) {
        alerts.push({
          id: uid('BANK'),
          category: 'BANK_UNMATCHED',
          severity: 'warning',
          employeeId: empId,
          employeeName: empName,
          employeeCode: empCode,
          month: sal.month,
          message: `Salary marked as Bank-paid (AED ${sal.netSalary.toLocaleString()}) but no matching bank debit found within ±2% amount and ±3 days.`,
          expected: sal.netSalary,
          paymentDate: sal.paymentDate,
          salaryId: sal._id?.toString(),
        })
      }
    }

    // ── RULE 5: TIMESHEET MISMATCH (hours → implied salary vs actual paid) ───
    const ts = timesheetByEmpMonth.get(`${empId}__${sal.month}`)
    if (ts && ts.totalHours > 0 && emp?.baseSalary > 0) {
      // Implied daily rate from base salary ÷ 22 working days ÷ 8 hrs
      const impliedHourlyRate = emp.baseSalary / (22 * 8)
      const impliedPay = impliedHourlyRate * ts.totalHours
      const delta = sal.netSalary - impliedPay
      const pct = Math.abs(delta / impliedPay) * 100
      if (pct > 15 && Math.abs(delta) > 500) {   // >15% AND >AED 500
        alerts.push({
          id: uid('TS'),
          category: 'TIMESHEET_MISMATCH',
          severity: 'info',
          employeeId: empId,
          employeeName: empName,
          employeeCode: empCode,
          month: sal.month,
          message: `Paid AED ${sal.netSalary.toLocaleString()} but timesheet shows ${ts.totalHours}h → implied AED ${Math.round(impliedPay).toLocaleString()} (${pct.toFixed(1)}% gap).`,
          expected: Math.round(impliedPay),
          actual: sal.netSalary,
          delta: Math.round(delta),
          salaryId: sal._id?.toString(),
        })
      }
    }
  }

  // ── RULE 6: MISSING PAYMENT (active employee, no salary record this month) ──
  for (const month of targetMonths) {
    for (const emp of employees as any[]) {
      const empId = emp._id.toString()
      const key = `${empId}__${month}`
      if (!salaryByEmpMonth.has(key)) {
        alerts.push({
          id: uid('MISS'),
          category: 'MISSING_PAYMENT',
          severity: 'warning',
          employeeId: empId,
          employeeName: emp.name,
          employeeCode: emp.employeeCode ?? '',
          month,
          message: `Active employee has no salary record for ${month}.`,
          expected: emp.baseSalary ?? 0,
          actual: 0,
          delta: -(emp.baseSalary ?? 0),
        })
      }
    }
  }

  // ── CASH FLOW SUMMARY ─────────────────────────────────────────────────────
  const revenueByMonth = new Map<string, number>()
  for (const inv of invoices as any[]) {
    revenueByMonth.set(inv.month, (revenueByMonth.get(inv.month) ?? 0) + (inv.totalAmount ?? 0))
  }

  const cashFlow: MonthlyCashFlow[] = targetMonths.map(month => {
    const monthSals = salaries.filter((s: any) => s.month === month)
    const totalSalaryOut = monthSals.reduce((sum: number, s: any) => sum + (s.netSalary ?? 0), 0)
    const totalRevenue = revenueByMonth.get(month) ?? 0
    return {
      month,
      totalRevenue,
      totalSalaryOut,
      totalExpenseOut: 0,   // can be populated from Expense if needed
      netCashFlow: totalRevenue - totalSalaryOut,
      salaryCount: monthSals.length,
    }
  })

  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const warningCount = alerts.filter(a => a.severity === 'warning').length
  const infoCount = alerts.filter(a => a.severity === 'info').length

  // Sort: critical first, then warning, then info
  alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  })

  return {
    runAt: new Date().toISOString(),
    monthsScanned: targetMonths,
    totalSalaries: salaries.length,
    totalAlerts: alerts.length,
    criticalCount,
    warningCount,
    infoCount,
    alerts,
    cashFlow,
  }
}
