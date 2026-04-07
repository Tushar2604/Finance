import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { generateVatReport } from '@/lib/services/report.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(req.url)
      const startParam = searchParams.get('startDate')
      const endParam = searchParams.get('endDate')

      if (!startParam || !endParam) {
         return NextResponse.json(apiError('startDate and endDate are required'), { status: 400 })
      }

      const startDate = new Date(startParam)
      const endDate = new Date(endParam)

      const result = await generateVatReport(startDate, endDate)
      return NextResponse.json(apiSuccess(result))
    } catch (err: any) {
      console.error('[GET /api/reports/vat]', err)
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  },
  ['Admin', 'Finance']
)
