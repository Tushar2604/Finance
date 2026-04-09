'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import {
  Building2, Download, Upload, Plus, FileText, Users, Clock,
  TrendingUp, AlertTriangle, CheckCircle2, ChevronRight,
  BarChart3, Wallet, GitMerge, ArrowRight, Search, X,
  Globe, Phone, Mail, Star, Activity, DollarSign, Zap,
  FileCheck, UserCheck, Receipt, PieChart, Bell, Shield
} from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'

const IMPORT_COLUMNS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'website', label: 'Website' },
  { key: 'industry', label: 'Industry' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'taxNumber', label: 'Tax Number' },
  { key: 'contractType', label: 'Contract Type' },
  { key: 'rateCard', label: 'Rate Card' },
  { key: 'billingType', label: 'Billing Type' },
  { key: 'creditTerms', label: 'Credit Terms' },
  { key: 'isActive', label: 'Is Active' },
]

const TEMPLATE_ROWS = [
  { name: 'Acme Corp', website: 'https://acme.com', industry: 'FinTech', email: 'finance@acme.com', phone: '+971501234567', address: 'Dubai, UAE', taxNumber: 'TRN100200300400', contractType: 'LPO', rateCard: '250', billingType: 'Monthly', creditTerms: '30', isActive: 'true' },
]

const FLOW_STEPS = [
  { label: 'Client',      icon: Building2,  color: 'from-blue-600 to-blue-700',    desc: 'Master record' },
  { label: 'LPO',         icon: FileCheck,  color: 'from-violet-600 to-violet-700', desc: 'Agreement & deal' },
  { label: 'Project',     icon: FileText,   color: 'from-indigo-600 to-indigo-700', desc: 'Services scope' },
  { label: 'Deployment',  icon: UserCheck,  color: 'from-cyan-600 to-cyan-700',     desc: 'Resource assign' },
  { label: 'Timesheet',   icon: Clock,      color: 'from-teal-600 to-teal-700',     desc: 'Hours logged' },
  { label: 'Invoice',     icon: Receipt,    color: 'from-amber-600 to-amber-700',   desc: 'Billing raised' },
  { label: 'Payment',     icon: Wallet,     color: 'from-orange-600 to-orange-700', desc: 'Cash collected' },
  { label: 'Profit',      icon: TrendingUp, color: 'from-emerald-600 to-emerald-700', desc: 'Net return' },
]

