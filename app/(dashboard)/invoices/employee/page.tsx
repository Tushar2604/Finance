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
  Users, Download, Upload, Search, X, Filter,
  CheckCircle2, DollarSign, Eye, FileText, AlertCircle,
} from 'lucide-react'

const IMPORT_COLUMNS = [
  { key: 'invoiceNumber', label: 'Invoice #', required: true },
  { key: 'employeeEmail', label: 'Employee Email', required: true },
  { key: 'client', label: 'Client Name' },
  { key: 'month', label: 'Month (YYYY-MM)', required: true },
  { key: 'position', label: 'Position' },
  { key: 'billingType', label: 'Billing Type (Monthly/Daily/Hourly)' },
  { key: 'billingRate', label: 'Billing Rate' },
  { key: 'daysWorked', label: 'Days Worked' },
  { key: 'hoursWorked', label: 'Hours Worked' },
  { key: 'totalAmount', label: 'Total Amount' },
  { key: 'status', label: 'Status' },
]

const TEMPLATE_ROWS = [
  {
    invoiceNumber: 'EMP-INV-2024-001', employeeEmail: 'john@bimstaff.ae',
    client: 'Acme Corp', month: '2024-11', position: 'Senior Engineer',
    billingType: 'Monthly', billingRate: '18000', daysWorked: '22',
    hoursWorked: '176', totalAmount: '18000', status: 'Sent',
  },
]

const STATUS_META: Record<string, { label: string; cls: string }> = {
  Draft:         { label: 'Draft',     cls: 'bg-slate-100 text-slate-600' },
  Generated:     { label: 'Generated', cls: 'bg-indigo-100 text-indigo-700' },
  Sent:          { label: 'Sent',      cls: 'bg-blue-100 text-blue-700' },
  Acknowledged:  { label: 'Ack\'d',   cls: 'bg-cyan-100 text-cyan-700' },
  PartiallyPaid: { label: 'Partial',   cls: 'bg-amber-100 text-amber-700' },
  Paid:          { label: 'Paid',      cls: 'bg-emerald-100 text-emerald-700' },
  Overdue:       { label: 'Overdue',   cls: 'bg-rose-100 text-rose-700' },
  Cancelled:     { label: 'Cancelled', cls: 'bg-slate-100 text-slate-400' },
}

function useEmployeeInvoices(filters: { page: number; search: string; status: string; month: string }) {
  return useQuery({
    queryKey: ['employee-invoices', filters],
    queryFn: async () => {
      const p = new URLSearchParams()
      p.append('page', filters.page.toString())
      p.append('limit', '20')
      p.append('type', 'employee')
      if (filters.search) p.append('search', filters.search)
      if (filters.status) p.append('status', filters.status)
      if (filters.month) p.append('month', filters.month)
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

export default function EmployeeInvoicesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [month, setMonth] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const { data, isLoading, error, refetch } = useEmployeeInvoices({ page, search, status, month })
  const invoices: any[] = data?.data ?? []
  const hasFilters = !!(search || status || month)

  const totalBilled = invoices.reduce((s: number, i: any) => s + (i.totalAmount ?? 0), 0)
  const totalPaid   = invoices.reduce((s: number, i: any) => s + (i.paidAmount ?? 0), 0)
  const uniqueEmps  = new Set(invoices.map((i: any) => i.employeeId?._id ?? i.employeeId)).size

  const clearFilters = () => { setSearch(''); setStatus(''); setMonth(''); setPage(1) }

  const handleExport = () => {
    const rows = invoices.map((i: any) => ({
      'Invoice #':    i.invoiceNumber,
      'Employee':     i.employeeId?.name ?? '',
      'Client':       i.clientId?.name ?? '',
      'Month':        i.month,
      'Position':     i.lineItems?.[0]?.position ?? '',
      'Billing Type': i.lineItems?.[0]?.billingType ?? '',
      'Billing Rate': i.lineItems?.[0]?.billingRate ?? i.rate ?? '',
      'Days Worked':  i.lineItems?.[0]?.daysWorked ?? '',
      'Hours Worked': i.lineItems?.[0]?.hoursWorked ?? i.hours ?? '',
      'Total':        i.totalAmount ?? '',
      'Paid':         i.paidAmount ?? '',
      'Status':       i.status,
    }))
    exportToCSV(rows, 'employee_invoices')
  }

  return (
    <div className="space-y-5 animate-in fade-in pb-10">
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="Employee Invoices"
        apiEndpoint="/invoices/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data?.pagination ? `${data.pagination.total} invoices` : 'Invoices linked to deployed employees'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" className={`gap-2 ${hasFilters ? 'border-violet-500 text-violet-600' : ''}`} onClick={() => setShowFilters(v => !v)}>
            <Filter className="h-4 w-4" /> Filters{hasFilters ? ` (${[search, status, month].filter(Boolean).length})` : ''}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={!invoices.length}><Download className="h-4 w-4" /> Export</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard icon={FileText}    label="Total Billed"   value={`AED ${(totalBilled / 1000).toFixed(0)}K`} color="bg-violet-600 text-white border-violet-700" />
        <KpiCard icon={CheckCircle2} label="Collected"     value={`AED ${(totalPaid / 1000).toFixed(0)}K`}   color="bg-emerald-600 text-white border-emerald-700" />
        <KpiCard icon={Users}        label="Employees"     value={String(uniqueEmps)} sub="on this page"     color="bg-slate-700 text-white border-slate-800" />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Search Employee / Invoice #</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="John Smith or EMP-INV…"
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
          <div className="min-w-[140px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Month</label>
            <input type="month" value={month} onChange={e => { setMonth(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
          </div>
          <div className="min-w-[160px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30">
              <option value="">All Statuses</option>
              {Object.keys(STATUS_META).map(s => <option key={s}>{s}</option>)}
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
      <Card className="shadow-sm border-0 border-t-4 border-t-violet-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4 text-violet-600" /> Employee Invoice List</CardTitle>
          <CardDescription>Invoices associated with specific deployed employees.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-6 text-rose-500 bg-rose-50 mx-6 mb-6 rounded-lg">Failed to load invoices.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Billing</TableHead>
                      <TableHead className="text-right">Hours / Days</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!invoices.length ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center h-32 text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No employee invoices found. {hasFilters ? 'Try adjusting filters.' : 'Import a CSV to get started.'}
                        </TableCell>
                      </TableRow>
                    ) : invoices.map((inv: any) => {
                      const sm = STATUS_META[inv.status] ?? STATUS_META.Draft
                      const line = inv.lineItems?.[0]
                      return (
                        <TableRow key={inv._id} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            <Link href={`/invoices/${inv._id}`} className="font-mono font-semibold text-violet-600 hover:underline text-sm">{inv.invoiceNumber}</Link>
                          </TableCell>
                          <TableCell className="font-medium">{inv.employeeId?.name ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{inv.clientId?.name ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{inv.month}</TableCell>
                          <TableCell className="text-sm">{line?.position ?? '—'}</TableCell>
                          <TableCell className="text-sm">
                            <span className="font-medium">{line?.billingType ?? '—'}</span>
                            {line?.billingRate ? <span className="text-muted-foreground ml-1">@ AED {line.billingRate}</span> : null}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {line?.hoursWorked ? `${line.hoursWorked}h` : line?.daysWorked ? `${line.daysWorked}d` : `${inv.hours ?? '—'}h`}
                          </TableCell>
                          <TableCell className="text-right font-semibold">AED {(inv.totalAmount ?? 0).toLocaleString()}</TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${sm.cls}`}>{sm.label}</span>
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
