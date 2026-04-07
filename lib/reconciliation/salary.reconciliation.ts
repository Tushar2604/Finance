import mongoose from 'mongoose'
import dbConnect from '@/lib/db/connection'
import Salary, { ISalary } from '@/lib/db/models/Salary'
import Employee, { IEmployee } from '@/lib/db/models/Employee'
import BankTransaction, { IBankTransaction } from '@/lib/db/models/BankTransaction'
import ReconciliationRecord from '@/lib/db/models/ReconciliationRecord'

export interface SalaryMatchedItem {
  salaryId: string
  bankTransactionId: string
  employee: string
  amount: number
  month: string
}

export interface SalaryMissingItem {
  employee: string
  employeeId: string
  month: string
  expectedAmount: number
}

export interface SalaryExtraItem {
  bankTransactionId: string
  amount: number
  description: string
}

export interface SalaryDuplicateItem {
  salaryIds: string[]
  employee: string
  month: string
  totalPaid: number
}

export interface SalaryAmountMismatchItem {
  salaryId: string
  bankTransactionId: string
  salaryAmount: number
  bankAmount: number
  variance: number
}

export interface SalaryReconciliationResult {
  matched: SalaryMatchedItem[]
  missing: SalaryMissingItem[]
  extra: SalaryExtraItem[]
  duplicates: SalaryDuplicateItem[]
  amountMismatches: SalaryAmountMismatchItem[]
}

const SALARY_TOLERANCE_AED = 5

function getMonthDateRange(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split('-').map(Number)
  const start = new Date(year, mon - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, mon, 0, 23, 59, 59, 999)
  return { start, end }
}

function transactionMatchesSalary(
  tx: IBankTransaction,
  employee: IEmployee,
  netSalary: number
): boolean {
  const amountDiff = Math.abs(tx.debit - netSalary)
  if (amountDiff > SALARY_TOLERANCE_AED) return false

  const desc = tx.description.toLowerCase()
  const ref = tx.reference.toLowerCase()

  // Check for employee name or IBAN in description/reference
  const nameParts = employee.name.toLowerCase().split(/\s+/)
  const nameMatch = nameParts.some((part) => part.length > 2 && (desc.includes(part) || ref.includes(part)))

  const iban = employee.bankDetails?.iban?.toLowerCase() ?? ''
  const ibanMatch = iban.length > 5 && (desc.includes(iban) || ref.includes(iban))

  return nameMatch || ibanMatch
}

