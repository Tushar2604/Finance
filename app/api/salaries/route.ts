import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { SalaryCreateSchema } from '@/lib/validations/salary'
import { getSalaries, createSalary } from '@/lib/services/salary.service'
import type { JWTPayload } from '@/lib/auth/jwt'
import { PaymentStatus } from '@/lib/db/models/Salary'

export const GET = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(req.url)
      const employeeId = searchParams.get('employeeId') ?? undefined
      const month = searchParams.get('month') ?? undefined
      const paymentStatus = searchParams.get('paymentStatus') as PaymentStatus | undefined
      const page = parseInt(searchParams.get('page') ?? '1', 10)
      const limit = parseInt(searchParams.get('limit') ?? '20', 10)

      const result = await getSalaries({ employeeId, month, paymentStatus, page, limit })
      return NextResponse.json(apiSuccess(result))
    } catch (err: any) {
      console.error('[GET /api/salaries]', err)
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  }
)

export const POST = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const body = await req.json()
      const parsed = SalaryCreateSchema.safeParse(body)

      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = []
          fieldErrors[field].push(issue.message)
        }
        return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
      }

      const salary = await createSalary(parsed.data, user.userId)
      return NextResponse.json(apiSuccess(salary, 'Salary created successfully'), { status: 201 })
    } catch (err: any) {
      console.error('[POST /api/salaries]', err)
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  },
  ['Admin', 'Finance', 'HR']
)
