import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { getAlerts, markAlertRead, resolveAlert } from '@/lib/services/alert.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(req.url)
      const isReadParam = searchParams.get('isRead')
      const isRead = isReadParam === null ? undefined : isReadParam === 'true'
      
      const isResolvedParam = searchParams.get('isResolved')
      const isResolved = isResolvedParam === null ? undefined : isResolvedParam === 'true'
      
      const severity = searchParams.get('severity') as any
      const type = searchParams.get('type') ?? undefined
      const page = parseInt(searchParams.get('page') ?? '1', 10)
      const limit = parseInt(searchParams.get('limit') ?? '20', 10)

      const result = await getAlerts({ isRead, isResolved, severity, type, page, limit })
      return NextResponse.json(apiSuccess(result))
    } catch (err: any) {
      console.error('[GET /api/alerts]', err)
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  }
)
