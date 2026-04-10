'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { exportToCSV } from '@/lib/export'
import {
  CreditCard, Download, Search, X, Filter, CheckCircle2,
  Clock, AlertTriangle, DollarSign, Building2,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────── */
interface Client { _id: string; name: string }

/* ─── Helpers ────────────────────────────────────────────────── */
function fmt(n: number) {
  return `AED ${n.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`
}

function DueBadge({ dueDate, outstanding }: { dueDate?: string; outstanding: number }) {
  if (!dueDate || outstanding <= 0) return <span className="text-xs text-muted-foreground">—</span>
  const days = differenceInDays(new Date(dueDate), new Date())
  if (days < 0) return (
    <div>
      <span className="text-xs font-semibold text-rose-600">{Math.abs(days)}d overdue</span>
      <p className="text-[11px] text-rose-400">{format(new Date(dueDate), 'dd MMM yyyy')}</p>
    </div>
  )
  if (days <= 7) return (
    <div>
      <span className="text-xs font-semibold text-amber-600">Due in {days}d</span>
      <p className="text-[11px] text-amber-400">{format(new Date(dueDate), 'dd MMM yyyy')}</p>
    </div>
  )
  return (
    <div>
      <span className="text-xs text-slate-500">Due {format(new Date(dueDate), 'dd MMM yyyy')}</span>
    </div>
  )
}

/* ─── KPI card ───────────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className={`rounded-xl p-5 border ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-60">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
        </div>
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function ClientPaymentsPage() {
  const [page, setPage]               = useState(1)
  const [search, setSearch]           = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const hasFilters = !!(search || clientFilter || statusFilter)

  /* Invoices with any payment activity or outstanding balance */
  const { data, isLoading, error } = useQuery({
    queryKey: ['client-payments', { page, search, clientFilter, statusFilter }],
    queryFn: async () => {
      const p = new URLSearchParams()
      p.append('page', page.toString())
      p.append('limit', '25')
      if (search) p.append('search', search)
      if (clientFilter) p.append('clientId', clientFilter)
      if (statusFilter) p.append('status', statusFilter)
      const { data } = await apiClient.get<any>(`/invoices?${p}`)
      return data.data
    },
  })

  /* Clients for filter dropdown */
  const { data: clientsData } = useQuery({
    queryKey: ['clients-for-payment-filter'],
    queryFn: async () => {
      const { data } = await apiClient.get<any>('/clients?limit=500')
      return (data.data?.data ?? []) as Client[]
    },
  })

  const invoices: any[] = data?.data ?? []
  const clients: Client[] = clientsData ?? []

  /* KPI aggregates */
  const totalReceived  = invoices.reduce((s, i) => s + (i.paidAmount ?? 0), 0)
  const totalDue       = invoices.reduce((s, i) => s + Math.max(0, (i.totalAmount ?? 0) - (i.paidAmount ?? 0)), 0)
  const overdueCount   = invoices.filter(i => {
    const outstanding = (i.totalAmount ?? 0) - (i.paidAmount ?? 0)
    return outstanding > 0 && i.dueDate && new Date(i.dueDate) < new Date()
  }).length
  const paidCount = invoices.filter(i => i.status === 'Paid').length

  const clearFilters = () => { setSearch(''); setClientFilter(''); setStatusFilter(''); setPage(1) }

  const handleExport = () => {
    const rows = invoices.map((inv: any, idx) => ({
      'Payment ID':     `PAY-${inv.invoiceNumber}`,
      'Client Name':    inv.clientId?.name ?? '—',
      'Invoice #':      inv.invoiceNumber,
      'Amount Received': inv.paidAmount ?? 0,
      'Payment Date':   inv.paidDate ? format(new Date(inv.paidDate), 'yyyy-MM-dd') : '—',
      'Payment Mode':   inv.bankTransactionId?.paymentChannel ?? '—',
      'Bank Reference': inv.bankTransactionId?.reference ?? '—',
      'Due Amount':     Math.max(0, (inv.totalAmount ?? 0) - (inv.paidAmount ?? 0)),
      'Due Date':       inv.dueDate ? format(new Date(inv.dueDate), 'yyyy-MM-dd') : '—',
      'Invoice Total':  inv.totalAmount ?? 0,
      'Status':         inv.status,
    }))
    exportToCSV(rows, 'client_payment_history')
  }

  return (
    <div className="space-y-5 animate-in fade-in pb-10">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment History</h1>
          <p className="text-muted-foreground text-sm mt-1">Client payment tracking — received amounts, bank references & outstanding balances</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm"
            className={`gap-2 ${hasFilters ? 'border-teal-500 text-teal-600' : ''}`}
            onClick={() => setShowFilters(v => !v)}>
            <Filter className="h-4 w-4" />
            Filters{hasFilters ? ` (${[search, clientFilter, statusFilter].filter(Boolean).length})` : ''}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={!invoices.length}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard icon={CreditCard}    label="Total Received"  value={fmt(totalReceived)}  color="bg-emerald-600 text-white border-emerald-700" />
        <KpiCard icon={DollarSign}    label="Total Due"       value={fmt(totalDue)}        sub="outstanding balance" color={totalDue > 0 ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-200 text-slate-700 border-slate-300'} />
        <KpiCard icon={AlertTriangle} label="Overdue"         value={String(overdueCount)} sub="invoices past due date" color={overdueCount > 0 ? 'bg-rose-600 text-white border-rose-700' : 'bg-slate-200 text-slate-700 border-slate-300'} />
        <KpiCard icon={CheckCircle2}  label="Fully Paid"      value={String(paidCount)}    sub={`of ${invoices.length} on this page`} color="bg-blue-600 text-white border-blue-700" />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Search Invoice #</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="INV-2024-…"
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
          <div className="min-w-[200px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Client</label>
            <select value={clientFilter} onChange={e => { setClientFilter(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30">
              <option value="">All Clients</option>
              {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="min-w-[180px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Payment Status</label>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30">
              <option value="">All Statuses</option>
              {['Draft','Generated','Sent','Acknowledged','PartiallyPaid','Paid','Overdue','Cancelled'].map(s =>
                <option key={s}>{s}</option>
              )}
            </select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="gap-1 text-slate-500" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <Card className="shadow-sm border-0 border-t-4 border-t-teal-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-teal-600" /> Client Payment Records
          </CardTitle>
          <CardDescription>All invoice payments — received amounts, bank references and outstanding dues</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : error ? (
            <div className="p-6 text-rose-500 bg-rose-50 mx-6 mb-6 rounded-lg">Failed to load payment records.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="text-right">Amount Received</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Bank Reference</TableHead>
                      <TableHead className="text-right">Due Amount</TableHead>
                      <TableHead>Due Date / Timeframe</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!invoices.length ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center h-32 text-muted-foreground">
                          <CreditCard className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No payment records found. {hasFilters ? 'Try adjusting filters.' : ''}
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((inv: any) => {
                        const outstanding   = Math.max(0, (inv.totalAmount ?? 0) - (inv.paidAmount ?? 0))
                        const paymentMode   = inv.bankTransactionId?.paymentChannel || '—'
                        const bankRef       = inv.bankTransactionId?.reference || '—'
                        const isOverdue     = outstanding > 0 && inv.dueDate && new Date(inv.dueDate) < new Date()

                        const statusStyles: Record<string, string> = {
                          Paid:          'bg-emerald-100 text-emerald-700',
                          PartiallyPaid: 'bg-blue-100 text-blue-700',
                          Overdue:       'bg-rose-100 text-rose-700',
                          Sent:          'bg-slate-100 text-slate-600',
                          Acknowledged:  'bg-violet-100 text-violet-700',
                          Draft:         'bg-slate-50 text-slate-400',
                        }

                        return (
                          <TableRow key={inv._id} className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-rose-50/40' : ''}`}>
                            <TableCell>
                              <span className="font-mono text-xs font-semibold text-teal-700">
                                PAY-{inv.invoiceNumber}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="font-medium text-sm">{inv.clientId?.name ?? '—'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link href={`/invoices/${inv._id}`} className="font-mono text-xs font-semibold text-blue-600 hover:underline">
                                {inv.invoiceNumber}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right">
                              {(inv.paidAmount ?? 0) > 0 ? (
                                <span className="font-semibold text-emerald-700">{fmt(inv.paidAmount)}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {inv.paidDate ? (
                                <div>
                                  <p>{format(new Date(inv.paidDate), 'dd MMM yyyy')}</p>
                                </div>
                              ) : (
                                <span className="text-slate-400">Not paid</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {paymentMode !== '—' ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                  {paymentMode}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground max-w-[140px] truncate" title={bankRef}>
                              {bankRef}
                            </TableCell>
                            <TableCell className="text-right">
                              {outstanding > 0 ? (
                                <span className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-amber-600'}`}>
                                  {fmt(outstanding)}
                                </span>
                              ) : (
                                <span className="text-emerald-600 text-sm">✓ Settled</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <DueBadge dueDate={inv.dueDate} outstanding={outstanding} />
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyles[inv.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                {inv.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Summary footer */}
              {invoices.length > 0 && (
                <div className="flex flex-wrap items-center gap-6 px-6 py-4 border-t bg-slate-50 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-muted-foreground">Total Received:</span>
                    <span className="font-bold text-emerald-700">{fmt(totalReceived)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-muted-foreground">Total Outstanding:</span>
                    <span className="font-bold text-amber-700">{fmt(totalDue)}</span>
                  </div>
                  {overdueCount > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                      <span className="font-bold text-rose-700">{overdueCount} overdue</span>
                    </div>
                  )}
                </div>
              )}

              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} records
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
