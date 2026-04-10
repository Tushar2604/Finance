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
import { format, differenceInDays } from 'date-fns'
import { exportToCSV } from '@/lib/export'
import {
  FileText, Download, Upload, Search, X, Filter,
  Plus, DollarSign, CheckCircle2, AlertTriangle, RefreshCw,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────── */
interface Client {
  _id: string
  name: string
  industry?: string
  contractType?: string
}

interface Contract {
  _id: string
  contractNumber: string
  clientId?: Client
  startDate?: string
  endDate?: string
  renewalDate?: string
  contractValue?: number
  currency?: string
  scope?: string
  status?: string
  notes?: string
}

/* ─── Import / template ──────────────────────────────────────── */
const IMPORT_COLUMNS = [
  { key: 'contractNumber', label: 'Contract #', required: true },
  { key: 'client',         label: 'Client Name', required: true },
  { key: 'startDate',      label: 'Start Date (YYYY-MM-DD)', required: true },
  { key: 'endDate',        label: 'End Date (YYYY-MM-DD)', required: true },
  { key: 'renewalDate',    label: 'Renewal Date (YYYY-MM-DD)' },
  { key: 'contractValue',  label: 'Contract Value', required: true },
  { key: 'currency',       label: 'Currency' },
  { key: 'scope',          label: 'Scope / Description' },
  { key: 'status',         label: 'Status' },
  { key: 'notes',          label: 'Notes' },
]

const TEMPLATE_ROWS = [
  {
    contractNumber: 'CTR-2024-00001', client: 'Acme Corp',
    startDate: '2024-01-01', endDate: '2024-12-31', renewalDate: '2024-11-01',
    contractValue: '120000', currency: 'AED', scope: 'IT staffing services',
    status: 'Active', notes: '',
  },
]

/* ─── Status config ──────────────────────────────────────────── */
const STATUS_STYLES: Record<string, string> = {
  Active:    'bg-emerald-100 text-emerald-700',
  Expired:   'bg-slate-100 text-slate-600',
  Renewed:   'bg-blue-100 text-blue-700',
  Terminated:'bg-rose-100 text-rose-700',
  Draft:     'bg-amber-100 text-amber-700',
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
          {sub && <p className="text-xs mt-1 opacity-50">{sub}</p>}
        </div>
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}

/* ─── Expiry badge ───────────────────────────────────────────── */
function ExpiryBadge({ endDate }: { endDate?: string }) {
  if (!endDate) return <span className="text-muted-foreground text-xs">—</span>
  const days = differenceInDays(new Date(endDate), new Date())
  if (days < 0) return <span className="text-xs font-semibold text-rose-600">Expired</span>
  if (days <= 30) return <span className="text-xs font-semibold text-amber-600">Exp. in {days}d</span>
  return <span className="text-xs text-slate-500">{format(new Date(endDate), 'dd MMM yyyy')}</span>
}

/* ─── Create Contract Modal ──────────────────────────────────── */
function CreateContractModal({ open, onClose, clients, onSuccess }: {
  open: boolean; onClose: () => void; clients: Client[]; onSuccess: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    contractNumber: '', clientId: '', startDate: '', endDate: '',
    renewalDate: '', contractValue: '', currency: 'AED',
    scope: '', status: 'Active', notes: '',
  })

  const mutation = useMutation({
    mutationFn: (payload: typeof form) => apiClient.post('/clients/contracts', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); onSuccess(); onClose() },
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">New Contract</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Contract Number *</label>
            <input value={form.contractNumber} onChange={set('contractNumber')} placeholder="CTR-2024-00001"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Client *</label>
            <select value={form.clientId} onChange={set('clientId')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">Select client…</option>
              {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Start Date *</label>
            <input type="date" value={form.startDate} onChange={set('startDate')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">End Date *</label>
            <input type="date" value={form.endDate} onChange={set('endDate')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Renewal Date</label>
            <input type="date" value={form.renewalDate} onChange={set('renewalDate')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Contract Value *</label>
            <input type="number" value={form.contractValue} onChange={set('contractValue')} placeholder="120000"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Currency</label>
            <select value={form.currency} onChange={set('currency')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              {['AED','USD','EUR','GBP'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
            <select value={form.status} onChange={set('status')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              {['Draft','Active','Renewed','Expired','Terminated'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Scope / Description</label>
            <textarea value={form.scope} onChange={set('scope')} rows={2} placeholder="Service scope…"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Internal notes…"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !form.contractNumber || !form.clientId || !form.startDate || !form.endDate}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {mutation.isPending ? 'Saving…' : 'Create Contract'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function ContractPage() {
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [status, setStatus]         = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  /* contracts list */
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contracts', { page, search, status }],
    queryFn: async () => {
      const p = new URLSearchParams()
      p.append('page', page.toString())
      p.append('limit', '20')
      p.append('contractType', 'Contract')
      if (search) p.append('search', search)
      if (status) p.append('status', status)
      const { data } = await apiClient.get<any>(`/clients?${p}`)
      return data.data
    },
  })

  /* client list for modal */
  const { data: clientsData } = useQuery({
    queryKey: ['clients-all-contract'],
    queryFn: async () => {
      const { data } = await apiClient.get<any>('/clients?limit=500&contractType=Contract')
      return (data.data?.data ?? []) as Client[]
    },
  })

  const contracts: Client[] = data?.data ?? []
  const clients: Client[]   = clientsData ?? []
  const hasFilters = !!(search || status)

  // KPIs computed from page data
  const total     = data?.pagination?.total ?? contracts.length
  const active    = contracts.filter(c => (c as any).status === 'Active').length
  const expiring  = contracts.filter(c => {
    const end = (c as any).endDate
    if (!end) return false
    const d = differenceInDays(new Date(end), new Date())
    return d >= 0 && d <= 30
  }).length
  const totalValue = contracts.reduce((s, c) => s + ((c as any).contractValue ?? 0), 0)

  const clearFilters = () => { setSearch(''); setStatus(''); setPage(1) }

  const handleExport = () => {
    const rows = contracts.map((c: any, idx) => ({
      'S No.':           idx + 1,
      'Contract #':      c.contractNumber ?? c.name ?? '—',
      'Client Name':     c.name ?? c.clientId?.name ?? '—',
      'Industry':        c.industry ?? '—',
      'Start Date':      c.startDate ? format(new Date(c.startDate), 'yyyy-MM-dd') : '—',
      'End Date':        c.endDate   ? format(new Date(c.endDate),   'yyyy-MM-dd') : '—',
      'Renewal Date':    c.renewalDate ? format(new Date(c.renewalDate), 'yyyy-MM-dd') : '—',
      'Contract Value':  c.contractValue ?? 0,
      'Currency':        c.currency ?? 'AED',
      'Scope':           c.scope ?? '—',
      'Status':          c.status ?? '—',
    }))
    exportToCSV(rows, 'contracts_export')
  }

  return (
    <div className="space-y-5 animate-in fade-in pb-10">
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="Contracts"
        apiEndpoint="/clients/contracts/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />
      <CreateContractModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        clients={clients}
        onSuccess={() => refetch()}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contracts</h1>
          <p className="text-muted-foreground text-sm mt-1">Service contracts with clients</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm"
            className={`gap-2 ${hasFilters ? 'border-blue-500 text-blue-600' : ''}`}
            onClick={() => setShowFilters(v => !v)}>
            <Filter className="h-4 w-4" />
            Filters{hasFilters ? ` (${[search, status].filter(Boolean).length})` : ''}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={!contracts.length}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Contract
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard icon={FileText}     label="Total Contracts" value={String(total)}   color="bg-slate-700 text-white border-slate-800" />
        <KpiCard icon={CheckCircle2} label="Active"          value={String(active)}  color="bg-blue-600 text-white border-blue-700" />
        <KpiCard icon={AlertTriangle} label="Expiring Soon"  value={String(expiring)} sub="within 30 days" color="bg-amber-500 text-white border-amber-600" />
        <KpiCard icon={DollarSign}   label="Total Value"     value={`AED ${(totalValue / 1000).toFixed(1)}K`} color="bg-emerald-600 text-white border-emerald-700" />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Search Client / Contract #</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Acme Corp or CTR-…"
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="min-w-[160px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">All</option>
              {['Draft','Active','Renewed','Expired','Terminated'].map(s => <option key={s}>{s}</option>)}
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
      <Card className="shadow-sm border-0 border-t-4 border-t-blue-600">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" /> Contract List
          </CardTitle>
          <CardDescription>All client service contracts — scroll right to see all columns</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-6 text-rose-500 bg-rose-50 mx-6 mb-6 rounded-lg">Failed to load contracts.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-12 text-center">S No.</TableHead>
                      <TableHead>Contract #</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Renewal Date</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!contracts.length ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center h-32 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No contracts found. {hasFilters ? 'Try adjusting filters.' : 'Import or create a contract to get started.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      contracts.map((c: any, idx) => (
                        <TableRow key={c._id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="text-center text-sm text-muted-foreground">{(page - 1) * 20 + idx + 1}</TableCell>
                          <TableCell>
                            <span className="font-mono font-semibold text-blue-600 text-sm">
                              {c.contractNumber ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{c.name ?? '—'}</div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.industry ?? '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.startDate ? format(new Date(c.startDate), 'dd MMM yyyy') : '—'}
                          </TableCell>
                          <TableCell>
                            <ExpiryBadge endDate={c.endDate} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.renewalDate ? format(new Date(c.renewalDate), 'dd MMM yyyy') : '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            {c.contractValue != null
                              ? `${c.currency ?? 'AED'} ${Number(c.contractValue).toLocaleString()}`
                              : '—'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={c.scope}>
                            {c.scope ?? '—'}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[c.status] ?? 'bg-slate-100 text-slate-600'}`}>
                              {c.status ?? 'Draft'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Link href={`/clients/${c._id}`}
                              className="text-xs text-blue-600 hover:underline font-medium">
                              View
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} contracts
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
