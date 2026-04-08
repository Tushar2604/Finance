import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import Salary from '@/lib/db/models/Salary'
import Employee from '@/lib/db/models/Employee'
import type { JWTPayload } from '@/lib/auth/jwt'

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
        const month = row['month']?.trim()
        const employeeEmail = row['email']?.trim().toLowerCase()

        if (!month) { skipped++; continue }

        let employeeId = row['employeeId']?.trim() || null
        if (!employeeId && employeeEmail) {
          const emp = await Employee.findOne({ email: employeeEmail })
          employeeId = emp?._id?.toString() ?? null
        }
        if (!employeeId) { skipped++; continue }

        const baseSalary = parseFloat(row['baseSalary'] ?? '0') || 0
        const overtime = parseFloat(row['overtime'] ?? '0') || 0
        const deductions = parseFloat(row['deductions'] ?? '0') || 0
        const netSalary = parseFloat(row['netSalary'] ?? String(baseSalary + overtime - deductions)) || baseSalary + overtime - deductions
        const validStatuses = ['Pending', 'Paid', 'Failed']
        const paymentStatus = validStatuses.includes(row['paymentStatus'] ?? '') ? row['paymentStatus'] : 'Pending'
        const validModes = ['Bank', 'Cash', 'WPS', 'Cheque']
        const paymentMode = validModes.includes(row['paymentMode'] ?? '') ? row['paymentMode'] : 'WPS'

        const doc = {
          employeeId,
          month,
          baseSalary,
          overtime,
          deductions,
          netSalary,
          paymentStatus,
          paymentMode,
          paymentDate: row['paymentDate'] ? new Date(row['paymentDate']) : undefined,
          bankReference: row['bankReference']?.trim() ?? '',
        }

        // Dedup by employeeId + month
        const existing = await Salary.findOne({ employeeId, month })
        if (existing) {
          await Salary.findByIdAndUpdate(existing._id, doc)
          updated++
        } else {
          await Salary.create(doc)
          inserted++
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
