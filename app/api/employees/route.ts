import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { EmployeeCreateSchema } from '@/lib/validations/employee'
import { getEmployees, createEmployee } from '@/lib/services/employee.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(req.url)
      const result = await getEmployees({
        status: searchParams.get('status') ?? undefined,
        clientId: searchParams.get('clientId') ?? undefined,
        search: searchParams.get('search') ?? undefined,
        page: parseInt(searchParams.get('page') ?? '1', 10),
        limit: parseInt(searchParams.get('limit') ?? '20', 10),
      })
      return NextResponse.json(apiSuccess(result))
    } catch (err) {
      console.error('[GET /api/employees]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  }
)

export const POST = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const body = await req.json()
      const parsed = EmployeeCreateSchema.safeParse(body)
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = []
          fieldErrors[field].push(issue.message)
        }
        return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
      }
      const employee = await createEmployee(parsed.data)
      return NextResponse.json(apiSuccess(employee, 'Employee created successfully'), { status: 201 })
    } catch (err: unknown) {
      const error = err as Error & { code?: number }
      if (error.code === 11000) {
        return NextResponse.json(apiError('Email or employee code already exists'), { status: 409 })
      }
      console.error('[POST /api/employees]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'HR']
)