const SUB_MODULES = [
  {
    id: 'clients',
    label: 'Client Master',
    icon: Building2,
    color: 'from-blue-600/20 to-blue-700/10',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    href: '#clients',
    desc: 'Manage client profiles, contacts, credit terms and KYC documents.',
    stat: null,
    badge: null,
  },
  {
    id: 'lpo',
    label: 'LPO / Agreement',
    icon: FileCheck,
    color: 'from-violet-600/20 to-violet-700/10',
    border: 'border-violet-500/30',
    iconColor: 'text-violet-400',
    href: '#lpo',
    desc: 'Track all purchase orders, rate cards, validity, billing and overtime rules.',
    stat: null,
    badge: 'Expiring Soon',
  },
  {
    id: 'projects',
    label: 'Projects / Services',
    icon: FileText,
    color: 'from-indigo-600/20 to-indigo-700/10',
    border: 'border-indigo-500/30',
    iconColor: 'text-indigo-400',
    href: '/projects',
    desc: 'Open service scopes, milestones, deliverables and status tracking.',
    stat: null,
    badge: null,
  },
  {
    id: 'deployment',
    label: 'Resource Deployment',
    icon: UserCheck,
    color: 'from-cyan-600/20 to-cyan-700/10',
    border: 'border-cyan-500/30',
    iconColor: 'text-cyan-400',
    href: '/employees',
    desc: 'Deployed headcount per client, mobilization status and visa tracking.',
    stat: null,
    badge: null,
  },
  {
    id: 'timesheets',
    label: 'Timesheets',
    icon: Clock,
    color: 'from-teal-600/20 to-teal-700/10',
    border: 'border-teal-500/30',
    iconColor: 'text-teal-400',
    href: '/timesheets',
    desc: 'Approve client-specific timesheets, resolve gaps and flag missing submissions.',
    stat: null,
    badge: 'Pending',
  },
  {
    id: 'invoices',
    label: 'Invoice Management',
    icon: Receipt,
    color: 'from-amber-600/20 to-amber-700/10',
    border: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    href: '/invoices',
    desc: 'Generate, send and track all invoices raised against client LPOs.',
    stat: null,
    badge: 'Overdue',
  },
  {
    id: 'payments',
    label: 'Payment Tracking',
    icon: Wallet,
    color: 'from-orange-600/20 to-orange-700/10',
    border: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    href: '/bank',
    desc: 'Match incoming client payments to invoices and track outstanding balances.',
    stat: null,
    badge: null,
  },
  {
    id: 'reconciliation',
    label: 'Invoice Reconciliation',
    icon: GitMerge,
    color: 'from-rose-600/20 to-rose-700/10',
    border: 'border-rose-500/30',
    iconColor: 'text-rose-400',
    href: '/reconciliation',
    desc: 'Bank-to-invoice matching, partial payment handling and aging analysis.',
    stat: null,
    badge: null,
  },
  {
    id: 'profitability',
    label: 'Client Profitability',
    icon: PieChart,
    color: 'from-emerald-600/20 to-emerald-700/10',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    href: '/reports',
    desc: 'Revenue vs cost breakdowns, margin analysis and profit trend per client.',
    stat: null,
    badge: null,
  },
  {
    id: 'reports',
    label: 'Reports & Aging',
    icon: BarChart3,
    color: 'from-sky-600/20 to-sky-700/10',
    border: 'border-sky-500/30',
    iconColor: 'text-sky-400',
    href: '/reports',
    desc: 'AR aging, DSO tracking, revenue pipeline and executive summary exports.',
    stat: null,
    badge: null,
  },
  {
    id: 'alerts',
    label: 'Smart Alerts',
    icon: Bell,
    color: 'from-pink-600/20 to-pink-700/10',
    border: 'border-pink-500/30',
    iconColor: 'text-pink-400',
    href: '/alerts',
    desc: 'Revenue leakage controls: expiring LPOs, missing invoices, overdue payments.',
    stat: null,
    badge: '3 Active',
  },
  {
    id: 'audit',
    label: 'Payment Audit',
    icon: Shield,
    color: 'from-slate-500/20 to-slate-600/10',
    border: 'border-slate-500/30',
    iconColor: 'text-slate-400',
    href: '/payment-audit',
    desc: 'Rule-based audit engine flagging salary mismatches, late payments, and bank gaps.',
    stat: null,
    badge: null,
  },
]

const CLIENT_AVATAR_COLORS = [
  'from-blue-600 to-indigo-700',
  'from-violet-600 to-purple-700',
  'from-emerald-600 to-teal-700',
  'from-amber-600 to-orange-700',
  'from-rose-600 to-pink-700',
  'from-cyan-600 to-blue-700',
]

function getClientColor(name: string) {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return CLIENT_AVATAR_COLORS[Math.abs(h) % CLIENT_AVATAR_COLORS.length]
}
function getInitials(name: string) { return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() }

function useClients(filters: { page: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', filters.page.toString())
      params.append('limit', '20')
      if (filters.search) params.append('search', filters.search)
      if (filters.status) params.append('isActive', filters.status)
      const { data } = await apiClient.get<any>(`/clients?${params}`)
      return data.data
    },
  })
}

