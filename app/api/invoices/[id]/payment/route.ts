import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { recordPayment } from '@/lib/services/invoice.service'
import type { JWTPayload } from '@/lib/auth/jwt'
import { z } from 'zod'

const PaymentSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be positive'),
  paymentDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .optional()
    .default(() => new Date()),
})

export const POST = withAuth(
  async (req: NextRequest, context: { params: Record<string, string> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      const body = await req.json()
      const parsed = PaymentSchema.safeParse(body)
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = []
          fieldErrors[field].push(issue.message)
        }
        return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
      }
      const { amount, paymentDate } = parsed.data
      const invoice = await recordPayment(context.params.id, amount, paymentDate, user.userId)
      return NextResponse.json(apiSuccess(invoice, 'Payment recorded successfully'))
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number }
      if (error.statusCode === 404) return NextResponse.json(apiError(error.message), { status: 404 })
      if (error.statusCode === 400) return NextResponse.json(apiError(error.message), { status: 400 })
      console.error('[POST /api/invoices/[id]/payment]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Finance', 'Admin']
)
