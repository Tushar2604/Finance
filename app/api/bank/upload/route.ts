import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { uploadBankStatement } from '@/lib/services/bank.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const POST = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const batchName = formData.get('batchName') as string | undefined

      if (!file) {
        return NextResponse.json(apiError('No file uploaded'), { status: 400 })
      }

      // Convert Web API File to Node Buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const result = await uploadBankStatement(buffer, file.name, user.userId, batchName)

      return NextResponse.json(apiSuccess(result, 'File uploaded and parsed successfully'), { status: 201 })
    } catch (err: any) {
      console.error('[POST /api/bank/upload]', err)
      return NextResponse.json(apiError(err.message || 'Internal server error'), { status: err.statusCode || 500 })
    }
  },
  ['Admin', 'Finance']
)
