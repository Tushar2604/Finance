import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import Salary from '@/lib/db/models/Salary'
import Employee from '@/lib/db/models/Employee'
import mongoose from 'mongoose'
import type { JWTPayload } from '@/lib/auth/jwt'

function parseNum(val: string | undefined, fallback = 0): number {
  const n = parseFloat(val ?? '')
  return isNaN(n) ? fallback : n
}
function pick<T extends string>(val: string | undefined, allowed: T[], fallback: T): T {
  const v = (val?.trim() ?? '') as T
  return allowed.includes(v) ? v : fallback
}
function normaliseMonth(raw: string | undefined): string | null {
  if (!raw?.trim()) return null
  const s = raw.trim()
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) return s
  const ymd = s.match(/^(\d{4})-(0[1-9]|1[0-2])-\d{2}$/)
  if (ymd) return `${ymd[1]}-${ymd[2]}`
  const mmy = s.match(/^(0?[1-9]|1[0-2])[\/\-](\d{4})$/)
  if (mmy) return `${mmy[2]}-${mmy[1].padStart(2, '0')}`
  const mOnly = s.match(/^(0?[1-9]|1[0-2])$/)
  if (mOnly) return `${new Date().getFullYear()}-${mOnly[1].padStart(2, '0')}`
  const ym = s.match(/^(\d{4})[\/](0[1-9]|1[0-2])$/)
  if (ym) return `${ym[1]}-${ym[2]}`
  return null
}

export const POST = withAuth(
  async (req: NextRequest, _ctx: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await dbConnect()
      const { rows } = await req.json() as { rows: Record<string, string>[] }

      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json(apiError('No rows provided'), { status: 400 })
      }

      let inserted = 0, updated = 0, skipped = 0

      for (const row of rows) {
        try {
          const month = normaliseMonth(row['month'] ?? row['Month'] ?? row['Month/Year'])
          if (!month) { skipped++; continue }

          // Resolve employee by employeeCode, then by email
          const empCode = (row['employeeCode']?.trim() || row['Employee Code']?.trim() || '').toUpperCase()
          const empEmail = (row['email']?.trim() || row['Email']?.trim() || '').toLowerCase()

          let emp: any = null
          if (empCode) emp = await Employee.findOne({ employeeCode: empCode })
          if (!emp && empEmail) emp = await Employee.findOne({ email: empEmail })
          if (!emp) { skipped++; continue }

          const doc: Record<string, unknown> = {
            employeeId:                  emp._id,
            month,
            siteName:                    row['siteName']?.trim()                    ?? row['Site Name']?.trim()                    ?? '',
            labourCardNo:                row['labourCardNo']?.trim()                ?? row['Labour Card No']?.trim()                ?? '',
            wpsRoutingCode:              row['wpsRoutingCode']?.trim()              ?? row['WPS Routing Code']?.trim()              ?? '',
            iban:                        (row['iban']?.trim()                       ?? row['IBAN']?.trim()                          ?? '').toUpperCase(),
            visaUnderCompany:            row['visaUnderCompany']?.trim()            ?? row['Visa Under Company']?.trim()            ?? '',
            monthlySalary:               parseNum(row['monthlySalary']              ?? row['Monthly Salary']),
            totalServedDays:             parseNum(row['totalServedDays']             ?? row['Total Served Days']),
            normalServedHours:           parseNum(row['normalServedHours']           ?? row['Normal Served Hours']),
            otHours:                     parseNum(row['otHours']                     ?? row['OT Hours']),
            totalRequiredHours:          parseNum(row['totalRequiredHours']          ?? row['Total Required Hours']),
            totalServedHrs:              parseNum(row['totalServedHrs']              ?? row['Total Served Hrs']),
            totalSiteServedHours:        parseNum(row['totalSiteServedHours']        ?? row['Total Site Served Hours']),
            salaryAmount:                parseNum(row['salaryAmount']                ?? row['Salary Amount']),
            previousMonthOvertimeAmt:    parseNum(row['previousMonthOvertimeAmt']    ?? row['Previous Month Overtime Amt']),
            otAmount:                    parseNum(row['otAmount']                    ?? row['OT Amount']),
            grossAmount:                 parseNum(row['grossAmount']                 ?? row['Gross Amount']),
            otherPayable:                parseNum(row['otherPayable']                ?? row['Other Payable']),
            compensationAmount:          parseNum(row['compensationAmount']           ?? row['Compensation Amount']),
            advanceDeduction:            parseNum(row['advanceDeduction']             ?? row['Advance Deduction']),
            pettyCashAmount:             parseNum(row['pettyCashAmount']              ?? row['Petty Cash Amount']),
            otherDeduction:              parseNum(row['otherDeduction']               ?? row['Other Deduction']),
            wpsViolation:                parseNum(row['wpsViolation']                 ?? row['WPS Violation']),
            differenceFromCurrentSalary: parseNum(row['differenceFromCurrentSalary']  ?? row['Difference From Current Salary']),
            netPayable:                  parseNum(row['netPayable']                   ?? row['Net Payable']),
            totalSiteNetPayable:         parseNum(row['totalSiteNetPayable']           ?? row['Total Site Net Payable']),
            signedTimesheetUploadStatus: pick(row['signedTimesheetUploadStatus'], ['Uploaded', 'Not Uploaded', 'Pending', 'Rejected', ''], ''),
            paymentSource:               row['paymentSource']?.trim()               ?? row['Payment Source']?.trim()               ?? '',
            // legacy
            baseSalary:    parseNum(row['baseSalary']    ?? row['Base Salary']),
            overtime:      parseNum(row['overtime']      ?? row['Overtime']),
            deductions:    parseNum(row['deductions']    ?? row['Deductions']),
            netSalary:     parseNum(row['netSalary']     ?? row['Net Salary']),
            paymentStatus: pick(row['paymentStatus'] ?? row['Payment Status'], ['Pending', 'Paid', 'Failed'], 'Pending'),
            paymentMode:   pick(row['paymentMode']   ?? row['Payment Mode'],   ['Bank', 'Cash', 'WPS', 'Cheque'], 'WPS'),
            paymentDate:   row['paymentDate'] ? new Date(row['paymentDate']) : null,
            bankReference: row['bankReference']?.trim() ?? row['Bank Reference']?.trim() ?? '',
          }

          const existing = await Salary.findOne({ employeeId: emp._id, month })
          if (existing) {
            await Salary.findByIdAndUpdate(existing._id, doc, { runValidators: false })
            updated++
          } else {
            await Salary.collection.insertOne({
              ...doc,
              _id: new mongoose.Types.ObjectId(),
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            inserted++
          }
        } catch (rowErr) {
          console.error('[salaries/import] row error:', rowErr)
          skipped++
        }
      }

      return NextResponse.json(apiSuccess({ inserted, updated, skipped }, `Import complete: ${inserted} added, ${updated} updated, ${skipped} skipped`))
    } catch (err) {
      console.error('[POST /api/salaries/import]', err)
      return NextResponse.json(apiError('Import failed'), { status: 500 })
    }
  },
  ['Admin', 'Finance', 'HR']
)
