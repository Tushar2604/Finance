'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import {
  FileText, Search, Plus, Download, Upload, Eye, X,
  Printer, CheckCircle2, Clock, AlertCircle, Ban, Send,
  Building2, MapPin, Phone, Mail,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'

const IMPORT_COLUMNS = [
  { key: 'invoiceNumber', label: 'Invoice #', required: true },
  { key: 'client', label: 'Client Name' },
  { key: 'month', label: 'Month (YYYY-MM)' },
  { key: 'invoiceDate', label: 'Invoice Date' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'rate', label: 'Rate' },
  { key: 'hours', label: 'Hours' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'vatAmount', label: 'VAT Amount' },
  { key: 'totalAmount', label: 'Total Amount' },
  { key: 'paidAmount', label: 'Paid Amount' },
  { key: 'status', label: 'Status' },
]

const TEMPLATE_ROWS = [
  { invoiceNumber: 'INV-2024-00001', client: 'Acme Corp', month: '2024-11', invoiceDate: '2024-11-05', dueDate: '2024-12-05', rate: '250', hours: '176', subtotal: '44000', vatAmount: '2200', totalAmount: '46200', paidAmount: '0', status: 'Sent' },
]

function useInvoices(filters: { page: number; search?: string }) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', filters.page.toString())
      params.append('limit', '20')
      if (filters.search) params.append('search', filters.search)
      const { data } = await apiClient.get<any>(`/invoices?${params}`)
      return data.data
    },
  })
}

