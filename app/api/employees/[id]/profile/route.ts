import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { getEmployee360 } from '@/lib/services/employee.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (_req: NextRequest, context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const profile = await getEmployee360(context.params.id)
      return NextResponse.json(apiSuccess(profile))
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number }
      if (error.statusCode === 404) return NextResponse.json(apiError(error.message), { status: 404 })
      if (error.statusCode === 400) return NextResponse.json(apiError(error.message), { status: 400 })
      console.error('[GET /api/employees/[id]/profile]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  }
)
