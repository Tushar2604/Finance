import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiError } from '@/lib/utils'
import { handleFinanceQuery } from '@/lib/ai/chat.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const POST = withAuth(
  async (req: NextRequest, _context: unknown, user: JWTPayload): Promise<NextResponse> => {
    try {
      const body = await req.json()
      const { query } = body

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return NextResponse.json(apiError('Query is required'), { status: 400 })
      }

      if (query.trim().length > 1000) {
        return NextResponse.json(apiError('Query too long (max 1000 characters)'), { status: 400 })
      }

      const result = await handleFinanceQuery(query.trim(), user.userId)
      return NextResponse.json({ success: true, data: result })
    } catch (err) {
      console.error('[POST /api/ai/chat]', err)
      return NextResponse.json(apiError('Failed to process query'), { status: 500 })
    }
  }
)
