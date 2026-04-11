import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import Timesheet from '@/lib/db/models/Timesheet'
import Employee from '@/lib/db/models/Employee'
import Client from '@/lib/db/models/Client'
import mongoose from 'mongoose'
import type { JWTPayload } from '@/lib/auth/jwt'

function parseNum(val: string | undefined, fallback = 0): number {
  const n = parseFloat(val ?? '')
  return isNaN(n) ? fallback : n
}
function parseIntSafe(val: string | undefined, fallback = 0): number {
  const n = parseInt(val ?? '', 10)
  return isNaN(n) ? fallback : n
}
function pick<T extends string>(val: string | undefined, allowed: T[], fallback: T): T {
  const v = (val?.trim() ?? '') as T
  return allowed.includes(v) ? v : fallback
}

/**
 * Normalise month to YYYY-MM.
 * Accepts: "2024-11", "11/2024", "11-2024", "11" (assumes current year), "2024-11-01" (strips day)
 */
function normaliseMonth(raw: string | undefined): string | null {
  if (!raw?.trim()) return null
  const s = raw.trim()

  // Already YYYY-MM
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) return s

  // YYYY-MM-DD → strip day
  const ymd = s.match(/^(\d{4})-(0[1-9]|1[0-2])-\d{2}$/)
  if (ymd) return `${ymd[1]}-${ymd[2]}`

  // MM/YYYY or MM-YYYY
  const mmy = s.match(/^(0?[1-9]|1[0-2])[\/\-](\d{4})$/)
  if (mmy) return `${mmy[2]}-${mmy[1].padStart(2, '0')}`

  // Just a month number 1-12 → use current year
  const mOnly = s.match(/^(0?[1-9]|1[0-2])$/)
  if (mOnly) return `${new Date().getFullYear()}-${mOnly[1].padStart(2, '0')}`

  // YYYY/MM
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
          // Month — accept multiple formats
          const monthRaw = row['month']?.trim() || row['Month']?.trim() || row['Month/Year']?.trim()
          const month = normaliseMonth(monthRaw)
          if (!month) { skipped++; continue }

          // Resolve employee: employeeCode → email → name (any order works)
          const empCode = (row['employeeCode']?.trim() || row['Employee Code']?.trim() || '').toUpperCase()
          const empEmail = (row['email']?.trim() || row['Email']?.trim() || '').toLowerCase()
          const empName  = row['employeeName']?.trim() || row['Employee Name']?.trim() || row['name']?.trim()

          let emp: any = null
          if (empCode) emp = await Employee.findOne({ employeeCode: empCode })
          if (!emp && empEmail) emp = await Employee.findOne({ email: empEmail })
          if (!emp && empName) {
            const escaped = empName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            emp = await Employee.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } })
          }

          // If still no employee — allow import without employee (will show as unlinked)
          const employeeId = emp?._id ?? null

          // Resolve clientId: from row, then from employee's assigned client
          let clientId: mongoose.Types.ObjectId | null = null
          const clientCode = (row['clientCode']?.trim() || row['Client Code']?.trim() || '').toUpperCase()
          const clientName  = row['client']?.trim() || row['Client']?.trim() || row['clientName']?.trim()

          if (clientCode) {
            const c = await Client.findOne({ clientCode })
            if (c) clientId = c._id
          }
          if (!clientId && clientName) {
            const escaped = clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const c = await Client.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } })
            if (c) clientId = c._id
          }
          if (!clientId && emp?.assignedClientId) clientId = emp.assignedClientId

          const referenceCode = (row['referenceCode']?.trim() || row['Reference Code']?.trim() || '').toUpperCase()

          // Site sub-document
          const siteName    = row['siteName']?.trim()    || row['Site Name']?.trim()    || ''
          const siteCode    = row['siteCode']?.trim()    || row['Site Code']?.trim()    || row['Site Code (ERP)']?.trim() || ''
          const projectName = row['projectName']?.trim() || row['Project Name']?.trim() || ''
          const projectCode = row['projectCode']?.trim() || row['Project Code']?.trim() || ''

          const sites = (siteName || siteCode || projectName) ? [{
            siteName,
            siteCode,
            projectName,
            projectCode,
            requiredHours: parseNum(row['requiredHours'] ?? row['Required Hours']),
            normalHours:   parseNum(row['normalHours']   ?? row['Normal Hours']),
            otHours:       parseNum(row['otHours']       ?? row['OT Hours']),
            servedHours:   parseNum(row['servedHours']   ?? row['Served Hours']),
            servedDays:    parseNum(row['servedDays']    ?? row['Served Days']),
          }] : []

          const doc: Record<string, unknown> = {
            month,
            referenceCode,
            workingDays:        parseIntSafe(row['workingDays']         ?? row['Working Days'], 22),
            hours:              parseNum(row['hours']                    ?? row['Hours']),
            billableHours:      parseNum(row['billableHours']            ?? row['Billable Hours']),
            nonBillableHours:   parseNum(row['nonBillableHours']         ?? row['Non Billable Hours']),
            overtimeHours:      parseNum(row['overtimeHours']            ?? row['Overtime Hours']),
            leaveDays:          parseIntSafe(row['leaveDays']            ?? row['Leave Days']),
            absentDays:         parseIntSafe(row['absentDays']           ?? row['Absent Days']),
            totalRequiredHours: parseNum(row['totalRequiredHours']       ?? row['Total Required Hours']  ?? row['Total Req...']),
            normalServedHours:  parseNum(row['normalServedHours']        ?? row['Normal Served Hours']   ?? row['Normal Se...']),
            totalOTHours:       parseNum(row['totalOTHours']             ?? row['Total OT Hours']        ?? row['Total OT H...']),
            totalServedHours:   parseNum(row['totalServedHours']         ?? row['Total Served Hours']    ?? row['Total Serv...']),
            totalServedDays:    parseIntSafe(row['totalServedDays']      ?? row['Total Served Days']),
            totalLeave:         parseIntSafe(row['totalLeave']           ?? row['Total Leave']           ?? row['Total No. of Leave'] ?? row['Total No.']),
            status:             pick(row['status'], ['Draft', 'Submitted', 'Approved', 'Rejected'], 'Draft'),
            signedTimesheetStatus: pick(row['signedTimesheetStatus'] ?? row['Signed Timesheet Upload Status'] ?? row['Signed Ti...'],
                                        ['Pending', 'Uploaded', 'Verified'], 'Pending'),
            hrApprovalStatus:   pick(row['hrApprovalStatus'] ?? row['HR Approval Status'] ?? row['HR Appro...'],
                                      ['Pending', 'Approved', 'Rejected'], 'Pending'),
            employeeSignedStatus: pick(row['employeeSignedStatus'] ?? row['Employee Signed Timesheet Upload Status'] ?? row['Employee Signed Timesheet Upload'],
                                        ['Pending', 'Uploaded'], 'Pending'),
            notes: row['notes']?.trim() ?? '',
            sites,
          }
          if (employeeId) doc.employeeId = employeeId
          if (clientId) doc.clientId = clientId

          // Dedup: referenceCode if set, else employeeId+month or just month if no employee
          let dedupeQuery: Record<string, unknown>
          if (referenceCode) {
            dedupeQuery = { referenceCode }
          } else if (employeeId) {
            dedupeQuery = { employeeId, month }
          } else {
            dedupeQuery = { month, siteName: siteName || { $exists: true }, siteCode: siteCode || { $exists: true } }
          }

          const existing = await Timesheet.findOne(dedupeQuery)
          if (existing) {
            await Timesheet.findByIdAndUpdate(existing._id, { $set: doc }, { runValidators: false })
            updated++
          } else {
            await Timesheet.collection.insertOne({
              ...doc,
              _id: new mongoose.Types.ObjectId(),
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            inserted++
          }
        } catch (rowErr) {
          console.error('[timesheets/import] row error:', rowErr)
          skipped++
        }
      }

      return NextResponse.json(apiSuccess({ inserted, updated, skipped }, `Import complete: ${inserted} added, ${updated} updated, ${skipped} skipped`))
    } catch (err) {
      console.error('[POST /api/timesheets/import]', err)
      return NextResponse.json(apiError('Import failed'), { status: 500 })
    }
  },
  ['Admin', 'Finance', 'HR']
)
