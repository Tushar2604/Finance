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
import { format } from 'date-fns'
import { exportToCSV } from '@/lib/export'
import {
  Percent, Download, Upload, Search, X, Filter,
  TrendingUp, DollarSign, FileText,
} from 'lucide-react'

const IMPORT_COLUMNS = [
  { key: 'invoiceNumber', label: 'Invoice #', required: true },
  { key: 'client', label: 'Client Name', required: true },
  { key: 'month', label: 'Month (YYYY-MM)', required: true },
  { key: 'invoiceDate', label: 'Invoice Date' },
  { key: 'subtotal', label: 'Subtotal (excl. VAT)', required: true },
  { key: 'vatRate', label: 'VAT Rate (%)' },
  { key: 'vatAmount', label: 'VAT Amount', required: true },
  { key: 'totalAmount', label: 'Total (incl. VAT)', required: true },
  { key: 'status', label: 'Status' },
]

const TEMPLATE_ROWS = [
  {
    invoiceNumber: 'INV-2024-00001', client: 'Acme Corp', month: '2024-11',
    invoiceDate: '2024-11-05', subtotal: '44000', vatRate: '5',
    vatAmount: '2200', totalAmount: '46200', status: 'Sent',
  },
]

const VAT_RATE = 5

function useVATInvoices(filters: { page: number; search: string; month: string; status: string }) {
  return useQuery({
    queryKey: ['vat-invoices', filters],
    queryFn: async () => {
      const p = new URLSearchParams()
      p.append('page', filters.page.toString())
      p.append('limit', '20')
      if (filters.search) p.append('search', filters.search)
      if (filters.month) p.append('month', filters.month)
      if (filters.status) p.append('status', filters.status)
      const { data } = await apiClient.get<any>(`/invoices?${p}`)
      return data.data
    },
  })
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

export default function VATPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const { data, isLoading, error, refetch } = useVATInvoices({ page, search, month, status })
  const invoices: any[] = data?.data ?? []
  const hasFilters = !!(search || month || status)

  const totalSubtotal = invoices.reduce((s: number, i: any) => s + (i.subtotal ?? 0), 0)
  const totalVAT = invoices.reduce((s: number, i: any) => s + (i.vatAmount ?? 0), 0)
  const totalGross = invoices.reduce((s: number, i: any) => s + (i.totalAmount ?? 0), 0)

  const clearFilters = () => { setSearch(''); setMonth(''); setStatus(''); setPage(1) }

  const handleExport = () => {
    const rows = invoices.map((i: any) => ({
      'Invoice #':      i.invoiceNumber,
      'Client':         i.clientId?.name ?? '',
      'Month':          i.month,
      'Invoice Date':   i.invoiceDate ? format(new Date(i.invoiceDate), 'yyyy-MM-dd') : '',
      'Subtotal (Ex.)': i.subtotal ?? 0,
      'VAT Rate (%)':   VAT_RATE,
      'VAT Amount':     i.vatAmount ?? 0,
      'Total (Inc.)':   i.totalAmount ?? 0,
      'Status':         i.status,
    }))
    exportToCSV(rows, 'vat_report')
  }

  return (
    <div className="space-y-5 animate-in fade-in pb-10">
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="VAT Invoices"
        apiEndpoint="/invoices/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">VAT</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Output VAT across all invoices — {VAT_RATE}% standard rate
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" className={`gap-2 ${hasFilters ? 'border-amber-500 text-amber-600' : ''}`} onClick={() => setShowFilters(v => !v)}>
            <Filter className="h-4 w-4" /> Filters{hasFilters ? ` (${[search, month, status].filter(Boolean).length})` : ''}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={!invoices.length}><Download className="h-4 w-4" /> Export</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard icon={FileText}  label="Net (Ex. VAT)" value={`AED ${(totalSubtotal / 1000).toFixed(1)}K`} color="bg-slate-700 text-white border-slate-800" />
        <KpiCard icon={Percent}   label="Output VAT"    value={`AED ${(totalVAT / 1000).toFixed(1)}K`}     sub={`${VAT_RATE}% of net`}  color="bg-amber-500 text-white border-amber-600" />
        <KpiCard icon={DollarSign} label="Gross Total"  value={`AED ${(totalGross / 1000).toFixed(1)}K`}   sub="incl. VAT"  color="bg-blue-600 text-white border-blue-700" />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Search Client / Invoice #</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Acme Corp or INV-…"
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
          <div className="min-w-[140px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Month</label>
            <input type="month" value={month} onChange={e => { setMonth(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
          <div className="min-w-[160px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Invoice Status</label>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30">
              <option value="">All</option>
              {['Draft','Generated','Sent','Acknowledged','PartiallyPaid','Paid','Overdue','Cancelled'].map(s => <option key={s}>{s}</option>)}
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
      <Card className="shadow-sm border-0 border-t-4 border-t-amber-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Percent className="h-4 w-4 text-amber-600" /> VAT Breakdown</CardTitle>
          <CardDescription>Output VAT per invoice — UAE standard rate {VAT_RATE}%</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-6 text-rose-500 bg-rose-50 mx-6 mb-6 rounded-lg">Failed to load VAT data.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead className="text-right">Net (Ex. VAT)</TableHead>
                      <TableHead className="text-right">VAT %</TableHead>
                      <TableHead className="text-right">VAT Amount</TableHead>
                      <TableHead className="text-right">Gross Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!invoices.length ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center h-32 text-muted-foreground">
                          <Percent className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No invoice data found. {hasFilters ? 'Try adjusting filters.' : 'Import invoices to see VAT breakdown.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {invoices.map((inv: any) => {
                          const vatPct = inv.subtotal > 0 ? ((inv.vatAmount / inv.subtotal) * 100).toFixed(1) : VAT_RATE.toFixed(1)
                          return (
                            <TableRow key={inv._id} className="hover:bg-slate-50 transition-colors">
                              <TableCell>
                                <Link href={`/invoices/${inv._id}`} className="font-mono font-semibold text-amber-600 hover:underline text-sm">{inv.invoiceNumber}</Link>
                              </TableCell>
                              <TableCell className="font-medium">{inv.clientId?.name ?? '—'}</TableCell>
                              <TableCell className="text-muted-foreground">{inv.month}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {inv.invoiceDate ? format(new Date(inv.invoiceDate), 'dd MMM yyyy') : '—'}
                              </TableCell>
                              <TableCell className="text-right">AED {(inv.subtotal ?? 0).toLocaleString()}</TableCell>
                              <TableCell className="text-right text-amber-600 font-semibold">{vatPct}%</TableCell>
                              <TableCell className="text-right font-semibold text-amber-700">AED {(inv.vatAmount ?? 0).toLocaleString()}</TableCell>
                              <TableCell className="text-right font-bold">AED {(inv.totalAmount ?? 0).toLocaleString()}</TableCell>
                              <TableCell>
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                  inv.status === 'Overdue' ? 'bg-rose-100 text-rose-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>{inv.status}</span>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {/* Totals footer */}
                        <TableRow className="bg-amber-50 font-bold border-t-2 border-amber-200">
                          <TableCell colSpan={4} className="text-amber-800">Page Total</TableCell>
                          <TableCell className="text-right text-amber-800">AED {totalSubtotal.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-amber-800">{VAT_RATE}%</TableCell>
                          <TableCell className="text-right text-amber-800">AED {totalVAT.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-amber-800">AED {totalGross.toLocaleString()}</TableCell>
                          <TableCell />
                        </TableRow>
                      </>
                    )}
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
