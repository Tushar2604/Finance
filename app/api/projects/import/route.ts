import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import Project from '@/lib/db/models/Project'
import Client from '@/lib/db/models/Client'
import mongoose from 'mongoose'
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
        try {
          const name = row['name']?.trim() || row['Name']?.trim() || row['Project Name']?.trim()
          if (!name || name.length < 2) { skipped++; continue }

          // Resolve clientId by clientCode first, then by client name
          let clientId: mongoose.Types.ObjectId | null = null
          const clientCode = (row['clientCode']?.trim() || row['Client Code']?.trim() || '').toUpperCase()
          const clientName = row['client']?.trim() || row['Client']?.trim() || row['clientName']?.trim() || row['Client Name']?.trim()

          if (clientCode) {
            const c = await Client.findOne({ clientCode })
            if (c) clientId = c._id
          }
          if (!clientId && clientName) {
            const escaped = clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const c = await Client.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } })
            if (c) clientId = c._id
          }

          const validStatuses = ['Active', 'Completed', 'On-Hold', 'Cancelled']
          const status = validStatuses.includes(row['status']?.trim() ?? '') ? row['status']?.trim() : 'Active'

          const startDateRaw = row['startDate']?.trim() || row['Start Date']?.trim()
          const endDateRaw   = row['endDate']?.trim()   || row['End Date']?.trim()

          const doc: Record<string, unknown> = {
            name,
            description: row['description']?.trim() ?? row['Description']?.trim() ?? '',
            status,
            budget: parseFloat(row['budget'] ?? row['Budget'] ?? '0') || 0,
            startDate: startDateRaw ? new Date(startDateRaw) : new Date(),
            endDate: endDateRaw ? new Date(endDateRaw) : null,
          }
          if (clientId) doc.clientId = clientId

          // Dedup by name (+ clientId if available)
          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const dedupeQuery: Record<string, unknown> = { name: { $regex: `^${escaped}$`, $options: 'i' } }
          if (clientId) dedupeQuery.clientId = clientId

          const existing = await Project.findOne(dedupeQuery)
          if (existing) {
            await Project.findByIdAndUpdate(existing._id, doc, { runValidators: false })
            updated++
          } else {
            // Use collection.insertOne to bypass stale schema cache (avoids clientId:required issue)
            await Project.collection.insertOne({
              ...doc,
              _id: new mongoose.Types.ObjectId(),
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            inserted++
          }
        } catch (rowErr) {
          console.error('[projects/import] row error:', rowErr)
          skipped++
        }
      }

      return NextResponse.json(apiSuccess({ inserted, updated, skipped }, `Import complete: ${inserted} added, ${updated} updated, ${skipped} skipped`))
    } catch (err) {
      console.error('[POST /api/projects/import]', err)
      return NextResponse.json(apiError('Import failed'), { status: 500 })
    }
  },
  ['Admin', 'Finance']
)
