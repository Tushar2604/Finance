import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { TimesheetUpdateSchema } from '@/lib/validations/timesheet'
import { getTimesheetById, updateTimesheet, deleteTimesheet } from '@/lib/services/timesheet.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (_req: NextRequest, context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const timesheet = await getTimesheetById(context.params.id)
      return NextResponse.json(apiSuccess(timesheet))
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number }
      if (error.statusCode === 404) return NextResponse.json(apiError(error.message), { status: 404 })
      if (error.statusCode === 400) return NextResponse.json(apiError(error.message), { status: 400 })
      console.error('[GET /api/timesheets/[id]]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  }
)

export const DELETE = withAuth(
  async (_req: NextRequest, context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await deleteTimesheet(context.params.id)
      return NextResponse.json(apiSuccess(null, 'Timesheet deleted successfully'))
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number }
      if (error.statusCode === 404) return NextResponse.json(apiError(error.message), { status: 404 })
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'HR']
)

export const PUT = withAuth(
  async (req: NextRequest, context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const body = await req.json()
      const parsed = TimesheetUpdateSchema.safeParse(body)
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = []
          fieldErrors[field].push(issue.message)
        }
        return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
      }
      const timesheet = await updateTimesheet(context.params.id, parsed.data)
      return NextResponse.json(apiSuccess(timesheet, 'Timesheet updated successfully'))
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number }
      if (error.statusCode === 404) return NextResponse.json(apiError(error.message), { status: 404 })
      if (error.statusCode === 400) return NextResponse.json(apiError(error.message), { status: 400 })
      console.error('[PUT /api/timesheets/[id]]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  }
)
