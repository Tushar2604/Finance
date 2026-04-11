import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError, generateEmployeeCode } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import Employee from '@/lib/db/models/Employee'
import Client from '@/lib/db/models/Client'
import type { JWTPayload } from '@/lib/auth/jwt'

function parseDate(val: string | undefined): Date | null {
  if (!val?.trim()) return null
  const d = new Date(val.trim())
  return isNaN(d.getTime()) ? null : d
}

function parseNum(val: string | undefined, fallback = 0): number {
  const n = parseFloat(val ?? '')
  return isNaN(n) ? fallback : n
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
        const name = row['name']?.trim() || row['Employee Name']?.trim() || row['employee_name']?.trim()
        const position = row['position']?.trim() || row['Position']?.trim()
        // email is required by the model — generate a placeholder if missing
        let email = row['email']?.trim().toLowerCase() || row['Email']?.trim().toLowerCase()

        if (!name || !position) { skipped++; continue }

        // If no email, derive a placeholder from employeeCode or name to satisfy unique constraint
        if (!email) {
          const code = (row['employeeCode']?.trim() || row['Employee Code']?.trim() || name).toLowerCase().replace(/\s+/g, '.')
          email = `${code}@import.local`
        }

        const joiningDate = parseDate(row['joiningDate'] ?? row['Joining Date']) ?? new Date()

        // Resolve clientCode → clientId
        let assignedClientId: string | null = null
        let clientsWorkedWith: object[] = []
        const clientCode = (row['clientCode']?.trim() || row['Client Code']?.trim() || '').toUpperCase()
        const clientName = row['clientName']?.trim() || row['Client Name']?.trim()
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

        const validStatuses = ['Active', 'Inactive', 'On-Leave']
        const status = validStatuses.includes(row['status']?.trim() ?? '') ? row['status']?.trim() : 'Active'

        const validEmpTypes = ['Permanent', 'Contract', 'Freelance', 'Intern', 'Part-Time', '']
        const employeeType = validEmpTypes.includes(row['employeeType']?.trim() ?? '') ? (row['employeeType']?.trim() ?? '') : ''

        const validGenders = ['Male', 'Female', 'Other', '']
        const gender = validGenders.includes(row['gender']?.trim() ?? '') ? (row['gender']?.trim() ?? '') : ''

        const doc: Record<string, unknown> = {
          name,
          email,
          position,
          // Spec fields
          discipline:           row['discipline']?.trim()           ?? row['Discipline']?.trim()            ?? '',
          employeeType,
          mobileNo:             row['mobileNo']?.trim()             ?? row['Mobile No']?.trim()             ?? row['mobile_no']?.trim() ?? '',
          gender,
          dob:                  parseDate(row['dob']                ?? row['DOB']                           ?? row['Date of Birth']),
          contractJoiningDate:  parseDate(row['contractJoiningDate'] ?? row['Contract Joining Date']),
          status,
          nationality:          row['nationality']?.trim()          ?? row['Nationality']?.trim()           ?? '',
          visaCompany:          row['visaCompany']?.trim()          ?? row['Visa Company']?.trim()          ?? row['visa_company']?.trim() ?? '',
          totalSalary:          parseNum(row['totalSalary']          ?? row['Total Salary']                 ?? row['total_salary']),
          // Legacy
          baseSalary:           parseNum(row['baseSalary']           ?? row['Base Salary'], 0),
          joiningDate,
          phone:                row['phone']?.trim()                ?? row['Phone']?.trim()                 ?? '',
          currentMonthlySalary: parseNum(row['currentMonthlySalary'] ?? row['Current Monthly Salary']),
          monthlySalaryContracted: parseNum(row['monthlySalaryContracted'] ?? row['Monthly Salary Contracted']),
          basicSalaryContracted:   parseNum(row['basicSalaryContracted']   ?? row['Basic Salary Contracted']),
          noticePeriod:         parseInt(row['noticePeriod']         ?? row['Notice Period']    ?? '30', 10) || 30,
          probationPeriod:      parseInt(row['probationPeriod']      ?? row['Probation Period'] ?? '90', 10) || 90,
          bankDetails: {
            bankName:      row['bankName']?.trim()      ?? row['Bank Name']?.trim()       ?? '',
            accountNumber: row['accountNumber']?.trim() ?? row['Account Number']?.trim()  ?? '',
            iban:          (row['iban']?.trim()         ?? row['IBAN']?.trim()            ?? '').toUpperCase(),
          },
          ...(assignedClientId ? { assignedClientId, clientsWorkedWith } : {}),
        }

        // Dedup: first by employeeCode if provided, then by email
        const providedCode = (row['employeeCode']?.trim() || row['Employee Code']?.trim() || '').toUpperCase()
        const existing = providedCode
          ? await Employee.findOne({ employeeCode: providedCode })
          : await Employee.findOne({ email })

        if (existing) {
          await Employee.findByIdAndUpdate(existing._id, doc)
          updated++
        } else {
          let base = providedCode || generateEmployeeCode(0, name)
          let code = base
          let suffix = 2
          while (await Employee.exists({ employeeCode: code })) { code = `${base}-${suffix++}` }
          doc.employeeCode = code
          await Employee.create(doc)
          inserted++
        }
        } catch (rowErr) {
          console.error('[employees/import] row error:', rowErr)
          skipped++
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
