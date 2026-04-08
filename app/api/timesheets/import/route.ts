import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import Timesheet from '@/lib/db/models/Timesheet'
import Employee from '@/lib/db/models/Employee'
import Client from '@/lib/db/models/Client'
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

        // Resolve clientId from name
        let clientId = row['clientId']?.trim() || null
        if (!clientId && row['client']) {
          const c = await Client.findOne({ name: { $regex: `^${row['client'].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })
          clientId = c?._id?.toString() ?? null
        }

        const validStatuses = ['Pending', 'Approved', 'Rejected']
        const status = validStatuses.includes(row['status'] ?? '') ? row['status'] : 'Pending'

        const doc = {
          employeeId,
          clientId: clientId || undefined,
          month,
          workingDays: parseInt(row['workingDays'] ?? '22') || 22,
          hours: parseFloat(row['hours'] ?? '0') || 0,
          overtimeHours: parseFloat(row['overtimeHours'] ?? '0') || 0,
          status,
          notes: row['notes']?.trim() ?? '',
        }

        // Dedup by employeeId + month
        const existing = await Timesheet.findOne({ employeeId, month })
        if (existing) {
          await Timesheet.findByIdAndUpdate(existing._id, doc)
          updated++
        } else {
          await Timesheet.create(doc)
          inserted++
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
