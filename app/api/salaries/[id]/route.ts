import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { SalaryUpdateSchema } from '@/lib/validations/salary'
import { getSalaryById, updateSalary, deleteSalary } from '@/lib/services/salary.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { id } = await params
      const salary = await getSalaryById(id)
      return NextResponse.json(apiSuccess(salary))
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
      const parsed = SalaryUpdateSchema.safeParse(body)

      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = []
          fieldErrors[field].push(issue.message)
        }
        return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
      }

      const updated = await updateSalary(id, parsed.data, user.userId)
      return NextResponse.json(apiSuccess(updated, 'Salary updated successfully'))
    } catch (err: any) {
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  },
  ['Admin', 'Finance', 'HR']
)

export const DELETE = withAuth(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const { id } = await params
      await deleteSalary(id, user.userId)
      return NextResponse.json(apiSuccess(null, 'Salary deleted successfully'))
    } catch (err: any) {
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  },
  ['Admin']
)
