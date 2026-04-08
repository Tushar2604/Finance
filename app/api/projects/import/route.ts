import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import Project from '@/lib/db/models/Project'
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

        let clientId = row['clientId']?.trim() || null
        if (!clientId && row['client']) {
          const c = await Client.findOne({ name: { $regex: `^${row['client'].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })
          clientId = c?._id?.toString() ?? null
        }

        const validStatuses = ['Active', 'Completed', 'On-Hold', 'Cancelled']
        const status = validStatuses.includes(row['status'] ?? '') ? row['status'] : 'Active'

        const doc = {
          name,
          clientId: clientId || undefined,
          description: row['description']?.trim() ?? '',
          status,
          budget: parseFloat(row['budget'] ?? '0') || 0,
          startDate: row['startDate'] ? new Date(row['startDate']) : new Date(),
          endDate: row['endDate'] ? new Date(row['endDate']) : null,
        }

        // Dedup by name + clientId
        const existing = await Project.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }, clientId: clientId || { $exists: true } })
        if (existing) {
          await Project.findByIdAndUpdate(existing._id, doc)
          updated++
        } else {
          await Project.create(doc)
          inserted++
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
