import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError, generateEmployeeCode } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
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
        const email = row['email']?.trim().toLowerCase()
        const name = row['name']?.trim()
        const position = row['position']?.trim()

        if (!email || !name || !position) { skipped++; continue }

        const joiningDate = row['joiningDate'] ? new Date(row['joiningDate']) : new Date()

        // Resolve clientCode → clientId
        let assignedClientId: string | null = null
        let clientsWorkedWith: object[] = []
        const clientCode = row['clientCode']?.trim().toUpperCase()
        const clientName = row['clientName']?.trim()
        if (clientCode) {
          const client = await Client.findOne({ clientCode }).lean()
          if (client) {
            assignedClientId = (client as any)._id.toString()
            clientsWorkedWith = [{ clientId: (client as any)._id, clientCode: (client as any).clientCode, clientName: (client as any).name }]
          }
        } else if (clientName) {
          const client = await Client.findOne({ name: { $regex: clientName, $options: 'i' } }).lean()
          if (client) {
            assignedClientId = (client as any)._id.toString()
            clientsWorkedWith = [{ clientId: (client as any)._id, clientCode: (client as any).clientCode, clientName: (client as any).name }]
          }
        }

        const doc: Record<string, unknown> = {
          name,
          email,
          position,
          baseSalary: parseFloat(row['baseSalary'] ?? '0') || 0,
          joiningDate: isNaN(joiningDate.getTime()) ? new Date() : joiningDate,
          status: (['Active', 'Inactive', 'On-Leave'].includes(row['status'] ?? '') ? row['status'] : 'Active'),
          nationality: row['nationality']?.trim() ?? '',
          phone: row['phone']?.trim() ?? '',
          currentMonthlySalary: parseFloat(row['currentMonthlySalary'] ?? '0') || 0,
          monthlySalaryContracted: parseFloat(row['monthlySalaryContracted'] ?? '0') || 0,
          basicSalaryContracted: parseFloat(row['basicSalaryContracted'] ?? '0') || 0,
          noticePeriod: parseInt(row['noticePeriod'] ?? '30') || 30,
          probationPeriod: parseInt(row['probationPeriod'] ?? '90') || 90,
          bankDetails: {
            bankName: row['bankName']?.trim() ?? '',
            accountNumber: row['accountNumber']?.trim() ?? '',
            iban: row['iban']?.trim().toUpperCase() ?? '',
          },
          ...(assignedClientId ? { assignedClientId, clientsWorkedWith } : {}),
        }

        const existing = await Employee.findOne({ email })
        if (existing) {
          await Employee.findByIdAndUpdate(existing._id, doc)
          updated++
        } else {
          // Generate name-based employee code
          const providedCode = row['employeeCode']?.trim().toUpperCase()
          let base = providedCode || generateEmployeeCode(0, name)
          let code = base
          let suffix = 2
          while (await Employee.exists({ employeeCode: code })) {
            code = `${base}-${suffix++}`
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
