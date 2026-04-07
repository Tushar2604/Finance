import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { ExpenseUpdateSchema } from '@/lib/validations/expense'
import { getExpenseById, updateExpense, deleteExpense } from '@/lib/services/expense.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { id } = await params
      const expense = await getExpenseById(id)
      return NextResponse.json(apiSuccess(expense))
    } catch (err: any) {
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  }
)

export const PATCH = withAuth(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const { id } = await params
      const body = await req.json()
      const parsed = ExpenseUpdateSchema.safeParse(body)

      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = []
          fieldErrors[field].push(issue.message)
        }
        return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
      }

      const updated = await updateExpense(id, parsed.data, user.userId)
      return NextResponse.json(apiSuccess(updated, 'Expense updated successfully'))
    } catch (err: any) {
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  }
)

export const DELETE = withAuth(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const { id } = await params
      await deleteExpense(id, user.userId)
      return NextResponse.json(apiSuccess(null, 'Expense deleted successfully'))
    } catch (err: any) {
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  }
)
