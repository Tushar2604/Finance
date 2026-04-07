import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { TimesheetCreateSchema } from '@/lib/validations/timesheet'
import { getTimesheets, createTimesheet } from '@/lib/services/timesheet.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(req.url)
      const result = await getTimesheets({
        employeeId: searchParams.get('employeeId') ?? undefined,
        clientId: searchParams.get('clientId') ?? undefined,
        month: searchParams.get('month') ?? undefined,
        status: searchParams.get('status') ?? undefined,
        page: parseInt(searchParams.get('page') ?? '1', 10),
        limit: parseInt(searchParams.get('limit') ?? '20', 10),
      })
      return NextResponse.json(apiSuccess(result))
    } catch (err) {
      console.error('[GET /api/timesheets]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  }
)

export const POST = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const body = await req.json()
      const parsed = TimesheetCreateSchema.safeParse(body)
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = []
          fieldErrors[field].push(issue.message)
        }
        return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
      }
      const timesheet = await createTimesheet(parsed.data)
      return NextResponse.json(apiSuccess(timesheet, 'Timesheet created successfully'), { status: 201 })
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number }
      if (error.statusCode === 409) return NextResponse.json(apiError(error.message), { status: 409 })
      console.error('[POST /api/timesheets]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  }
)
