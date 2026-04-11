import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError, generateClientCode } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import Client from '@/lib/db/models/Client'
import type { JWTPayload } from '@/lib/auth/jwt'

function parseBool(val: string | undefined): boolean {
  if (!val) return false
  return ['yes', 'true', '1'].includes(val.trim().toLowerCase())
}
function parseNum(val: string | undefined, fallback = 0): number {
  const n = parseFloat(val ?? '')
  return isNaN(n) ? fallback : n
}
function parseDate(val: string | undefined): Date | null {
  if (!val?.trim()) return null
  const d = new Date(val.trim())
  return isNaN(d.getTime()) ? null : d
}
function pick<T extends string>(val: string | undefined, allowed: T[], fallback: T): T {
  const v = (val?.trim() ?? '') as T
  return allowed.includes(v) ? v : fallback
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
          const name = row['name']?.trim() || row['Client Name']?.trim() || row['clientName']?.trim()
          if (!name || name.length < 2) { skipped++; continue }

          const doc = {
            name,
            website:    row['website']?.trim()  ?? row['Website']?.trim()  ?? '',
            industry:   row['industry']?.trim()  ?? row['Industry']?.trim()  ?? '',
            companyDetails: {
              address:   row['address']?.trim()   ?? row['Address']?.trim()   ?? '',
              phone:     row['phone']?.trim()     ?? row['Phone']?.trim()     ?? '',
              email:     (row['email']?.trim()    ?? row['Email']?.trim()     ?? '').toLowerCase(),
              taxNumber: row['taxNumber']?.trim() ?? row['Tax Number']?.trim() ?? '',
            },
            // Spec fields — sanitize enum values
            serviceType:             pick(row['serviceType'] ?? row['Service Type'], ['Agreement', 'LPO', 'Both', ''], ''),
            signedAgreement:         parseBool(row['signedAgreement'] ?? row['Signed Agreement']),
            agreementNo:             row['agreementNo']?.trim()             ?? row['Agreement No']?.trim()             ?? '',
            requiredWeeklyHoursDeal: parseNum(row['requiredWeeklyHoursDeal'] ?? row['Required Weekly Hours Deal']),
            validLPO:                parseBool(row['validLPO']               ?? row['Valid LPO']),
            contractDuration:        row['contractDuration']?.trim()         ?? row['Contract Duration']?.trim()        ?? '',
            discipline:              row['discipline']?.trim()               ?? row['Discipline']?.trim()               ?? '',
            lpoNo:                   row['lpoNo']?.trim()                    ?? row['LPO No']?.trim()                   ?? '',
            monthlyDealAmount:       parseNum(row['monthlyDealAmount']        ?? row['Monthly Deal Amount']),
            workStation:             row['workStation']?.trim()              ?? row['Work Station']?.trim()             ?? '',
            otHourlyDealAmount:      parseNum(row['otHourlyDealAmount']       ?? row['OT Hourly Deal Amount']),
            invoiceType:             pick(row['invoiceType'] ?? row['Invoice Type'], ['Hourly', 'Daily', ''], ''),
            requiredWeeklyHoursSite: parseNum(row['requiredWeeklyHoursSite'] ?? row['Required Weekly Hours Site']),
            lpoDate:                 parseDate(row['lpoDate']                ?? row['LPO Date']),
            lpoValidity:             parseDate(row['lpoValidity']             ?? row['LPO Validity']),
            remarks:                 row['remarks']?.trim()                  ?? row['Remarks']?.trim()                  ?? '',
            // Legacy
            contractType:  pick(row['contractType'] ?? row['Contract Type'], ['LPO', 'Agreement', 'None'], 'None'),
            rateCard:      parseNum(row['rateCard']    ?? row['Rate Card']),
            billingType:   pick(row['billingType']     ?? row['Billing Type'], ['Monthly', 'Milestone', 'Hourly'], 'Monthly'),
            creditTerms:   parseInt(row['creditTerms'] ?? row['Credit Terms'] ?? '30', 10) || 30,
            isActive:      row['isActive'] !== 'false' && row['isActive'] !== '0',
          }

          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const existing = await Client.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } })
          if (existing) {
            await Client.findByIdAndUpdate(existing._id, doc, { runValidators: false })
            updated++
          } else {
            const providedCode = (row['clientCode']?.trim() || row['Client Code']?.trim() || '').toUpperCase()
            let base = providedCode || generateClientCode(name)
            let code = base
            let suffix = 2
            while (await Client.exists({ clientCode: code })) { code = `${base}-${suffix++}` }
            await Client.create({ ...doc, clientCode: code })
            inserted++
          }
        } catch (rowErr) {
          console.error('[clients/import] row error:', rowErr)
          skipped++
        }
      }

      return NextResponse.json(apiSuccess({ inserted, updated, skipped }, `Import complete: ${inserted} added, ${updated} updated, ${skipped} skipped`))
    } catch (err) {
      console.error('[POST /api/clients/import]', err)
      return NextResponse.json(apiError('Import failed'), { status: 500 })
    }
  },
  ['Admin', 'Finance']
)
