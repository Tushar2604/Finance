import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { ClientCreateSchema } from '@/lib/validations/client'
import { getClients, createClient } from '@/lib/services/client.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(req.url)
      const search = searchParams.get('search') ?? undefined
      const isActiveParam = searchParams.get('isActive')
      const isActive = isActiveParam === null ? undefined : isActiveParam === 'true'
      const page = parseInt(searchParams.get('page') ?? '1', 10)
      const limit = parseInt(searchParams.get('limit') ?? '20', 10)

      const result = await getClients({ search, isActive, page, limit })
      return NextResponse.json(apiSuccess(result))
    } catch (err) {
      console.error('[GET /api/clients]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  }
)

export const POST = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const body = await req.json()
      const parsed = ClientCreateSchema.safeParse(body)

      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = []
          fieldErrors[field].push(issue.message)
        }
        return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
      }

      const client = await createClient(parsed.data, user.userId)
      return NextResponse.json(apiSuccess(client, 'Client created successfully'), { status: 201 })
    } catch (err) {
      console.error('[POST /api/clients]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance']
)
