import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { resolveAlert } from '@/lib/services/alert.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const PATCH = withAuth(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const { id } = await params
      const result = await resolveAlert(id, user.userId)
      return NextResponse.json(apiSuccess(result, 'Alert resolved'))
    } catch (err: any) {
      console.error('[PATCH /api/alerts/[id]/resolve]', err)
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  }
)
