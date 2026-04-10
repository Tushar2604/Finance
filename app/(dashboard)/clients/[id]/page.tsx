'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft, Mail, Phone, MapPin, Globe, ExternalLink,
  Building2, FileText, Users, FolderKanban, DollarSign,
  AlertCircle, Receipt, CreditCard, Plus, X, Clock,
  CheckCircle2, Ban, Edit2, FileCheck, TrendingUp, TrendingDown,
  Zap, BarChart3, Wallet, ShieldAlert, CalendarClock, UserX, Trash2, Pencil
} from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'

// ─── Data hooks ───────────────────────────────────────────────────────────────

import ClientFormModal from '@/components/clients/ClientFormModal'
import { useMutation } from '@tanstack/react-query'

function DeleteConfirm({ name, onConfirm, onCancel, loading }: { name: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white border text-center rounded-2xl p-6 max-w-sm w-full shadow-2xl mx-4">
        <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
          <Trash2 className="w-6 h-6 text-rose-600" />
        </div>
        <h3 className="text-slate-900 font-bold text-lg">Delete Client</h3>
        <p className="text-slate-500 text-sm mt-2">
          Are you sure you want to delete <span className="font-semibold text-slate-800">{name}</span>? This cannot be undone.
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => { const { data } = await apiClient.get<any>(`/clients/${id}`); return data.data },
    enabled: !!id,
  })
}
function useClientSummary(id: string) {
  return useQuery({
    queryKey: ['client-summary', id],
    queryFn: async () => { const { data } = await apiClient.get<any>(`/clients/${id}/summary`); return data.data },
    enabled: !!id,
  })
}
function useClientEmployees(id: string) {
  return useQuery({
    queryKey: ['client-employees', id],
    queryFn: async () => { const { data } = await apiClient.get<any>(`/employees?clientId=${id}&limit=50`); return data.data?.data ?? [] },
    enabled: !!id,
  })
}
function useClientInvoices(id: string) {
  return useQuery({
    queryKey: ['client-invoices', id],
    queryFn: async () => { const { data } = await apiClient.get<any>(`/invoices?clientId=${id}&limit=20`); return data.data?.data ?? [] },
    enabled: !!id,
  })
}
function useClientLPOs(id: string) {
  return useQuery({
    queryKey: ['client-lpos', id],
    queryFn: async () => { const { data } = await apiClient.get<any>(`/clients/${id}/lpo`); return data.data ?? [] },
    enabled: !!id,
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className={`font-medium text-sm text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}

function KPICard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── LPO Form ─────────────────────────────────────────────────────────────────

const EMPTY_POSITION = {
  position: '', discipline: '', quantity: 1, rateType: 'Monthly' as const,
  monthlyRate: 0, dailyRate: 0, hourlyRate: 0, fixedRate: 0,
  duration: 1, overtimeRateType: 'None' as const, overtimeRate: 0,
  workstationRequired: false, softwareRequired: false,
}

function LPOFormModal({ clientId, onClose, onSuccess }: {
  clientId: string; onClose: () => void; onSuccess: () => void
}) {
  const [form, setForm] = useState({
    lpoNumber: '', title: '', validityStart: '', validityEnd: '',
    paymentTerms: 30, vatApplicablePct: 5, totalPOAmountExclVAT: 0,
    billingRules: '', overtimeRules: '', licenseDetails: '',
    status: 'Active', notes: '',
  })
  const [positions, setPositions] = useState([{ ...EMPTY_POSITION }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const vatAmt = Math.round(form.totalPOAmountExclVAT * form.vatApplicablePct) / 100
  const inclVAT = form.totalPOAmountExclVAT + vatAmt

  const addPosition = () => setPositions(p => [...p, { ...EMPTY_POSITION }])
  const removePosition = (i: number) => setPositions(p => p.filter((_, idx) => idx !== i))
  const updatePosition = (i: number, key: string, val: any) =>
    setPositions(p => p.map((pos, idx) => idx === i ? { ...pos, [key]: val } : pos))

  const handleSubmit = async () => {
    if (!form.lpoNumber || !form.validityStart || !form.validityEnd) {
      setError('LPO Number, Validity Start and End are required.'); return
    }
    setSaving(true); setError('')
    try {
      await apiClient.post(`/clients/${clientId}/lpo`, { ...form, positions })
      onSuccess()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to save LPO')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-blue-600" />
            <h2 className="font-bold text-slate-800">New LPO / Purchase Order</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {/* Basic Info */}
          <section>
            <h3 className="text-sm font-bold text-orange-500 uppercase tracking-wide mb-3 border-b pb-2">LPO Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-slate-600">LPO Number *</label>
                <Input className="mt-1" value={form.lpoNumber} onChange={e => setForm(f => ({ ...f, lpoNumber: e.target.value }))} placeholder="LPO-2024-0001" /></div>
              <div><label className="text-xs font-medium text-slate-600">Title</label>
                <Input className="mt-1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="IT Staffing Services" /></div>
              <div><label className="text-xs font-medium text-slate-600">Validity Start *</label>
                <Input type="date" className="mt-1" value={form.validityStart} onChange={e => setForm(f => ({ ...f, validityStart: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-slate-600">Validity End *</label>
                <Input type="date" className="mt-1" value={form.validityEnd} onChange={e => setForm(f => ({ ...f, validityEnd: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-slate-600">Status</label>
                <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {['Active', 'Draft', 'Expired', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-slate-600">Payment Terms (days)</label>
                <Input type="number" className="mt-1" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: Number(e.target.value) }))} /></div>
            </div>
          </section>

          {/* Deal Info */}
          <section>
            <h3 className="text-sm font-bold text-orange-500 uppercase tracking-wide mb-3 border-b pb-2">Deal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-slate-600">Total PO Amount (excl. VAT) *</label>
                <Input type="number" className="mt-1" value={form.totalPOAmountExclVAT || ''} onChange={e => setForm(f => ({ ...f, totalPOAmountExclVAT: Number(e.target.value) }))} /></div>
              <div><label className="text-xs font-medium text-slate-600">VAT Applicable %</label>
                <Input type="number" className="mt-1" value={form.vatApplicablePct} onChange={e => setForm(f => ({ ...f, vatApplicablePct: Number(e.target.value) }))} /></div>
              <div><label className="text-xs font-medium text-slate-600">VAT Amount</label>
                <div className="mt-1 px-3 py-2 bg-slate-50 border rounded-md text-sm font-semibold">AED {vatAmt.toLocaleString()}</div></div>
              <div><label className="text-xs font-medium text-slate-600">Total PO Amount (incl. VAT)</label>
                <div className="mt-1 px-3 py-2 bg-slate-50 border rounded-md text-sm font-semibold text-emerald-600">AED {inclVAT.toLocaleString()}</div></div>
            </div>
          </section>

          {/* Individual Positions */}
          <section>
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h3 className="text-sm font-bold text-orange-500 uppercase tracking-wide">Individual Positions</h3>
              <Button size="sm" variant="outline" className="gap-1" onClick={addPosition}><Plus className="h-3.5 w-3.5" /> Add Row</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    {['Position', 'Discipline', 'Qty', 'Rate Type', 'Monthly Rate', 'Daily Rate', 'Hourly Rate', 'Duration(mo)', 'OT Type', 'OT Rate', 'WS Req', ''].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-semibold text-slate-600 border border-slate-200 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-1 border border-slate-100"><Input className="h-7 text-xs min-w-[90px]" value={pos.position} onChange={e => updatePosition(i, 'position', e.target.value)} placeholder="Engineer" /></td>
                      <td className="p-1 border border-slate-100"><Input className="h-7 text-xs min-w-[80px]" value={pos.discipline} onChange={e => updatePosition(i, 'discipline', e.target.value)} placeholder="IT" /></td>
                      <td className="p-1 border border-slate-100"><Input type="number" className="h-7 text-xs w-14" value={pos.quantity} onChange={e => updatePosition(i, 'quantity', Number(e.target.value))} /></td>
                      <td className="p-1 border border-slate-100">
                        <select className="h-7 border rounded px-1 text-xs" value={pos.rateType} onChange={e => updatePosition(i, 'rateType', e.target.value)}>
                          {['Monthly', 'Daily', 'Hourly'].map(r => <option key={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="p-1 border border-slate-100"><Input type="number" className="h-7 text-xs w-20" value={pos.monthlyRate || ''} onChange={e => updatePosition(i, 'monthlyRate', Number(e.target.value))} /></td>
                      <td className="p-1 border border-slate-100"><Input type="number" className="h-7 text-xs w-20" value={pos.dailyRate || ''} onChange={e => updatePosition(i, 'dailyRate', Number(e.target.value))} /></td>
                      <td className="p-1 border border-slate-100"><Input type="number" className="h-7 text-xs w-20" value={pos.hourlyRate || ''} onChange={e => updatePosition(i, 'hourlyRate', Number(e.target.value))} /></td>
                      <td className="p-1 border border-slate-100"><Input type="number" className="h-7 text-xs w-14" value={pos.duration} onChange={e => updatePosition(i, 'duration', Number(e.target.value))} /></td>
                      <td className="p-1 border border-slate-100">
                        <select className="h-7 border rounded px-1 text-xs" value={pos.overtimeRateType} onChange={e => updatePosition(i, 'overtimeRateType', e.target.value)}>
                          {['None', 'Fixed', 'Multiplier'].map(r => <option key={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="p-1 border border-slate-100"><Input type="number" className="h-7 text-xs w-16" value={pos.overtimeRate || ''} onChange={e => updatePosition(i, 'overtimeRate', Number(e.target.value))} /></td>
                      <td className="p-1 border border-slate-100 text-center">
                        <input type="checkbox" checked={pos.workstationRequired} onChange={e => updatePosition(i, 'workstationRequired', e.target.checked)} />
                      </td>
                      <td className="p-1 border border-slate-100">
                        {positions.length > 1 && (
                          <button onClick={() => removePosition(i)} className="text-rose-400 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Rules & Documents */}
          <section>
            <h3 className="text-sm font-bold text-orange-500 uppercase tracking-wide mb-3 border-b pb-2">Billing Rules & License</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600">Billing Rules</label>
                <textarea className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none h-20"
                  value={form.billingRules} onChange={e => setForm(f => ({ ...f, billingRules: e.target.value }))}
                  placeholder="e.g. Invoice on 1st of every month, Net 30..." />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Overtime Rules</label>
                <textarea className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none h-20"
                  value={form.overtimeRules} onChange={e => setForm(f => ({ ...f, overtimeRules: e.target.value }))}
                  placeholder="e.g. OT > 48hr/week at 1.5x..." />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600">License Details</label>
                <textarea className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none h-16"
                  value={form.licenseDetails} onChange={e => setForm(f => ({ ...f, licenseDetails: e.target.value }))}
                  placeholder="Software / workstation license allocations..." />
              </div>
            </div>
          </section>

          {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? 'Saving…' : 'Create LPO'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── LPO Status badge ─────────────────────────────────────────────────────────
function LPOStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { icon: React.ReactNode; cls: string }> = {
    Active:    { icon: <CheckCircle2 className="h-3 w-3" />, cls: 'bg-emerald-100 text-emerald-700' },
    Expired:   { icon: <Clock className="h-3 w-3" />,        cls: 'bg-slate-100 text-slate-600' },
    Draft:     { icon: <Edit2 className="h-3 w-3" />,        cls: 'bg-amber-100 text-amber-700' },
    Cancelled: { icon: <Ban className="h-3 w-3" />,          cls: 'bg-rose-100 text-rose-700' },
  }
  const { icon, cls } = cfg[status] ?? cfg.Draft
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {icon}{status}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [lpoOpen, setLpoOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteConf, setDeleteConf] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      router.push('/clients')
    }
  })

  const { data: client, isLoading: loadingClient } = useClient(id)
  const { data: summary, isLoading: loadingSummary } = useClientSummary(id)
  const { data: employees } = useClientEmployees(id)
  const { data: invoices } = useClientInvoices(id)
  const { data: lpos } = useClientLPOs(id)

  const isLoading = loadingClient || loadingSummary

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in pb-10">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-600">Client not found.</div>
      </div>
    )
  }

  const initials = client.name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() ?? '??'
  const rawWebsite = client.website?.trim() ?? ''
  const websiteHref = rawWebsite && !rawWebsite.startsWith('http') ? `https://${rawWebsite}` : rawWebsite
  const websiteDisplay = rawWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const statusVariant = (s: string) => s === 'Paid' ? 'default' as const : s === 'Overdue' ? 'destructive' as const : 'secondary' as const

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {editOpen && (
        <ClientFormModal
          client={client}
          onClose={() => setEditOpen(false)}
          onSuccess={() => { setEditOpen(false); qc.invalidateQueries({ queryKey: ['client', id] }); qc.invalidateQueries({ queryKey: ['clients'] }) }}
        />
      )}
      {deleteConf && (
        <DeleteConfirm
          name={client.name}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setDeleteConf(false)}
          loading={deleteMutation.isPending}
        />
      )}
      {lpoOpen && (
        <LPOFormModal
          clientId={id}
          onClose={() => setLpoOpen(false)}
          onSuccess={() => { setLpoOpen(false); qc.invalidateQueries({ queryKey: ['client-lpos', id] }) }}
        />
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-2">
            <Pencil className="h-3.5 w-3.5" /> Edit Client
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteConf(true)} className="gap-2 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Header */}
      <Card className="shadow-sm border overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-blue-700 text-xl font-bold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
                <Badge variant={client.isActive ? 'default' : 'secondary'}>{client.isActive ? 'Active' : 'Inactive'}</Badge>
                {client.contractType && client.contractType !== 'None' && <Badge variant="outline">{client.contractType}</Badge>}
              </div>
              {client.industry && <p className="text-muted-foreground mt-0.5">{client.industry}</p>}
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-muted-foreground">
                {client.companyDetails?.email && (
                  <a href={`mailto:${client.companyDetails.email}`} className="flex items-center gap-1.5 hover:text-blue-600">
                    <Mail className="h-3.5 w-3.5" />{client.companyDetails.email}
                  </a>
                )}
                {client.companyDetails?.phone && (
                  <a href={`tel:${client.companyDetails.phone}`} className="flex items-center gap-1.5 hover:text-blue-600">
                    <Phone className="h-3.5 w-3.5" />{client.companyDetails.phone}
                  </a>
                )}
                {client.companyDetails?.address && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{client.companyDetails.address}</span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right space-y-2">
              {websiteDisplay && (
                <a href={websiteHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium">
                  <Globe className="h-3.5 w-3.5" />{websiteDisplay}<ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              )}
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Rate: <span className="font-semibold text-slate-700">AED {client.rateCard}/hr</span></div>
                <div>Billing: <span className="font-semibold text-slate-700">{client.billingType}</span></div>
                <div>Credit: <span className="font-semibold text-slate-700">{client.creditTerms} days</span></div>
              </div>
              {client.companyDetails?.taxNumber && (
                <div className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">TRN: {client.companyDetails.taxNumber}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Total Revenue" value={`AED ${(summary?.totalRevenue ?? 0).toLocaleString()}`} sub="All invoiced" icon={DollarSign} color="bg-emerald-500" />
        <KPICard label="Active Employees" value={String(summary?.totalEmployees ?? 0)} sub="Assigned" icon={Users} color="bg-blue-500" />
        <KPICard label="Active Projects" value={String(summary?.activeProjects ?? 0)} sub="Running" icon={FolderKanban} color="bg-violet-500" />
        <KPICard label="Outstanding" value={`AED ${(summary?.unpaidAmount ?? 0).toLocaleString()}`}
          sub={`${summary?.unpaidInvoices ?? 0} unpaid`}
          icon={summary?.unpaidInvoices > 0 ? AlertCircle : Receipt}
          color={summary?.unpaidInvoices > 0 ? 'bg-rose-500' : 'bg-slate-400'} />
      </div>

      {/* ── Smart Alert Banners ───────────────────────────────────── */}
      {(() => {
        const alerts: { type: 'error'|'warn'|'info'; msg: string; icon: React.ElementType }[] = []
        // LPO expiring within 30 days
        if (lpos?.length) {
          lpos.forEach((lpo: any) => {
            if (lpo.validityEnd) {
              const days = differenceInDays(new Date(lpo.validityEnd), new Date())
              if (days >= 0 && days <= 30)
                alerts.push({ type: 'warn', msg: `LPO ${lpo.lpoNumber} expires in ${days} day${days !== 1 ? 's' : ''} (${format(new Date(lpo.validityEnd), 'dd MMM yyyy')})`, icon: CalendarClock })
              if (days < 0)
                alerts.push({ type: 'error', msg: `LPO ${lpo.lpoNumber} EXPIRED on ${format(new Date(lpo.validityEnd), 'dd MMM yyyy')}`, icon: CalendarClock })
            }
          })
        }
        // Unpaid invoices
        if ((summary?.unpaidInvoices ?? 0) > 0)
          alerts.push({ type: 'warn', msg: `${summary.unpaidInvoices} unpaid invoice${summary.unpaidInvoices > 1 ? 's' : ''} totalling AED ${(summary.unpaidAmount ?? 0).toLocaleString()} outstanding`, icon: ShieldAlert })
        // Employees deployed but no invoices
        if ((employees?.length ?? 0) > 0 && (invoices?.length ?? 0) === 0)
          alerts.push({ type: 'info', msg: `${employees.length} employee${employees.length > 1 ? 's' : ''} deployed but no invoices generated — potential revenue leakage`, icon: UserX })

        if (!alerts.length) return null
        return (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
                a.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700'
                : a.type === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                <a.icon className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{a.msg}</span>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-100 flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lpo">LPOs ({lpos?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="employees">Employees ({employees?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="aging">AR Aging</TabsTrigger>
          <TabsTrigger value="ledger">Payment Ledger</TabsTrigger>
          <TabsTrigger value="alerts">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Revenue Intelligence
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="shadow-sm border-0 border-t-4 border-t-blue-400">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Company Details</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-0">
                  <DetailRow label="Client Name" value={client.name} />
                  <DetailRow label="Industry" value={client.industry || '—'} />
                  <DetailRow label="Email" value={client.companyDetails?.email || '—'} />
                  <DetailRow label="Phone" value={client.companyDetails?.phone || '—'} />
                  <DetailRow label="Address" value={client.companyDetails?.address || '—'} />
                  <DetailRow label="Tax Number" value={client.companyDetails?.taxNumber || '—'} mono />
                  <DetailRow label="Status" value={client.isActive ? 'Active' : 'Inactive'} />
                  <DetailRow label="Member since" value={client.createdAt ? format(new Date(client.createdAt), 'dd MMM yyyy') : '—'} />
                </dl>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-0 border-t-4 border-t-emerald-400">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Contract & Billing</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-0">
                  <DetailRow label="Contract Type" value={client.contractType || '—'} />
                  <DetailRow label="Billing Type" value={client.billingType || '—'} />
                  <DetailRow label="Rate Card" value={`AED ${client.rateCard}/hr`} />
                  <DetailRow label="Credit Terms" value={`${client.creditTerms} days`} />
                  <DetailRow label="Total Revenue" value={`AED ${(summary?.totalRevenue ?? 0).toLocaleString()}`} />
                  <DetailRow label="Unpaid Amount" value={`AED ${(summary?.unpaidAmount ?? 0).toLocaleString()}`} />
                  <DetailRow label="Unpaid Invoices" value={String(summary?.unpaidInvoices ?? 0)} />
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* LPO Tab */}
        <TabsContent value="lpo" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">Purchase Orders / LPOs</h3>
              <p className="text-sm text-muted-foreground">Position-based pricing, validity, billing & overtime rules</p>
            </div>
            <Button className="gap-2" onClick={() => setLpoOpen(true)}>
              <Plus className="h-4 w-4" /> New LPO
            </Button>
          </div>

          {!lpos?.length ? (
            <Card className="shadow-sm">
              <CardContent className="py-16 text-center text-muted-foreground">
                <FileCheck className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No LPOs yet</p>
                <p className="text-sm mt-1">Create the first Purchase Order for this client.</p>
                <Button className="mt-4 gap-2" onClick={() => setLpoOpen(true)}><Plus className="h-4 w-4" /> New LPO</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {lpos.map((lpo: any) => (
                <Card key={lpo._id} className="shadow-sm border overflow-hidden">
                  <div className={`h-1 ${lpo.status === 'Active' ? 'bg-emerald-500' : lpo.status === 'Expired' ? 'bg-slate-300' : lpo.status === 'Draft' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                          <span className="font-bold font-mono text-slate-800">{lpo.lpoNumber}</span>
                          {lpo.title && <span className="text-muted-foreground text-sm">— {lpo.title}</span>}
                          <LPOStatusBadge status={lpo.status} />
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span>Validity: {lpo.validityStart ? format(new Date(lpo.validityStart), 'dd MMM yyyy') : '—'} → {lpo.validityEnd ? format(new Date(lpo.validityEnd), 'dd MMM yyyy') : '—'}</span>
                          <span>Payment: {lpo.paymentTerms} days</span>
                          <span>VAT: {lpo.vatApplicablePct}%</span>
                          <span className="font-semibold text-slate-700">Total: AED {lpo.totalPOAmountInclVAT?.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Positions mini-table */}
                    {lpo.positions?.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50">
                              {['Position', 'Discipline', 'Qty', 'Rate Type', 'Monthly', 'Daily', 'Hourly', 'Duration', 'OT Type', 'OT Rate'].map(h => (
                                <th key={h} className="px-2 py-1.5 text-left font-medium text-slate-500 border border-slate-100">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {lpo.positions.map((p: any, i: number) => (
                              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="px-2 py-1.5 border border-slate-100 font-medium">{p.position || '—'}</td>
                                <td className="px-2 py-1.5 border border-slate-100">{p.discipline || '—'}</td>
                                <td className="px-2 py-1.5 border border-slate-100 text-center">{p.quantity}</td>
                                <td className="px-2 py-1.5 border border-slate-100"><Badge variant="outline" className="text-xs">{p.rateType}</Badge></td>
                                <td className="px-2 py-1.5 border border-slate-100">{p.monthlyRate > 0 ? `AED ${p.monthlyRate.toLocaleString()}` : '—'}</td>
                                <td className="px-2 py-1.5 border border-slate-100">{p.dailyRate > 0 ? `AED ${p.dailyRate.toLocaleString()}` : '—'}</td>
                                <td className="px-2 py-1.5 border border-slate-100">{p.hourlyRate > 0 ? `AED ${p.hourlyRate.toLocaleString()}` : '—'}</td>
                                <td className="px-2 py-1.5 border border-slate-100">{p.duration} mo</td>
                                <td className="px-2 py-1.5 border border-slate-100">{p.overtimeRateType}</td>
                                <td className="px-2 py-1.5 border border-slate-100">{p.overtimeRate > 0 ? p.overtimeRate : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Rules */}
                    {(lpo.billingRules || lpo.overtimeRules || lpo.licenseDetails) && (
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        {lpo.billingRules && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-xs font-bold text-blue-600 mb-1">Billing Rules</div>
                            <p className="text-xs text-slate-700">{lpo.billingRules}</p>
                          </div>
                        )}
                        {lpo.overtimeRules && (
                          <div className="bg-amber-50 rounded-lg p-3">
                            <div className="text-xs font-bold text-amber-600 mb-1">Overtime Rules</div>
                            <p className="text-xs text-slate-700">{lpo.overtimeRules}</p>
                          </div>
                        )}
                        {lpo.licenseDetails && (
                          <div className="bg-purple-50 rounded-lg p-3">
                            <div className="text-xs font-bold text-purple-600 mb-1">License Details</div>
                            <p className="text-xs text-slate-700">{lpo.licenseDetails}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Employees */}
        <TabsContent value="employees" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Assigned Employees</CardTitle></CardHeader>
            <CardContent>
              {!employees?.length ? (
                <p className="text-muted-foreground text-sm text-center py-8">No employees assigned to this client.</p>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Name', 'Code', 'Position', 'Base Salary', 'Status'].map(h => (
                          <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp: any) => (
                        <tr key={emp._id} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">{emp.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{emp.employeeCode}</td>
                          <td className="px-4 py-3 text-muted-foreground">{emp.position ?? '—'}</td>
                          <td className="px-4 py-3">AED {emp.baseSalary?.toLocaleString()}</td>
                          <td className="px-4 py-3"><Badge variant={emp.status === 'Active' ? 'default' : 'secondary'} className="text-xs">{emp.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Invoice History</CardTitle></CardHeader>
            <CardContent>
              {!invoices?.length ? (
                <p className="text-muted-foreground text-sm text-center py-8">No invoices found for this client.</p>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Invoice #', 'Month', 'Total', 'Paid', 'Due Date', 'Status'].map(h => (
                          <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv: any) => (
                        <tr key={inv._id} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-semibold text-blue-600 text-xs">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3 text-muted-foreground">{inv.month}</td>
                          <td className="px-4 py-3 font-semibold">AED {inv.totalAmount?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-emerald-600">AED {inv.paidAmount?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-muted-foreground">{inv.dueDate ? format(new Date(inv.dueDate), 'MMM dd, yyyy') : '—'}</td>
                          <td className="px-4 py-3"><Badge variant={statusVariant(inv.status)} className="text-xs">{inv.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AR Aging ──────────────────────────────────────────────── */}
        <TabsContent value="aging" className="mt-4">
          {!invoices?.length ? (
            <Card className="shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">No invoices to analyze.</CardContent></Card>
          ) : (() => {
            const now = new Date()
            const buckets = [
              { label: 'Current (not due)', days: [null, 0], invoices: [] as any[], color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
              { label: '1–30 days overdue',  days: [1,  30], invoices: [] as any[], color: 'bg-amber-100 text-amber-700 border-amber-200'   },
              { label: '31–60 days overdue', days: [31, 60], invoices: [] as any[], color: 'bg-orange-100 text-orange-700 border-orange-200' },
              { label: '61–90 days overdue', days: [61, 90], invoices: [] as any[], color: 'bg-rose-100 text-rose-700 border-rose-200'       },
              { label: '90+ days overdue',   days: [91, null],invoices: [] as any[], color: 'bg-red-100 text-red-700 border-red-200'         },
            ]
            const unpaid = invoices.filter((i: any) => ['Sent','Overdue','PartiallyPaid'].includes(i.status))
            unpaid.forEach((inv: any) => {
              const due = inv.dueDate ? differenceInDays(now, new Date(inv.dueDate)) : -1
              const bucket =
                due <= 0 ? buckets[0] :
                due <= 30 ? buckets[1] :
                due <= 60 ? buckets[2] :
                due <= 90 ? buckets[3] : buckets[4]
              bucket.invoices.push({ ...inv, daysOverdue: Math.max(0, due) })
            })
            const grandTotal = unpaid.reduce((s: number, i: any) => s + (i.totalAmount - (i.paidAmount ?? 0)), 0)
            return (
              <div className="space-y-4">
                {/* Summary strip */}
                <div className="grid grid-cols-5 gap-2">
                  {buckets.map(b => {
                    const amt = b.invoices.reduce((s, i) => s + (i.totalAmount - (i.paidAmount ?? 0)), 0)
                    return (
                      <div key={b.label} className={`rounded-xl border p-3 text-center ${b.color}`}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{b.label}</p>
                        <p className="text-xl font-bold mt-1">AED {(amt/1000).toFixed(1)}K</p>
                        <p className="text-[10px] mt-0.5 opacity-60">{b.invoices.length} invoice{b.invoices.length !== 1 ? 's' : ''}</p>
                      </div>
                    )
                  })}
                </div>

                {/* DSO */}
                <Card className="shadow-sm border-0 border-t-4 border-t-amber-400">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total AR Outstanding</p>
                        <p className="text-3xl font-bold mt-0.5">AED {grandTotal.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Credit terms</p>
                        <p className="text-2xl font-bold text-amber-600">{client?.creditTerms ?? 30} days</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                      {buckets.map((b, i) => {
                        const amt = b.invoices.reduce((s, inv) => s + (inv.totalAmount - (inv.paidAmount ?? 0)), 0)
                        const pct = grandTotal > 0 ? (amt / grandTotal) * 100 : 0
                        const colors = ['bg-emerald-400','bg-amber-400','bg-orange-400','bg-rose-400','bg-red-600']
                        return pct > 0 ? <div key={i} className={colors[i]} style={{ width: `${pct}%` }} /> : null
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Bucket detail */}
                {buckets.filter(b => b.invoices.length > 0).map(b => (
                  <Card key={b.label} className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${b.color}`}>{b.label}</span>
                        <span className="text-muted-foreground font-normal">{b.invoices.length} invoices</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>{['Invoice #','Month','Outstanding','Due Date','Days Late'].map(h=>(
                            <th key={h} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {b.invoices.map((inv: any) => (
                            <tr key={inv._id} className="border-t hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono text-xs text-blue-600 font-semibold">{inv.invoiceNumber}</td>
                              <td className="px-3 py-2 text-muted-foreground">{inv.month}</td>
                              <td className="px-3 py-2 font-semibold">AED {(inv.totalAmount - (inv.paidAmount ?? 0)).toLocaleString()}</td>
                              <td className="px-3 py-2 text-muted-foreground">{inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy') : '—'}</td>
                              <td className="px-3 py-2">
                                <span className={`font-bold text-xs ${inv.daysOverdue > 60 ? 'text-red-600' : inv.daysOverdue > 30 ? 'text-rose-500' : inv.daysOverdue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {inv.daysOverdue > 0 ? `${inv.daysOverdue}d late` : 'Current'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          })()}
        </TabsContent>

        {/* ── Payment Ledger ─────────────────────────────────────────── */}
        <TabsContent value="ledger" className="mt-4">
          <Card className="shadow-sm border-0 border-t-4 border-t-blue-500">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Payment Ledger
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!invoices?.length ? (
                <p className="text-muted-foreground text-sm text-center py-8">No payment records found.</p>
              ) : (() => {
                const ledgerRows = invoices.map((inv: any) => {
                  const outstanding = (inv.totalAmount ?? 0) - (inv.paidAmount ?? 0)
                  const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && outstanding > 0
                  return { ...inv, outstanding, isOverdue }
                })
                const totalBilled   = ledgerRows.reduce((s: number, r: any) => s + r.totalAmount, 0)
                const totalPaid     = ledgerRows.reduce((s: number, r: any) => s + (r.paidAmount ?? 0), 0)
                const totalOutstanding = ledgerRows.reduce((s: number, r: any) => s + r.outstanding, 0)
                const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0

                return (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: 'Total Billed',     value: `AED ${totalBilled.toLocaleString()}`,      color: 'text-slate-700' },
                        { label: 'Total Collected',  value: `AED ${totalPaid.toLocaleString()}`,         color: 'text-emerald-600' },
                        { label: 'Outstanding',      value: `AED ${totalOutstanding.toLocaleString()}`,  color: totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600' },
                        { label: 'Collection Rate',  value: `${collectionRate}%`,                         color: collectionRate >= 90 ? 'text-emerald-600' : collectionRate >= 70 ? 'text-amber-600' : 'text-rose-600' },
                      ].map(s => (
                        <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center border">
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">{s.label}</p>
                          <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Collection progress */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Collection progress</span>
                        <span className="font-semibold">{collectionRate}% collected</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${collectionRate >= 90 ? 'bg-emerald-500' : collectionRate >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${collectionRate}%` }} />
                      </div>
                    </div>

                    {/* Ledger table */}
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>{['Date','Invoice #','Billed','Paid','Balance','Status','Overdue'].map(h=>(
                            <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {ledgerRows.map((row: any) => (
                            <tr key={row._id} className={`border-t hover:bg-slate-50 ${row.isOverdue ? 'bg-rose-50/40' : ''}`}>
                              <td className="px-3 py-2.5 text-muted-foreground text-xs">{row.issueDate ? format(new Date(row.issueDate), 'dd MMM yy') : row.month}</td>
                              <td className="px-3 py-2.5 font-mono text-xs text-blue-600 font-semibold">{row.invoiceNumber}</td>
                              <td className="px-3 py-2.5 font-medium">AED {row.totalAmount?.toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-emerald-600">AED {(row.paidAmount ?? 0).toLocaleString()}</td>
                              <td className={`px-3 py-2.5 font-bold ${row.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                AED {row.outstanding.toLocaleString()}
                              </td>
                              <td className="px-3 py-2.5"><Badge variant={statusVariant(row.status)} className="text-xs">{row.status}</Badge></td>
                              <td className="px-3 py-2.5">
                                {row.isOverdue ? (
                                  <span className="text-rose-600 font-bold text-xs flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {differenceInDays(new Date(), new Date(row.dueDate))}d
                                  </span>
                                ) : (
                                  <span className="text-emerald-500 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Revenue Intelligence ───────────────────────────────────── */}
        <TabsContent value="alerts" className="mt-4">
          <div className="space-y-4">
            {/* Margin Trend */}
            {(() => {
              const revenue = summary?.totalRevenue ?? 0
              const totalSalary = (employees ?? []).reduce((s: number, e: any) => s + (e.baseSalary ?? 0), 0)
              const margin = revenue > 0 ? Math.round(((revenue - totalSalary) / revenue) * 100) : 0
              const marginColor = margin >= 25 ? 'text-emerald-600' : margin >= 10 ? 'text-amber-600' : 'text-rose-600'
              return (
                <div className="grid grid-cols-3 gap-3">
                  <Card className="shadow-sm border-0 border-t-4 border-t-emerald-400">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Client Revenue</p>
                      <p className="text-2xl font-bold mt-0.5">AED {revenue.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-1 text-emerald-600 text-xs">
                        <TrendingUp className="w-3.5 h-3.5" /> All invoiced
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm border-0 border-t-4 border-t-blue-400">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Salary Cost (deployed)</p>
                      <p className="text-2xl font-bold mt-0.5">AED {totalSalary.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">{employees?.length ?? 0} employee{(employees?.length ?? 0) !== 1 ? 's' : ''}</p>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm border-0 border-t-4 border-t-violet-400">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Est. Margin</p>
                      <p className={`text-2xl font-bold mt-0.5 ${marginColor}`}>{margin}%</p>
                      <div className={`flex items-center gap-1 mt-1 text-xs ${marginColor}`}>
                        {margin >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {margin >= 25 ? 'Healthy margin' : margin >= 10 ? 'Below target' : 'Loss-making'}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}

            {/* Revenue Leakage Controls */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-500" /> Revenue Leakage Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      check: 'Active LPO Coverage',
                      pass: (lpos ?? []).some((l: any) => l.status === 'Active'),
                      msg: (lpos ?? []).some((l: any) => l.status === 'Active')
                        ? 'Active LPO found — billing authorized'
                        : 'No active LPO — employees may be unbillable',
                    },
                    {
                      check: 'Invoice Generation',
                      pass: (invoices?.length ?? 0) > 0,
                      msg: (invoices?.length ?? 0) > 0
                        ? `${invoices.length} invoice${invoices.length > 1 ? 's' : ''} generated`
                        : 'No invoices generated yet — check for missing billing',
                    },
                    {
                      check: 'Zero Outstanding Invoices',
                      pass: (summary?.unpaidInvoices ?? 0) === 0,
                      msg: (summary?.unpaidInvoices ?? 0) === 0
                        ? 'All invoices paid — no outstanding AR'
                        : `${summary?.unpaidInvoices} invoice${summary?.unpaidInvoices > 1 ? 's' : ''} unpaid (AED ${(summary?.unpaidAmount ?? 0).toLocaleString()})`,
                    },
                    {
                      check: 'Employee–Invoice Ratio',
                      pass: (employees?.length ?? 0) === 0 || (invoices?.length ?? 0) > 0,
                      msg: (employees?.length ?? 0) === 0
                        ? 'No employees deployed'
                        : (invoices?.length ?? 0) > 0
                        ? `${employees.length} employees are being invoiced`
                        : `${employees.length} employees deployed but zero invoices — revenue leak detected`,
                    },
                    {
                      check: 'LPO Validity',
                      pass: !(lpos ?? []).some((l: any) => l.validityEnd && differenceInDays(new Date(l.validityEnd), new Date()) < 30),
                      msg: (lpos ?? []).some((l: any) => l.validityEnd && differenceInDays(new Date(l.validityEnd), new Date()) < 30)
                        ? 'One or more LPOs expiring within 30 days — renewal required'
                        : 'All LPOs have valid coverage',
                    },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${item.pass ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                      {item.pass
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        : <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />}
                      <div>
                        <p className={`text-xs font-bold ${item.pass ? 'text-emerald-700' : 'text-rose-700'}`}>{item.check}</p>
                        <p className={`text-xs mt-0.5 ${item.pass ? 'text-emerald-600' : 'text-rose-600'}`}>{item.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
