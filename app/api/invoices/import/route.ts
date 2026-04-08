import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import Invoice from '@/lib/db/models/Invoice'
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
        const invoiceNumber = row['invoiceNumber']?.trim()
        if (!invoiceNumber) { skipped++; continue }

        // Resolve clientId from client name if provided as string
        let clientId = row['clientId']?.trim() || null
        if (!clientId && row['client']) {
          const clientDoc = await Client.findOne({ name: { $regex: `^${row['client'].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })
          clientId = clientDoc?._id?.toString() ?? null
        }

        const totalAmount = parseFloat(row['totalAmount'] ?? '0') || 0
        const vatAmount = parseFloat(row['vatAmount'] ?? '0') || 0
        const subtotal = parseFloat(row['subtotal'] ?? String(totalAmount - vatAmount)) || totalAmount - vatAmount
        const paidAmount = parseFloat(row['paidAmount'] ?? '0') || 0
        const validStatuses = ['Draft', 'Sent', 'Paid', 'PartiallyPaid', 'Overdue', 'Cancelled']
        const status = validStatuses.includes(row['status'] ?? '') ? row['status'] : 'Draft'

        const doc: Record<string, unknown> = {
          invoiceNumber,
          clientId: clientId || undefined,
          month: row['month']?.trim() ?? '',
          rate: parseFloat(row['rate'] ?? '0') || 0,
          hours: parseFloat(row['hours'] ?? '0') || 0,
          subtotal,
          vatAmount,
          totalAmount,
          paidAmount,
          status,
          invoiceDate: row['invoiceDate'] ? new Date(row['invoiceDate']) : new Date(),
          dueDate: row['dueDate'] ? new Date(row['dueDate']) : undefined,
        }

        const existing = await Invoice.findOne({ invoiceNumber })
        if (existing) {
          await Invoice.findByIdAndUpdate(existing._id, doc)
          updated++
        } else {
          await Invoice.create(doc)
          inserted++
        }
      }

      return NextResponse.json(apiSuccess({ inserted, updated, skipped }, `Import complete: ${inserted} added, ${updated} updated, ${skipped} skipped`))
    } catch (err) {
      console.error('[POST /api/invoices/import]', err)
      return NextResponse.json(apiError('Import failed'), { status: 500 })
    }
  },
  ['Admin', 'Finance']
)
