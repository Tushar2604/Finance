import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { ExpenseCreateSchema } from '@/lib/validations/expense'
import { getExpenses, createExpense } from '@/lib/services/expense.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(req.url)
      const projectId = searchParams.get('projectId') ?? undefined
      const employeeId = searchParams.get('employeeId') ?? undefined
      const status = searchParams.get('status') as 'Pending' | 'Approved' | 'Rejected' | undefined
      const page = parseInt(searchParams.get('page') ?? '1', 10)
      const limit = parseInt(searchParams.get('limit') ?? '20', 10)

      // RBAC: ordinary users can only see their own expenses
      const effectiveEmployeeId = (user.role === 'Admin' || user.role === 'Finance' || user.role === 'Manager') 
        ? employeeId 
        : user.userId

      const result = await getExpenses({ projectId, employeeId: effectiveEmployeeId, status, page, limit })
      return NextResponse.json(apiSuccess(result))
    } catch (err: any) {
      console.error('[GET /api/expenses]', err)
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  }
)

export const POST = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const body = await req.json()
      // If employeeId is not provided, it will map to user.userId inside createExpense fallback
      const parsed = ExpenseCreateSchema.safeParse(body)

      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = []
          fieldErrors[field].push(issue.message)
        }
        return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
      }

      const expense = await createExpense(parsed.data, user.userId)
      return NextResponse.json(apiSuccess(expense, 'Expense created successfully'), { status: 201 })
    } catch (err: any) {
      console.error('[POST /api/expenses]', err)
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  }
)