function useInvoiceDetail(id: string | null) {
  return useQuery({
    queryKey: ['invoice-preview', id],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/invoices/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

const statusMeta: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  Paid:          { label: 'PAID',           color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200',  icon: <CheckCircle2 className="h-4 w-4" /> },
  PartiallyPaid: { label: 'PARTIALLY PAID', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',      icon: <Clock className="h-4 w-4" /> },
  Sent:          { label: 'SENT',           color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',        icon: <Send className="h-4 w-4" /> },
  Draft:         { label: 'DRAFT',          color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200',      icon: <FileText className="h-4 w-4" /> },
  Overdue:       { label: 'OVERDUE',        color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200',        icon: <AlertCircle className="h-4 w-4" /> },
  Cancelled:     { label: 'CANCELLED',      color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200',      icon: <Ban className="h-4 w-4" /> },
}

function InvoicePreviewModal({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { data: inv, isLoading } = useInvoiceDetail(invoiceId)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>${inv?.invoiceNumber ?? 'Invoice'}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: white; padding: 40px; }
            .print-content { max-width: 800px; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            th { background: #f8fafc; font-weight: 600; color: #475569; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .text-slate { color: #64748b; }
            .total-row td { font-weight: 700; font-size: 15px; border-top: 2px solid #1e293b; background: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="print-content">${content.innerHTML}</div>
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  const outstanding = Math.max(0, (inv?.totalAmount ?? 0) - (inv?.paidAmount ?? 0))
  const sm = statusMeta[inv?.status] ?? statusMeta.Draft

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-slate-800">
              {isLoading ? 'Loading…' : inv?.invoiceNumber}
            </span>
            {inv?.status && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${sm.bg} ${sm.color}`}>
                {sm.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint} disabled={isLoading}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Link href={`/invoices/${invoiceId}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="h-4 w-4" /> Full Details
              </Button>
            </Link>
            <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-700 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice document */}
        <div className="overflow-y-auto flex-1 p-8">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <div ref={printRef} className="space-y-8">
              {/* Company header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">BIM STAFFING</div>
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    <div className="flex items-center gap-1.5"><Building2 className="h-3 w-3" /> BIM Staffing LLC, Dubai, UAE</div>
                    <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Office 1204, Tower A, Business Bay, Dubai</div>
                    <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> +971 4 123 4567</div>
                    <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> finance@bimstaffing.ae</div>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">TRN: 100234567800003</div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-emerald-600 tracking-wider">INVOICE</div>
                  <div className="font-mono font-bold text-slate-700 mt-1">{inv?.invoiceNumber}</div>
                  <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full border text-xs font-bold ${sm.bg} ${sm.color}`}>
                    {sm.icon} {sm.label}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-emerald-400 to-teal-500" />

              {/* Bill To + Dates */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Bill To</div>
                  <div className="font-bold text-slate-900 text-base">{inv?.clientId?.name ?? '—'}</div>
                  {inv?.clientId?.email && (
                    <div className="text-sm text-slate-500 mt-0.5">{inv.clientId.email}</div>
                  )}
                  {inv?.clientId?.address && (
                    <div className="text-sm text-slate-500 mt-0.5">{inv.clientId.address}</div>
                  )}
                  {inv?.projectId && (
                    <div className="text-sm text-slate-500 mt-2">
                      <span className="font-medium text-slate-700">Project:</span> {inv.projectId.name}
                    </div>
                  )}
                  {inv?.employeeId && (
                    <div className="text-sm text-slate-500 mt-0.5">
                      <span className="font-medium text-slate-700">Employee:</span> {inv.employeeId.name}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Invoice Date</span>
                    <span className="font-semibold">{inv?.invoiceDate ? format(new Date(inv.invoiceDate), 'dd MMM yyyy') : '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Due Date</span>
                    <span className={`font-semibold ${inv?.status === 'Overdue' ? 'text-rose-600' : ''}`}>
                      {inv?.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy') : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Service Month</span>
                    <span className="font-semibold">{inv?.month ?? '—'}</span>
                  </div>
                  {inv?.paidDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Payment Date</span>
                      <span className="font-semibold text-emerald-600">{format(new Date(inv.paidDate), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Line items */}
              <div>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="text-left px-4 py-3 rounded-tl-lg font-semibold">Description</th>
                      <th className="text-right px-4 py-3 font-semibold">Hours</th>
                      <th className="text-right px-4 py-3 font-semibold">Rate (AED/hr)</th>
                      <th className="text-right px-4 py-3 rounded-tr-lg font-semibold">Amount (AED)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 text-slate-700">
                        Professional Staffing Services
                        {inv?.month && <span className="text-slate-400 text-xs ml-1">({inv.month})</span>}
                        {inv?.employeeId?.name && (
                          <div className="text-xs text-slate-400 mt-0.5">{inv.employeeId.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{inv?.hours ?? 0}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{inv?.rate?.toLocaleString() ?? 0}</td>
                      <td className="px-4 py-3 text-right font-semibold">{inv?.subtotal?.toLocaleString() ?? 0}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Totals */}
                <div className="mt-4 flex justify-end">
                  <div className="w-72 space-y-2">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Subtotal</span>
                      <span>AED {inv?.subtotal?.toLocaleString() ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>VAT (5%)</span>
                      <span>AED {inv?.vatAmount?.toLocaleString() ?? 0}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2 text-slate-900">
                      <span>Total Amount</span>
                      <span>AED {inv?.totalAmount?.toLocaleString() ?? 0}</span>
                    </div>
                    {(inv?.paidAmount ?? 0) > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-emerald-600">
                          <span>Amount Paid</span>
                          <span>AED {inv?.paidAmount?.toLocaleString()}</span>
                        </div>
                        <div className={`flex justify-between font-bold text-sm border-t pt-2 ${outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          <span>Balance Due</span>
                          <span>AED {outstanding.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment status banner */}
              {inv?.status === 'Paid' && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-emerald-800">Payment Received</div>
                    <div className="text-sm text-emerald-600">
                      AED {inv?.paidAmount?.toLocaleString()} received
                      {inv?.paidDate ? ` on ${format(new Date(inv.paidDate), 'dd MMM yyyy')}` : ''}
                    </div>
                  </div>
                </div>
              )}
              {inv?.status === 'Overdue' && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <AlertCircle className="h-6 w-6 text-rose-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-rose-800">Payment Overdue</div>
                    <div className="text-sm text-rose-600">AED {outstanding.toLocaleString()} is past the due date.</div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {inv?.notes && (
                <div className="border rounded-xl p-4 bg-slate-50">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Notes</div>
                  <p className="text-sm text-slate-700">{inv.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-xs text-slate-400 pt-4 border-t">
                Thank you for your business. For queries, contact finance@bimstaffing.ae
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const statusVariant = (s: string) => {
  if (s === 'Paid') return 'default'
  if (s === 'Overdue') return 'destructive'
  return 'secondary'
}

export default function InvoicesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const { data, isLoading, error, refetch } = useInvoices({ page, search })

  const handleExport = () => {
    const rows = (data?.data ?? []).map((inv: any) => ({
      invoiceNumber: inv.invoiceNumber,
      client: inv.clientId?.name ?? '',
      month: inv.month ?? '',
      invoiceDate: inv.invoiceDate ? format(new Date(inv.invoiceDate), 'yyyy-MM-dd') : '',
      dueDate: inv.dueDate ? format(new Date(inv.dueDate), 'yyyy-MM-dd') : '',
      rate: inv.rate ?? '',
      hours: inv.hours ?? '',
      subtotal: inv.subtotal ?? '',
      vatAmount: inv.vatAmount ?? '',
      totalAmount: inv.totalAmount ?? '',
      paidAmount: inv.paidAmount ?? '',
      status: inv.status,
    }))
    exportToCSV(rows, 'invoices')
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="Invoices"
        apiEndpoint="/invoices/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      {previewId && (
        <InvoicePreviewModal invoiceId={previewId} onClose={() => setPreviewId(null)} />
      )}

      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground mt-1">Track all client invoices and payment status.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!data?.data?.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button className="shadow-md gap-2"><Plus className="h-4 w-4" /> Create Invoice</Button>
        </div>
      </div>

      <Card className="shadow-sm border-0 border-t-4 border-t-emerald-500">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Invoice Register</CardTitle>
              <CardDescription>All invoices generated from approved timesheets. Click the eye icon to preview.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search invoices..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-4 text-red-500 bg-red-50 rounded-lg">Failed to load invoices.</div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>VAT</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center h-32 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No invoices found. Import a CSV or run <code className="text-xs bg-slate-100 px-1 rounded">npm run seed</code>.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.data?.map((inv: any) => (
                        <TableRow key={inv._id} className="hover:bg-slate-50 transition-colors text-sm group">
                          <TableCell className="font-mono font-semibold text-blue-600">
                            <Link href={`/invoices/${inv._id}`} className="hover:underline">{inv.invoiceNumber}</Link>
                          </TableCell>
                          <TableCell>{inv.clientId?.name ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{inv.invoiceDate ? format(new Date(inv.invoiceDate), 'MMM dd, yyyy') : '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{inv.dueDate ? format(new Date(inv.dueDate), 'MMM dd, yyyy') : '—'}</TableCell>
                          <TableCell className="font-semibold">AED {inv.totalAmount?.toLocaleString()}</TableCell>
                          <TableCell className="text-emerald-600">AED {inv.paidAmount?.toLocaleString()}</TableCell>
                          <TableCell className="text-muted-foreground">AED {inv.vatAmount?.toLocaleString()}</TableCell>
                          <TableCell><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></TableCell>
                          <TableCell>
                            <button
                              onClick={() => setPreviewId(inv._id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-700"
                              title="Preview invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} invoices
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={!data.pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={!data.pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
