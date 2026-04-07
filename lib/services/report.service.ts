import dbConnect from '@/lib/db/connection'
import Invoice from '@/lib/db/models/Invoice'
import mongoose from 'mongoose'

export interface VatReportItem {
  invoiceId: string
  invoiceNumber: string
  clientId: string
  clientName: string
  issuedDate: Date
  subtotal: number
  vatAmount: number
  totalAmount: number
  status: string
}

export interface VatReport {
  period: string
  items: VatReportItem[]
  totalVat: number
  totalRevenue: number
}

export async function generateVatReport(startDate: Date, endDate: Date): Promise<VatReport> {
  await dbConnect()

  const invoices = await Invoice.find({
    issuedDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['Paid', 'PartiallyPaid', 'Sent', 'Overdue'] }
  })
    .populate('clientId', 'name')
    .sort({ issuedDate: 1 })
    .lean() as any[]

  let totalVat = 0
  let totalRevenue = 0

  const items = invoices.map(inv => {
    totalVat += inv.vatAmount
    totalRevenue += inv.subtotal
    return {
      invoiceId: inv._id.toString(),
      invoiceNumber: inv.invoiceNumber,
      clientId: inv.clientId._id.toString(),
      clientName: inv.clientId.name,
      issuedDate: inv.issuedDate,
      subtotal: inv.subtotal,
      vatAmount: inv.vatAmount,
      totalAmount: inv.totalAmount,
      status: inv.status
    }
  })

  return {
    period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    items,
    totalVat,
    totalRevenue
  }
}