function useClientStats() {
  return useQuery({
    queryKey: ['client-stats'],
    queryFn: async () => {
      // Pull quick counts from dashboard
      const { data } = await apiClient.get<any>('/dashboard')
      return data.data
    },
    staleTime: 60_000,
  })
}

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${color} border border-white/10 rounded-2xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">{label}</p>
          <p className="text-white text-2xl font-bold mt-1 tracking-tight">{value}</p>
          {sub && <p className="text-white/50 text-xs mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-white/80" />
        </div>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'hub' | 'list'>('hub')
  const { data, isLoading, refetch } = useClients({ page, search, status })
  const { data: stats } = useClientStats()

  const handleExport = () => {
    const rows = (data?.data ?? []).map((c: any) => ({
      name: c.name,
      website: c.website ?? '',
      industry: c.industry ?? '',
      email: c.companyDetails?.email ?? '',
      phone: c.companyDetails?.phone ?? '',
      address: c.companyDetails?.address ?? '',
      taxNumber: c.companyDetails?.taxNumber ?? '',
      contractType: c.contractType ?? '',
      rateCard: c.rateCard ?? '',
      billingType: c.billingType ?? '',
      creditTerms: c.creditTerms ?? '',
      isActive: c.isActive ? 'true' : 'false',
    }))
    exportToCSV(rows, 'clients')
  }

  const totalClients = data?.pagination?.total ?? 0
  const activeClients = (data?.data ?? []).filter((c: any) => c.isActive).length

  return (
    <div className="min-h-screen bg-slate-900 -m-6 p-6">
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="Clients"
        apiEndpoint="/clients/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Client Hub</h1>
          </div>
          <p className="text-slate-400 text-sm ml-12">Full business lifecycle from LPO to profit — in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700 gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700 gap-2" onClick={handleExport} disabled={!data?.data?.length}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-900/40">
            <Plus className="h-4 w-4" /> Add Client
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Building2}   label="Total Clients"    value={String(totalClients || '—')} sub={`${activeClients} active`}        color="from-blue-700/60 to-blue-900/40" />
        <KpiCard icon={DollarSign}  label="Total Revenue"    value={stats?.totalRevenue ? `AED ${(stats.totalRevenue/1000).toFixed(0)}K` : '—'} sub="All invoiced"   color="from-emerald-700/60 to-emerald-900/40" />
        <KpiCard icon={AlertTriangle} label="Outstanding"    value={stats?.outstandingAmount ? `AED ${(stats.outstandingAmount/1000).toFixed(0)}K` : '—'} sub={`${stats?.outstandingCount ?? 0} invoices`} color="from-amber-700/60 to-amber-900/40" />
        <KpiCard icon={TrendingUp}  label="Net Profit %"     value={stats?.profitPct ? `${stats.profitPct.toFixed(1)}%` : '—'} sub="Current month"  color="from-violet-700/60 to-violet-900/40" />
      </div>

      {/* Tab switcher */}
      <div className="flex bg-slate-800/60 border border-slate-700/60 rounded-xl p-1 gap-1 w-fit mb-6">
        <button
          onClick={() => setActiveTab('hub')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'hub' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
        >
          Module Hub
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
        >
          Client List
        </button>
      </div>

      {activeTab === 'hub' ? (
        <>
          {/* Business Flow Pipeline */}
          <div className="mb-8">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">Business Flow</p>
            <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
              {FLOW_STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <React.Fragment key={step.label}>
                    <div className={`flex flex-col items-center bg-gradient-to-b ${step.color} border border-white/10 rounded-xl px-4 py-3 min-w-[90px] shadow-lg`}>
                      <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center mb-2">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-white text-xs font-bold whitespace-nowrap">{step.label}</p>
                      <p className="text-white/50 text-[10px] whitespace-nowrap mt-0.5">{step.desc}</p>
                    </div>
                    {i < FLOW_STEPS.length - 1 && (
                      <div className="flex items-center shrink-0 mx-1">
                        <ArrowRight className="w-4 h-4 text-slate-600" />
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          {/* Sub-module Cards */}
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">Modules</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {SUB_MODULES.map(mod => {
                const Icon = mod.icon
                const isInternal = mod.href.startsWith('#')
                const inner = (
                  <div className={`relative bg-gradient-to-br ${mod.color} border ${mod.border} rounded-2xl p-5 h-full hover:border-white/20 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer`}>
                    {mod.badge && (
                      <span className="absolute top-3.5 right-3.5 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-bold">
                        {mod.badge}
                      </span>
                    )}
                    <div className={`w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${mod.iconColor}`} />
                    </div>
                    <h3 className="text-white font-bold text-sm group-hover:text-white transition-colors">{mod.label}</h3>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{mod.desc}</p>
                    <div className="flex items-center gap-1 mt-3 text-slate-500 group-hover:text-slate-300 transition-colors">
                      <span className="text-xs font-medium">Open</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                )
                return isInternal ? (
                  <div key={mod.id} onClick={() => { if (mod.id === 'clients') setActiveTab('list') }}>
                    {inner}
                  </div>
                ) : (
                  <Link key={mod.id} href={mod.href} className="block h-full">
                    {inner}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Add Client',       icon: Building2,  color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/40',    action: () => {} },
                { label: 'Create LPO',       icon: FileCheck,  color: 'bg-violet-600 hover:bg-violet-700 shadow-violet-900/40', action: () => {} },
                { label: 'Generate Invoice', icon: Receipt,    color: 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/40',  action: () => {} },
                { label: 'View Reports',     icon: BarChart3,  color: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/40', action: () => {} },
                { label: 'Run Audit',        icon: Shield,     color: 'bg-slate-600 hover:bg-slate-500 shadow-slate-900/40', action: () => {} },
              ].map(qa => {
                const Icon = qa.icon
                return (
                  <button
                    key={qa.label}
                    onClick={qa.action}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg ${qa.color} transition-all`}
                  >
                    <Icon className="w-4 h-4" /> {qa.label}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        /* Client List Tab */
        <div>
          {/* Search + filter row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search clients…"
                className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {['', 'true', 'false'].map(s => (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setPage(1) }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    status === s
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-500'
                  }`}
                >
                  {s === '' ? 'All' : s === 'true' ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-slate-700 mb-3" />
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-300 font-semibold">No clients found</p>
              <p className="text-slate-500 text-sm mt-1">
                {search || status ? 'Try adjusting your filters.' : 'Import a CSV or run npm run seed.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.data?.map((client: any) => {
                const avatarColor = getClientColor(client.name)
                const initials = getInitials(client.name)
                return (
                  <Link key={client._id} href={`/clients/${client._id}`} className="block group">
                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 hover:border-slate-500/80 hover:bg-slate-800 transition-all duration-200 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5">
                      {/* Status + Industry */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          client.isActive
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                        }`}>
                          {client.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {client.industry && (
                          <span className="text-[10px] text-slate-500 font-medium">{client.industry}</span>
                        )}
                      </div>

                      {/* Logo/Avatar + Name */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center shrink-0 shadow-lg`}>
                          <span className="text-white font-bold text-sm">{initials}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-white font-bold text-sm leading-tight group-hover:text-blue-300 transition-colors truncate">
                            {client.name}
                          </h3>
                          <p className="text-slate-500 text-xs mt-0.5 truncate">{client.contractType ?? 'No contract'}</p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-1.5">
                        {client.companyDetails?.email && (
                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <Mail className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                            <span className="truncate">{client.companyDetails.email}</span>
                          </div>
                        )}
                        {client.companyDetails?.phone && (
                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <Phone className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                            <span>{client.companyDetails.phone}</span>
                          </div>
                        )}
                        {client.website && (
                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <Globe className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                            <span className="truncate">{client.website.replace(/^https?:\/\//, '')}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/60">
                        <div>
                          <p className="text-[10px] text-slate-500">Rate Card</p>
                          <p className="text-sm font-bold text-slate-200">
                            {client.rateCard ? `AED ${client.rateCard}/hr` : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500">Credit Terms</p>
                          <p className="text-xs text-slate-300 font-medium">
                            {client.creditTerms ? `${client.creditTerms} days` : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-slate-500">
                Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} clients
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!data.pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={!data.pagination.hasNextPage} onClick={() => setPage(p => p + 1)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
