import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { generateFinancialInsights } from '@/lib/ai/insights.service'
import { apiSuccess, apiError } from '@/lib/utils'
import type { JWTPayload } from '@/lib/auth/jwt'

export const POST = withAuth(
  async (req: NextRequest, _ctx: any, user: JWTPayload): Promise<NextResponse> => {
    try {
      const body = await req.json().catch(() => ({}))
      const month = body.month as string | undefined

      const result = await generateFinancialInsights(month, user.userId)

      return NextResponse.json(apiSuccess(result))
    } catch (err: any) {
      console.error('[POST /api/ai/generate-insights]', err)
      // Return a graceful degradation if AI is unavailable
      if (err?.message?.includes('API key') || err?.message?.includes('openai') || err?.status === 401) {
        return NextResponse.json(apiError('AI service not configured. Set OPENAI_API_KEY in environment.'), { status: 503 })
      }
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance', 'Manager']
)
