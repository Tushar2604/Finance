import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
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
        const name = row['name']?.trim()
        if (!name || name.length < 2) { skipped++; continue }

        const doc = {
          name,
          website: row['website']?.trim() ?? '',
          industry: row['industry']?.trim() ?? '',
          companyDetails: {
            address: row['address']?.trim() ?? '',
            phone: row['phone']?.trim() ?? '',
            email: row['email']?.trim().toLowerCase() ?? '',
            taxNumber: row['taxNumber']?.trim() ?? '',
          },
          contractType: (['LPO', 'Agreement', 'None'].includes(row['contractType'] ?? '') ? row['contractType'] : 'None') as 'LPO' | 'Agreement' | 'None',
          rateCard: parseFloat(row['rateCard'] ?? '0') || 0,
          billingType: (['Monthly', 'Milestone', 'Hourly'].includes(row['billingType'] ?? '') ? row['billingType'] : 'Monthly') as 'Monthly' | 'Milestone' | 'Hourly',
          creditTerms: parseInt(row['creditTerms'] ?? '30') || 30,
          isActive: row['isActive'] !== 'false' && row['isActive'] !== '0',
        }

        // Dedup by name (case-insensitive)
        const existing = await Client.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })
        if (existing) {
          await Client.findByIdAndUpdate(existing._id, doc)
          updated++
        } else {
          await Client.create(doc)
          inserted++
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
