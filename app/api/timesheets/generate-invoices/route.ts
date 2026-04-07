import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { generateInvoicesFromTimesheets } from '@/lib/services/timesheet.service'
import type { JWTPayload } from '@/lib/auth/jwt'
import { z } from 'zod'

const Schema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'),
})

export const POST = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const body = await req.json()
      const parsed = Schema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(apiError('Invalid month format. Use YYYY-MM'), { status: 422 })
      }
      const result = await generateInvoicesFromTimesheets(parsed.data.month)
      return NextResponse.json(
        apiSuccess(result, `Invoice generation complete for ${parsed.data.month}`)
      )
    } catch (err) {
      console.error('[POST /api/timesheets/generate-invoices]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Finance', 'Admin']
)
