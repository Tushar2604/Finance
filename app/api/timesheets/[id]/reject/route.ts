import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { rejectTimesheet } from '@/lib/services/timesheet.service'
import type { JWTPayload } from '@/lib/auth/jwt'
import { z } from 'zod'

const RejectSchema = z.object({
  reason: z.string().max(1000).trim().default(''),
})

export const POST = withAuth(
  async (req: NextRequest, context: { params: Record<string, string> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const body = await req.json().catch(() => ({}))
      const parsed = RejectSchema.safeParse(body)
      const reason = parsed.success ? parsed.data.reason : ''

      const timesheet = await rejectTimesheet(context.params.id, user.userId, reason)
      return NextResponse.json(apiSuccess(timesheet, 'Timesheet rejected'))
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number }
      if (error.statusCode === 404) return NextResponse.json(apiError(error.message), { status: 404 })
      if (error.statusCode === 400) return NextResponse.json(apiError(error.message), { status: 400 })
      console.error('[POST /api/timesheets/[id]/reject]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Finance', 'Admin']
)
