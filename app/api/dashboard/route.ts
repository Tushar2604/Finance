import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { getDashboardMetrics } from '@/lib/services/dashboard.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (_req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const result = await getDashboardMetrics()
      return NextResponse.json(apiSuccess(result))
    } catch (err: any) {
      console.error('[GET /api/dashboard]', err)
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  }
)
