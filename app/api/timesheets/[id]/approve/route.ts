import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { approveTimesheet } from '@/lib/services/timesheet.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const POST = withAuth(
  async (_req: NextRequest, context: { params: Record<string, string> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const timesheet = await approveTimesheet(context.params.id, user.userId)
      return NextResponse.json(apiSuccess(timesheet, 'Timesheet approved successfully'))
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number }
      if (error.statusCode === 404) return NextResponse.json(apiError(error.message), { status: 404 })
      if (error.statusCode === 400) return NextResponse.json(apiError(error.message), { status: 400 })
      console.error('[POST /api/timesheets/[id]/approve]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Finance', 'Admin']
)
