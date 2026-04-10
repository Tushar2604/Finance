import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { connectDB, Invoice, Expense } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/utils'
import type { JWTPayload } from '@/lib/auth/jwt'

export const POST = withAuth(
  async (req: NextRequest, _ctx: any, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await connectDB()
      const body = await req.json()
      const { periodFrom, periodTo } = body

      if (!periodFrom || !periodTo) {
        return NextResponse.json(apiError('periodFrom and periodTo are required (YYYY-MM-DD)'), { status: 422 })
      }

      const from = new Date(periodFrom)
      const to = new Date(periodTo)

      const [outputInvoices, inputExpenses] = await Promise.all([
        Invoice.find({
          invoiceDate: { $gte: from, $lte: to },
          status: { $nin: ['Draft', 'Cancelled'] },
        })
          .select('invoiceNumber totalAmount vatAmount clientId invoiceDate status')
          .populate('clientId', 'name')
          .lean(),
        Expense.find({
          date: { $gte: from, $lte: to },
          status: { $in: ['Approved', 'Paid'] },
        })
          .select('description amount category date')
          .lean(),
      ])

      const outputVAT = outputInvoices.reduce((sum, inv) => sum + (inv.vatAmount ?? 0), 0)
      // Expenses may not have vatAmount; default to 5% of amount if vatApplicable is set, else 0
      const inputVAT = inputExpenses.reduce((sum, exp) => {
        const vatAmt = (exp as any).vatAmount ?? 0
        return sum + vatAmt
      }, 0)
      const vatPayable = Math.max(0, outputVAT - inputVAT)

      return NextResponse.json(
        apiSuccess({
          periodFrom,
          periodTo,
          outputVAT: parseFloat(outputVAT.toFixed(2)),
          inputVAT: parseFloat(inputVAT.toFixed(2)),
          vatPayable: parseFloat(vatPayable.toFixed(2)),
          outputInvoices: { count: outputInvoices.length, totalAmount: outputInvoices.reduce((s, i) => s + i.totalAmount, 0), vatAmount: outputVAT },
          inputExpenses: { count: inputExpenses.length, totalAmount: inputExpenses.reduce((s, e) => s + e.amount, 0), vatAmount: inputVAT },
          breakdown: { standardRated: outputVAT, zeroRated: 0, exempt: 0 },
          invoices: outputInvoices,
          expenses: inputExpenses,
        })
      )
    } catch (err) {
      console.error('[POST /api/vat/compute]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance']
)
