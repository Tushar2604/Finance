'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ImportModal from '@/components/ImportModal'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { exportToCSV } from '@/lib/export'
import {
  CreditCard, Download, Upload, Search, X, Filter,
  CheckCircle2, AlertCircle, Clock, TrendingDown, Eye,
} from 'lucide-react'

const IMPORT_COLUMNS = [
  { key: 'invoiceNumber', label: 'Invoice #', required: true },
  { key: 'client', label: 'Client Name', required: true },
  { key: 'month', label: 'Month (YYYY-MM)', required: true },
  { key: 'dueDate', label: 'Due Date', required: true },
  { key: 'totalAmount', label: 'Total Amount', required: true },
  { key: 'paidAmount', label: 'Paid Amount' },
  { key: 'paidDate', label: 'Paid Date' },
  { key: 'paymentMode', label: 'Payment Mode (Bank/Cash/Cheque)' },
  { key: 'status', label: 'Status' },
]

const TEMPLATE_ROWS = [
  {
    invoiceNumber: 'INV-2024-00001', client: 'Acme Corp', month: '2024-11',
    dueDate: '2024-12-05', totalAmount: '46200', paidAmount: '46200',
    paidDate: '2024-12-03', paymentMode: 'Bank', status: 'Paid',
  },
]

type PayFilter = 'all' | 'paid' | 'outstanding' | 'overdue'

function usePaymentTracking(filters: { page: number; search: string; payFilter: PayFilter; month: string }) {
  return useQuery({
    queryKey: ['payment-tracking', filters],
    queryFn: async () => {
      const p = new URLSearchParams()
      p.append('page', filters.page.toString())
      p.append('limit', '20')
      if (filters.search) p.append('search', filters.search)
      if (filters.month) p.append('month', filters.month)
      if (filters.payFilter === 'paid') p.append('status', 'Paid')
      if (filters.payFilter === 'overdue') p.append('status', 'Overdue')
      if (filters.payFilter === 'outstanding') p.append('status', 'Sent,PartiallyPaid,Acknowledged,Overdue')
      const { data } = await apiClient.get<any>(`/invoices?${p}`)
      return data.data
    },
  })
}

function AgeBadge({ dueDate, status }: { dueDate: string; status: string }) {
  if (status === 'Paid') return <span className="text-emerald-600 text-xs font-semibold">Paid</span>
  if (status === 'Cancelled') return <span className="text-slate-400 text-xs">Cancelled</span>
  const days = differenceInDays(new Date(), new Date(dueDate))
  if (days < 0) return <span className="text-blue-600 text-xs font-semibold">Due in {Math.abs(days)}d</span>
  if (days === 0) return <span className="text-amber-600 text-xs font-bold">Due today</span>
  if (days <= 30) return <span className="text-amber-600 text-xs font-semibold">{days}d overdue</span>
  if (days <= 60) return <span className="text-orange-600 text-xs font-bold">{days}d overdue</span>
  return <span className="text-rose-600 text-xs font-bold">{days}d overdue</span>
}

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-5 border ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-60">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs mt-1 opacity-50">{sub}</p>}
        </div>
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}

