import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { ClientUpdateSchema } from '@/lib/validations/client'
import { getClientById, updateClient, deleteClient } from '@/lib/services/client.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (_req: NextRequest, context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { id } = context.params
      const client = await getClientById(id)
      return NextResponse.json(apiSuccess(client))
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number }
      if (error.statusCode === 404) {
        return NextResponse.json(apiError(error.message), { status: 404 })
      }
      if (error.statusCode === 400) {
        return NextResponse.json(apiError(error.message), { status: 400 })
      }
      console.error('[GET /api/clients/[id]]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  }
)

export const PUT = withAuth(
  async (req: NextRequest, context: { params: Record<string, string> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const { id } = context.params
      const body = await req.json()
      const parsed = ClientUpdateSchema.safeParse(body)

      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = []
          fieldErrors[field].push(issue.message)
        }
        return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
      }

      const client = await updateClient(id, parsed.data, user.userId)
      return NextResponse.json(apiSuccess(client, 'Client updated successfully'))
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number }
      if (error.statusCode === 404) {
        return NextResponse.json(apiError(error.message), { status: 404 })
      }
      if (error.statusCode === 400) {
        return NextResponse.json(apiError(error.message), { status: 400 })
      }
      console.error('[PUT /api/clients/[id]]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance']
)

export const DELETE = withAuth(
  async (_req: NextRequest, context: { params: Record<string, string> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const { id } = context.params
      await deleteClient(id, user.userId)
      return NextResponse.json(apiSuccess(null, 'Client deactivated successfully'))
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number }
      if (error.statusCode === 404) {
        return NextResponse.json(apiError(error.message), { status: 404 })
      }
      if (error.statusCode === 400) {
        return NextResponse.json(apiError(error.message), { status: 400 })
      }
      console.error('[DELETE /api/clients/[id]]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin']
)
