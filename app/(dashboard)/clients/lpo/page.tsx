'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  FileText, Download, Upload, Search, X, Filter, Plus,
  CheckCircle2, Clock, AlertCircle, DollarSign, Building2,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LPORecord {
  _id?: string
  lpoNumber: string
  clientId?: { _id: string; name: string } | null
  clientName: string
  lpoDate: string
  expiryDate: string
  totalValue: number
  currency: string
  scope: string
  status: 'Active' | 'Expired' | 'Cancelled' | 'Pending'
  notes: string
}

const STATUSES = ['Active', 'Expired', 'Cancelled', 'Pending'] as const

const STATUS_META: Record<string, { cls: string }> = {
  Active:    { cls: 'bg-emerald-100 text-emerald-700' },
  Expired:   { cls: 'bg-slate-100 text-slate-500' },
  Cancelled: { cls: 'bg-rose-100 text-rose-600' },
  Pending:   { cls: 'bg-amber-100 text-amber-700' },
}

// ─── Import / Export config ────────────────────────────────────────────────────

const IMPORT_COLUMNS = [
  { key: 'lpoNumber',   label: 'LPO Number',   required: true },
  { key: 'clientName',  label: 'Client Name',   required: true },
  { key: 'lpoDate',     label: 'LPO Date (YYYY-MM-DD)',    required: true },
  { key: 'expiryDate',  label: 'Expiry Date (YYYY-MM-DD)' },
  { key: 'totalValue',  label: 'Total Value' },
  { key: 'currency',    label: 'Currency' },
  { key: 'scope',       label: 'Scope / Description' },
  { key: 'status',      label: 'Status (Active/Expired/Cancelled/Pending)' },
  { key: 'notes',       label: 'Notes' },
]

const TEMPLATE_ROWS = [
  {
    lpoNumber: 'LPO-2024-001', clientName: 'Acme Corp',
    lpoDate: '2024-01-15', expiryDate: '2024-12-31',
    totalValue: '500000', currency: 'AED',
    scope: 'Staffing services for Q1-Q4 2024',
    status: 'Active', notes: '',
  },
]

// ─── Hooks ─────────────────────────────────────────────────────────────────────

// LPOs are stored as clients with contractType='LPO' — we fetch from /clients
// and also maintain a local lpo collection if the API supports it.
// For now we fetch clients filtered by contractType=LPO as the data source.
function useLPOs(filters: { page: number; search: string; status: string }) {
  return useQuery({
    queryKey: ['lpos', filters],
    queryFn: async () => {
      const p = new URLSearchParams()
      p.append('page', filters.page.toString())
      p.append('limit', '20')
      p.append('contractType', 'LPO')
      if (filters.search) p.append('search', filters.search)
      // status filter applied client-side since API may not support it
      const { data } = await apiClient.get<any>(`/clients?${p}`)
      return data.data
    },
  })
}

// ─── Create LPO Modal ─────────────────────────────────────────────────────────

function CreateLPOModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<Partial<LPORecord>>({
    currency: 'AED', status: 'Active',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof LPORecord, v: string | number) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.lpoNumber || !form.clientName || !form.lpoDate) {
      setError('LPO Number, Client Name and LPO Date are required.')
      return
    }
    setSaving(true)
    try {
      // Create as a client record with contractType=LPO
      await apiClient.post('/clients', {
        name: form.clientName,
        contractType: 'LPO',
        lpoNumber: form.lpoNumber,
        lpoDate: form.lpoDate,
        lpoExpiryDate: form.expiryDate,
        lpoValue: form.totalValue,
        notes: form.notes,
        isActive: form.status === 'Active',
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create LPO.')
    } finally {
      setSaving(false)
    }
  }

  const field = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-slate-800">Create LPO</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-rose-600 text-sm bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500 mb-1 block">LPO Number *</label>
              <input className={field} placeholder="LPO-2024-001" value={form.lpoNumber ?? ''} onChange={e => set('lpoNumber', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Client Name *</label>
              <input className={field} placeholder="Acme Corporation" value={form.clientName ?? ''} onChange={e => set('clientName', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">LPO Date *</label>
              <input type="date" className={field} value={form.lpoDate ?? ''} onChange={e => set('lpoDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Expiry Date</label>
              <input type="date" className={field} value={form.expiryDate ?? ''} onChange={e => set('expiryDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Total Value</label>
              <input type="number" className={field} placeholder="500000" value={form.totalValue ?? ''} onChange={e => set('totalValue', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Currency</label>
              <select className={field} value={form.currency ?? 'AED'} onChange={e => set('currency', e.target.value)}>
                <option>AED</option><option>USD</option><option>EUR</option><option>GBP</option><option>SAR</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Scope / Description</label>
              <textarea className={`${field} resize-none`} rows={2} placeholder="Staffing services for Q1–Q4 2024…" value={form.scope ?? ''} onChange={e => set('scope', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
              <select className={field} value={form.status ?? 'Active'} onChange={e => set('status', e.target.value as any)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Notes</label>
              <input className={field} placeholder="Optional notes" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={saving}>
              {saving ? 'Saving…' : 'Create LPO'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LPOPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, error, refetch } = useLPOs({ page, search, status })

  // Filter by status client-side
  const allClients: any[] = data?.data ?? []
  const clients = status
    ? allClients.filter((c: any) => (status === 'Active' ? c.isActive : !c.isActive))
    : allClients

  const hasFilters = !!(search || status)
  const totalValue = clients.reduce((s: number, c: any) => s + (c.lpoValue ?? c.rateCard ?? 0), 0)
  const activeCount = clients.filter((c: any) => c.isActive).length

  const clearFilters = () => { setSearch(''); setStatus(''); setPage(1) }

  const handleExport = () => {
    const rows = clients.map((c: any, i: number) => ({
      'S No.':        i + 1,
      'LPO Number':   c.lpoNumber ?? c.name,
      'Client Name':  c.name,
      'LPO Date':     c.lpoDate ? format(new Date(c.lpoDate), 'yyyy-MM-dd') : '',
      'Expiry Date':  c.lpoExpiryDate ? format(new Date(c.lpoExpiryDate), 'yyyy-MM-dd') : '',
      'Total Value':  c.lpoValue ?? c.rateCard ?? '',
      'Currency':     'AED',
      'Scope':        c.notes ?? '',
      'Status':       c.isActive ? 'Active' : 'Expired',
    }))
    exportToCSV(rows, 'lpo_list')
  }

  return (
    <div className="space-y-5 animate-in fade-in pb-10">
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="LPOs"
        apiEndpoint="/clients/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />
      {createOpen && (
        <CreateLPOModal onClose={() => setCreateOpen(false)} onSuccess={() => { refetch(); queryClient.invalidateQueries({ queryKey: ['lpos'] }) }} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LPO</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data?.pagination ? `${data.pagination.total} LPOs` : 'Local Purchase Orders from clients'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" className={`gap-2 ${hasFilters ? 'border-blue-500 text-blue-600' : ''}`} onClick={() => setShowFilters(v => !v)}>
            <Filter className="h-4 w-4" /> Filters{hasFilters ? ` (${[search, status].filter(Boolean).length})` : ''}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={!clients.length}><Download className="h-4 w-4" /> Export</Button>
          <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New LPO
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={FileText}    label="Total LPOs"   value={String(clients.length)}            color="bg-blue-600 text-white border-blue-700" />
        <KpiCard icon={CheckCircle2} label="Active"      value={String(activeCount)}               color="bg-emerald-600 text-white border-emerald-700" />
        <KpiCard icon={Clock}        label="Expiring"    value={String(clients.length - activeCount)} sub="inactive / expired" color="bg-amber-500 text-white border-amber-600" />
        <KpiCard icon={DollarSign}   label="Total Value" value={totalValue ? `AED ${(totalValue / 1000).toFixed(0)}K` : '—'} color="bg-slate-700 text-white border-slate-800" />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Search Client / LPO #</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Acme Corp or LPO-2024…"
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
          <div className="min-w-[150px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired / Inactive</option>
            </select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="gap-1 text-slate-500" onClick={clearFilters}><X className="h-3.5 w-3.5" /> Clear</Button>
          )}
        </div>
      )}

      {/* Table */}
      <Card className="shadow-sm border-0 border-t-4 border-t-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /> LPO Register</CardTitle>
          <CardDescription>All Local Purchase Orders received from clients. Click a client name to view full profile.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-6 text-rose-500 bg-rose-50 mx-6 mb-6 rounded-lg">Failed to load LPOs.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-12 text-center">S No.</TableHead>
                      <TableHead>LPO / Client Name</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Contract Type</TableHead>
                      <TableHead>Billing</TableHead>
                      <TableHead>Credit Terms</TableHead>
                      <TableHead>Rate Card</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!clients.length ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center h-32 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No LPO clients found. {hasFilters ? 'Try adjusting filters.' : 'Click "New LPO" or import a CSV.'}
                        </TableCell>
                      </TableRow>
                    ) : clients.map((c: any, i: number) => (
                      <TableRow key={c._id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="text-center text-xs text-slate-400 font-mono">{(page - 1) * 20 + i + 1}</TableCell>
                        <TableCell>
                          <Link href={`/clients/${c._id}`} className="font-semibold text-blue-600 hover:underline">{c.name}</Link>
                          {c.companyDetails?.email && <p className="text-xs text-slate-400 mt-0.5">{c.companyDetails.email}</p>}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{c.industry ?? '—'}</TableCell>
                        <TableCell>
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">LPO</span>
                        </TableCell>
                        <TableCell className="text-sm">{c.billingType ?? '—'}</TableCell>
                        <TableCell className="text-sm">{c.creditTerms ? `${c.creditTerms} days` : '—'}</TableCell>
                        <TableCell className="font-semibold text-sm">{c.rateCard ? `AED ${c.rateCard}/hr` : '—'}</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.isActive ? STATUS_META.Active.cls : STATUS_META.Expired.cls}`}>
                            {c.isActive ? 'Active' : 'Expired'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link href={`/clients/${c._id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} LPOs</p>
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
