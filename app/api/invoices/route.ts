import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { InvoiceCreateSchema } from '@/lib/validations/invoice'
import { getInvoices, createInvoice } from '@/lib/services/invoice.service'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(req.url)
      const result = await getInvoices({
        clientId: searchParams.get('clientId') ?? undefined,
        projectId: searchParams.get('projectId') ?? undefined,
        status: searchParams.get('status') ?? undefined,
        month: searchParams.get('month') ?? undefined,
        search: searchParams.get('search') ?? undefined,
        paidOnly: searchParams.get('paidOnly') === 'true',
        page: parseInt(searchParams.get('page') ?? '1', 10),
        limit: parseInt(searchParams.get('limit') ?? '20', 10),
      })
      return NextResponse.json(apiSuccess(result))
    } catch (err) {
      console.error('[GET /api/invoices]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  }
)

export const POST = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const body = await req.json()
      const parsed = InvoiceCreateSchema.safeParse(body)
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = []
          fieldErrors[field].push(issue.message)
        }
        return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
      }
      const invoice = await createInvoice(parsed.data, user.userId)
      return NextResponse.json(apiSuccess(invoice, 'Invoice created successfully'), { status: 201 })
    } catch (err) {
      console.error('[POST /api/invoices]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Finance', 'Admin']
)
