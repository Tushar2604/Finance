import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import Expense from '@/lib/db/models/Expense'
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
        const description = row['description']?.trim()
        const bankReference = row['bankReference']?.trim()

        if (!description) { skipped++; continue }

        const date = row['date'] ? new Date(row['date']) : new Date()
        const amount = parseFloat(row['amount'] ?? '0') || 0
        const validStatuses = ['Pending', 'Approved', 'Rejected']
        const status = validStatuses.includes(row['status'] ?? '') ? row['status'] : 'Pending'

        const doc = {
          category: row['category']?.trim() || 'Other',
          description,
          amount,
          date: isNaN(date.getTime()) ? new Date() : date,
          paidTo: row['paidTo']?.trim() ?? '',
          paymentMode: row['paymentMode']?.trim() ?? 'Bank',
          status,
          bankReference: bankReference ?? '',
        }

        // Dedup by bankReference if present, else by description+date+amount
        const existing = bankReference
          ? await Expense.findOne({ bankReference })
          : await Expense.findOne({ description, amount, date: { $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()), $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1) } })

        if (existing) {
          await Expense.findByIdAndUpdate(existing._id, doc)
          updated++
        } else {
          await Expense.create(doc)
          inserted++
        }
      }

      return NextResponse.json(apiSuccess({ inserted, updated, skipped }, `Import complete: ${inserted} added, ${updated} updated, ${skipped} skipped`))
    } catch (err) {
      console.error('[POST /api/expenses/import]', err)
      return NextResponse.json(apiError('Import failed'), { status: 500 })
    }
  },
  ['Admin', 'Finance']
)
