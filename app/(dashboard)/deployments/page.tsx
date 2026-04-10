'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  UserCheck, Plus, Search, X, Building2, TrendingUp, TrendingDown,
  Clock, Users, CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function statusColor(s: string) {
  if (s === 'Active') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  if (s === 'On-Hold') return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  if (s === 'Replaced') return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
}

function statusIcon(s: string) {
  if (s === 'Active') return <CheckCircle2 className="w-3 h-3" />
  if (s === 'On-Hold') return <Clock className="w-3 h-3" />
  if (s === 'Replaced') return <RefreshCw className="w-3 h-3" />
  return <XCircle className="w-3 h-3" />
}

// ── data hooks ────────────────────────────────────────────────────────────────

function useDeployments(filters: { page: number; search: string; status: string; clientId: string }) {
  return useQuery({
    queryKey: ['deployments', filters],
    queryFn: async () => {
      const p = new URLSearchParams()
      p.set('page', String(filters.page))
      p.set('limit', '20')
      if (filters.status) p.set('status', filters.status)
      if (filters.clientId) p.set('clientId', filters.clientId)
      const { data } = await apiClient.get<any>(`/deployments?${p}`)
      return data.data
    },
  })
}

function useClients() {
  return useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data } = await apiClient.get<any>('/clients?limit=200')
      return data.data?.data ?? []
    },
    staleTime: 60_000,
  })
}

function useEmployees() {
  return useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data } = await apiClient.get<any>('/employees?limit=200')
      return data.data?.data ?? []
    },
    staleTime: 60_000,
  })
}

function useProjects(clientId?: string) {
  return useQuery({
    queryKey: ['projects-list', clientId],
    queryFn: async () => {
      const p = clientId ? `?clientId=${clientId}&limit=100` : '?limit=100'
      const { data } = await apiClient.get<any>(`/projects${p}`)
      return data.data?.data ?? []
    },
    staleTime: 30_000,
  })
}

// ── form ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  employeeId: '', clientId: '', projectId: '', position: '',
  billingRate: '', billingType: 'Monthly', salary: '',
  startDate: '', endDate: '', status: 'Active', notes: '',
}

function DeploymentFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const { data: clients = [] } = useClients()
  const { data: employees = [] } = useEmployees()
  const { data: projects = [] } = useProjects(form.clientId || undefined)

  const mutation = useMutation({
    mutationFn: (body: any) => apiClient.post('/deployments', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deployments'] })
      setForm(EMPTY_FORM)
      onClose()
    },
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      ...form,
      billingRate: parseFloat(form.billingRate) || 0,
      salary: parseFloat(form.salary) || 0,
      projectId: form.projectId || undefined,
      endDate: form.endDate || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Add Deployment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Employee *</Label>
              <Select value={form.employeeId} onValueChange={(v) => set('employeeId', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {employees.map((e: any) => (
                    <SelectItem key={e._id} value={e._id} className="text-white hover:bg-slate-700">
                      {e.name} ({e.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Client *</Label>
              <Select value={form.clientId} onValueChange={(v) => set('clientId', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {clients.map((c: any) => (
                    <SelectItem key={c._id} value={c._id} className="text-white hover:bg-slate-700">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Project</Label>
              <Select value={form.projectId} onValueChange={(v) => set('projectId', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="" className="text-slate-400">None</SelectItem>
                  {projects.map((p: any) => (
                    <SelectItem key={p._id} value={p._id} className="text-white hover:bg-slate-700">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Position</Label>
              <Input value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="e.g. BIM Coordinator" className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Billing Rate (AED)</Label>
              <Input type="number" value={form.billingRate} onChange={(e) => set('billingRate', e.target.value)} placeholder="0" className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Billing Type</Label>
              <Select value={form.billingType} onValueChange={(v) => set('billingType', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {['Monthly', 'Daily', 'Hourly'].map((t) => (
                    <SelectItem key={t} value={t} className="text-white hover:bg-slate-700">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Salary Cost (AED/month)</Label>
              <Input type="number" value={form.salary} onChange={(e) => set('salary', e.target.value)} placeholder="0" className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {['Active', 'On-Hold', 'Replaced', 'Ended'].map((s) => (
                    <SelectItem key={s} value={s} className="text-white hover:bg-slate-700">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Start Date *</Label>
              <Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>
          <div>
            <Label className="text-slate-300 text-xs mb-1 block">Notes</Label>
            <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes" className="bg-slate-800 border-slate-700 text-white" />
          </div>
          {mutation.isError && (
            <p className="text-red-400 text-sm">Failed to create deployment. Please check required fields.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || !form.employeeId || !form.clientId || !form.startDate} className="bg-blue-600 hover:bg-blue-700 text-white">
              {mutation.isPending ? 'Creating…' : 'Create Deployment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function DeploymentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [clientId, setClientId] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const { data, isLoading } = useDeployments({ page, search, status, clientId })
  const { data: clients = [] } = useClients()
  const deployments: any[] = data?.data ?? []
  const pagination = data?.pagination

  const activeCount = deployments.filter((d) => d.status === 'Active').length
  const onHoldCount = deployments.filter((d) => d.status === 'On-Hold').length
  const totalBillingRate = deployments.reduce((s, d) => s + (d.billingRate ?? 0), 0)

  return (
    <div className="min-h-screen bg-slate-900 -m-6 p-6">
      <DeploymentFormModal open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-900/40">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Resource Deployments</h1>
          </div>
          <p className="text-slate-400 text-sm ml-12">Track all employee placements across clients and projects.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2 shadow-lg shadow-cyan-900/40">
          <Plus className="w-4 h-4" /> Add Deployment
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: String(pagination?.total ?? deployments.length), icon: Users, color: 'from-blue-700/60 to-blue-900/40' },
          { label: 'Active', value: String(activeCount), icon: CheckCircle2, color: 'from-emerald-700/60 to-emerald-900/40' },
          { label: 'On-Hold', value: String(onHoldCount), icon: Clock, color: 'from-amber-700/60 to-amber-900/40' },
          { label: 'Total Billing', value: `AED ${(totalBillingRate / 1000).toFixed(0)}K`, icon: TrendingUp, color: 'from-cyan-700/60 to-cyan-900/40' },
        ].map((k) => (
          <div key={k.label} className={`relative overflow-hidden bg-gradient-to-br ${k.color} border border-white/10 rounded-2xl p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">{k.label}</p>
                <p className="text-white text-2xl font-bold mt-1">{k.value}</p>
              </div>
              <k.icon className="w-8 h-8 text-white/20" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search deployments…"
            className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
          />
          {search && <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex gap-2">
          {['', 'Active', 'On-Hold', 'Replaced', 'Ended'].map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1) }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${status === s ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-500'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <select value={clientId} onChange={(e) => { setClientId(e.target.value); setPage(1) }}
          className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-500">
          <option value="">All Clients</option>
          {clients.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60">
                {['Code', 'Employee', 'Client', 'Position', 'Billing', 'Salary', 'Period', 'Status', 'Profit'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-700/30">
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : deployments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <UserCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No deployments found</p>
                    <p className="text-slate-500 text-xs mt-1">Add a deployment to start tracking resource placements.</p>
                  </td>
                </tr>
              ) : (
                deployments.map((d: any) => {
                  const emp = d.employeeId
                  const client = d.clientId
                  // Estimate daily/monthly comparison for profit indicator
                  const monthlyBilling = d.billingType === 'Monthly' ? d.billingRate : d.billingType === 'Daily' ? d.billingRate * 22 : d.billingRate * 176
                  const profit = monthlyBilling - (d.salary ?? 0)
                  return (
                    <tr key={d._id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{d.deploymentCode || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{emp?.name ?? '—'}</p>
                        <p className="text-slate-500 text-xs">{emp?.employeeCode ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{client?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{d.position || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{fmt(d.billingRate)}</p>
                        <p className="text-slate-500 text-xs">/{d.billingType}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{d.salary ? fmt(d.salary) : '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        <p>{d.startDate ? format(new Date(d.startDate), 'dd MMM yy') : '—'}</p>
                        {d.endDate && <p className="text-slate-500">→ {format(new Date(d.endDate), 'dd MMM yy')}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusColor(d.status)}`}>
                          {statusIcon(d.status)} {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1 text-sm font-semibold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {profit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {fmt(Math.abs(profit))}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-slate-500 text-sm">Page {pagination.page} of {pagination.totalPages} — {pagination.total} deployments</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!pagination.hasPrevPage} onClick={() => setPage((p) => p - 1)} className="border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">Previous</Button>
            <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)} className="border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