export default function PaymentTrackingPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('')
  const [payFilter, setPayFilter] = useState<PayFilter>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const { data, isLoading, error, refetch } = usePaymentTracking({ page, search, payFilter, month })
  const invoices: any[] = data?.data ?? []
  const hasFilters = !!(search || month || payFilter !== 'all')

  const totalBilled = invoices.reduce((s: number, i: any) => s + (i.totalAmount ?? 0), 0)
  const totalPaid   = invoices.reduce((s: number, i: any) => s + (i.paidAmount ?? 0), 0)
  const totalOutstanding = totalBilled - totalPaid
  const overdueCount = invoices.filter((i: any) => i.status === 'Overdue').length

  const clearFilters = () => { setSearch(''); setMonth(''); setPayFilter('all'); setPage(1) }

  const handleExport = () => {
    const rows = invoices.map((i: any) => {
      const outstanding = Math.max(0, (i.totalAmount ?? 0) - (i.paidAmount ?? 0))
      const daysAge = i.dueDate ? differenceInDays(new Date(), new Date(i.dueDate)) : null
      return {
        'Invoice #':     i.invoiceNumber,
        'Client':        i.clientId?.name ?? '',
        'Month':         i.month,
        'Invoice Date':  i.invoiceDate ? format(new Date(i.invoiceDate), 'yyyy-MM-dd') : '',
        'Due Date':      i.dueDate ? format(new Date(i.dueDate), 'yyyy-MM-dd') : '',
        'Total Amount':  i.totalAmount ?? 0,
        'Paid Amount':   i.paidAmount ?? 0,
        'Outstanding':   outstanding,
        'Paid Date':     i.paidDate ? format(new Date(i.paidDate), 'yyyy-MM-dd') : '',
        'Days Overdue':  daysAge != null && daysAge > 0 ? daysAge : 0,
        'Status':        i.status,
      }
    })
    exportToCSV(rows, 'payment_tracking')
  }

  const PAY_FILTERS: { value: PayFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'outstanding', label: 'Outstanding' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'paid', label: 'Paid' },
  ]

  return (
    <div className="space-y-5 animate-in fade-in pb-10">
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="Payment Records"
        apiEndpoint="/invoices/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Tracking</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data?.pagination ? `${data.pagination.total} invoices` : 'Track collection status and overdue payments'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" className={`gap-2 ${hasFilters ? 'border-emerald-500 text-emerald-600' : ''}`} onClick={() => setShowFilters(v => !v)}>
            <Filter className="h-4 w-4" /> Filters{hasFilters ? ` (${[search, month, payFilter !== 'all' ? '1' : ''].filter(Boolean).length})` : ''}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={!invoices.length}><Download className="h-4 w-4" /> Export</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={CreditCard}   label="Total Billed"     value={`AED ${(totalBilled / 1000).toFixed(0)}K`}      color="bg-slate-700 text-white border-slate-800" />
        <KpiCard icon={CheckCircle2} label="Collected"         value={`AED ${(totalPaid / 1000).toFixed(0)}K`}        color="bg-emerald-600 text-white border-emerald-700" />
        <KpiCard icon={Clock}        label="Outstanding"       value={`AED ${(totalOutstanding / 1000).toFixed(0)}K`} color="bg-amber-500 text-white border-amber-600" />
        <KpiCard icon={AlertCircle}  label="Overdue Invoices"  value={String(overdueCount)} sub="on this page"        color="bg-rose-600 text-white border-rose-700" />
      </div>

      {/* Quick filter pills */}
      <div className="flex gap-2 flex-wrap">
        {PAY_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setPayFilter(f.value); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              payFilter === f.value
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Extended filter bar */}
      {showFilters && (
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Search Client / Invoice #</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Acme Corp or INV-…"
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
          <div className="min-w-[140px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Month</label>
            <input type="month" value={month} onChange={e => { setMonth(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="gap-1 text-slate-500" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <Card className="shadow-sm border-0 border-t-4 border-t-emerald-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-600" /> Payment Status</CardTitle>
          <CardDescription>Track which invoices are paid, outstanding, or overdue.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-6 text-rose-500 bg-rose-50 mx-6 mb-6 rounded-lg">Failed to load payment data.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Paid Date</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!invoices.length ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center h-32 text-muted-foreground">
                          <CreditCard className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No invoices found. {hasFilters ? 'Try adjusting filters.' : 'Import invoices to track payments.'}
                        </TableCell>
                      </TableRow>
                    ) : invoices.map((inv: any) => {
                      const outstanding = Math.max(0, (inv.totalAmount ?? 0) - (inv.paidAmount ?? 0))
                      const pctPaid = inv.totalAmount > 0 ? Math.round((inv.paidAmount / inv.totalAmount) * 100) : 0
                      return (
                        <TableRow key={inv._id} className={`hover:bg-slate-50 transition-colors ${inv.status === 'Overdue' ? 'bg-rose-50/40' : ''}`}>
                          <TableCell>
                            <Link href={`/invoices/${inv._id}`} className="font-mono font-semibold text-emerald-700 hover:underline text-sm">{inv.invoiceNumber}</Link>
                          </TableCell>
                          <TableCell className="font-medium">{inv.clientId?.name ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{inv.month}</TableCell>
                          <TableCell className={`text-sm ${inv.status === 'Overdue' ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}`}>
                            {inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy') : '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">AED {(inv.totalAmount ?? 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-emerald-600 font-medium text-sm">AED {(inv.paidAmount ?? 0).toLocaleString()}</span>
                              {pctPaid > 0 && pctPaid < 100 && (
                                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pctPaid}%` }} />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${outstanding > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {outstanding > 0 ? `AED ${outstanding.toLocaleString()}` : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {inv.paidDate ? format(new Date(inv.paidDate), 'dd MMM yyyy') : '—'}
                          </TableCell>
                          <TableCell>
                            <AgeBadge dueDate={inv.dueDate} status={inv.status} />
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                              inv.status === 'Overdue' ? 'bg-rose-100 text-rose-700' :
                              inv.status === 'PartiallyPaid' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{inv.status}</span>
                          </TableCell>
                          <TableCell>
                            <Link href={`/invoices/${inv._id}`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5" /></Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} invoices</p>
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