export async function reconcileSalaries(month: string): Promise<SalaryReconciliationResult> {
  await dbConnect()

  const { start, end } = getMonthDateRange(month)

  // Clear previous reconciliation records for this month + type
  await ReconciliationRecord.deleteMany({ type: 'Salary', month })

  // Fetch all salary records for the month with employee data
  const salaries = await Salary.find({ month }).lean()
  const employeeIds = salaries.map((s) => s.employeeId)
  const employees = await Employee.find({ _id: { $in: employeeIds } }).lean()
  const employeeMap = new Map<string, IEmployee>(
    employees.map((e) => [e._id.toString(), e as unknown as IEmployee])
  )

  // Fetch all bank debit transactions within the month
  const bankDebits = await BankTransaction.find({
    transactionType: 'Debit',
    date: { $gte: start, $lte: end },
  }).lean()

  const result: SalaryReconciliationResult = {
    matched: [],
    missing: [],
    extra: [],
    duplicates: [],
    amountMismatches: [],
  }

  // Track which bank transactions have been used
  const usedBankTxIds = new Set<string>()
  // employeeId -> matched bank tx ids
  const employeeToMatchedTxs = new Map<string, string[]>()

  // For each salary, find matching bank debits
  for (const salary of salaries) {
    const employee = employeeMap.get(salary.employeeId.toString())
    if (!employee) continue

    const netSalary = salary.netSalary ?? salary.baseSalary + salary.overtime - salary.deductions
    const matchingTxs = bankDebits.filter(
      (tx) =>
        !usedBankTxIds.has(tx._id.toString()) &&
        transactionMatchesSalary(tx as unknown as IBankTransaction, employee, netSalary)
    )

    if (matchingTxs.length === 0) {
      // Missing: salary exists but no bank debit found
      result.missing.push({
        employee: employee.name,
        employeeId: employee._id.toString(),
        month,
        expectedAmount: netSalary,
      })

      await ReconciliationRecord.create({
        type: 'Salary',
        entityId: salary._id,
        bankTransactionId: null,
        status: 'Missing',
        discrepancyAmount: netSalary,
        notes: `No bank debit found for salary of ${employee.name} for ${month}`,
        month,
      })
    } else if (matchingTxs.length === 1) {
      const tx = matchingTxs[0]
      usedBankTxIds.add(tx._id.toString())
      const txsForEmployee = employeeToMatchedTxs.get(employee._id.toString()) ?? []
      txsForEmployee.push(tx._id.toString())
      employeeToMatchedTxs.set(employee._id.toString(), txsForEmployee)

      const variance = Math.abs(tx.debit - netSalary)
      if (variance > SALARY_TOLERANCE_AED) {
        // Amount mismatch
        result.amountMismatches.push({
          salaryId: salary._id.toString(),
          bankTransactionId: tx._id.toString(),
          salaryAmount: netSalary,
          bankAmount: tx.debit,
          variance,
        })

        await ReconciliationRecord.create({
          type: 'Salary',
          entityId: salary._id,
          bankTransactionId: tx._id,
          status: 'Mismatched',
          discrepancyAmount: variance,
          notes: `Amount mismatch: salary=${netSalary} AED, bank debit=${tx.debit} AED for ${employee.name}`,
          month,
        })
      } else {
        // Matched
        result.matched.push({
          salaryId: salary._id.toString(),
          bankTransactionId: tx._id.toString(),
          employee: employee.name,
          amount: netSalary,
          month,
        })

        await ReconciliationRecord.create({
          type: 'Salary',
          entityId: salary._id,
          bankTransactionId: tx._id,
          status: 'Matched',
          discrepancyAmount: 0,
          notes: `Salary matched for ${employee.name}`,
          month,
        })

        // Update bank transaction match status
        await BankTransaction.findByIdAndUpdate(tx._id, {
          matchStatus: 'Matched',
          matchedEntityType: 'Salary',
          matchedEntityId: salary._id,
          matchConfidence: 100,
        })
      }
    } else {
      // Multiple matching transactions — potential duplicate payments
      for (const tx of matchingTxs) {
        usedBankTxIds.add(tx._id.toString())
      }
      const txsForEmployee = employeeToMatchedTxs.get(employee._id.toString()) ?? []
      matchingTxs.forEach((tx) => txsForEmployee.push(tx._id.toString()))
      employeeToMatchedTxs.set(employee._id.toString(), txsForEmployee)

      const totalPaid = matchingTxs.reduce((sum, tx) => sum + tx.debit, 0)
      result.duplicates.push({
        salaryIds: [salary._id.toString()],
        employee: employee.name,
        month,
        totalPaid,
      })

      await ReconciliationRecord.create({
        type: 'Salary',
        entityId: salary._id,
        bankTransactionId: matchingTxs[0]._id,
        status: 'Duplicate',
        discrepancyAmount: totalPaid - netSalary,
        notes: `Duplicate payments detected for ${employee.name}: ${matchingTxs.length} debits found`,
        month,
      })
    }
  }

  // Find extra bank debits not matched to any salary
  for (const tx of bankDebits) {
    if (!usedBankTxIds.has(tx._id.toString())) {
      result.extra.push({
        bankTransactionId: tx._id.toString(),
        amount: tx.debit,
        description: tx.description,
      })

      await ReconciliationRecord.create({
        type: 'Salary',
        entityId: tx._id,
        bankTransactionId: tx._id,
        status: 'Extra',
        discrepancyAmount: tx.debit,
        notes: `Unmatched bank debit: ${tx.description}`,
        month,
      })
    }
  }

  return result
}
