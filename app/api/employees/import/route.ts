import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import Employee from '@/lib/db/models/Employee'
import { generateEmployeeCode } from '@/lib/utils'
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
        const email = row['email']?.trim().toLowerCase()
        const name = row['name']?.trim()
        const position = row['position']?.trim()

        if (!email || !name || !position) { skipped++; continue }

        const joiningDate = row['joiningDate'] ? new Date(row['joiningDate']) : new Date()

        const doc: Record<string, unknown> = {
          name,
          email,
          position,
          baseSalary: parseFloat(row['baseSalary'] ?? '0') || 0,
          joiningDate: isNaN(joiningDate.getTime()) ? new Date() : joiningDate,
          status: (['Active', 'Inactive', 'On-Leave'].includes(row['status'] ?? '') ? row['status'] : 'Active'),
          nationality: row['nationality']?.trim() ?? '',
          phone: row['phone']?.trim() ?? '',
          bankDetails: {
            bankName: row['bankName']?.trim() ?? '',
            accountNumber: row['accountNumber']?.trim() ?? '',
            iban: row['iban']?.trim().toUpperCase() ?? '',
          },
        }

        // Only set employeeCode on insert
        const existing = await Employee.findOne({ email })
        if (existing) {
          await Employee.findByIdAndUpdate(existing._id, doc)
          updated++
        } else {
          const count = await Employee.countDocuments()
          doc.employeeCode = row['employeeCode']?.trim().toUpperCase() || generateEmployeeCode(count + 1)
          // Ensure unique code
          let code = doc.employeeCode as string
          let attempt = 0
          while (await Employee.exists({ employeeCode: code })) {
            code = generateEmployeeCode(count + attempt + 2)
            attempt++
          }
          doc.employeeCode = code
          await Employee.create(doc)
          inserted++
        }
      }

      return NextResponse.json(apiSuccess({ inserted, updated, skipped }, `Import complete: ${inserted} added, ${updated} updated, ${skipped} skipped`))
    } catch (err) {
      console.error('[POST /api/employees/import]', err)
      return NextResponse.json(apiError('Import failed'), { status: 500 })
    }
  },
  ['Admin', 'HR']
)
