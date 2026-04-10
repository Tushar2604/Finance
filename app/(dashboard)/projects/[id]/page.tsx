'use client'

import React, { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, FolderKanban, Building2, CalendarDays, DollarSign,
  Users, FileText, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  Layers, ChevronRight,
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/* ─── Status helpers ─────────────────────────────────────────── */
const PROJECT_STATUS: Record<string, { color: string; bg: string }> = {
  Active:    { color: 'text-emerald-700', bg: 'bg-emerald-100' },
  Completed: { color: 'text-blue-700',    bg: 'bg-blue-100' },
  'On-Hold': { color: 'text-amber-700',   bg: 'bg-amber-100' },
  Cancelled: { color: 'text-rose-700',    bg: 'bg-rose-100' },
}

const INVOICE_STATUS: Record<string, { color: string; bg: string }> = {
  Paid:          { color: 'text-emerald-700', bg: 'bg-emerald-100' },
  PartiallyPaid: { color: 'text-blue-700',    bg: 'bg-blue-100' },
  Overdue:       { color: 'text-rose-700',    bg: 'bg-rose-100' },
  Sent:          { color: 'text-slate-700',   bg: 'bg-slate-100' },
  Draft:         { color: 'text-slate-500',   bg: 'bg-slate-50' },
}

const DEPLOY_STATUS: Record<string, { color: string; bg: string }> = {
  Active:   { color: 'text-emerald-700', bg: 'bg-emerald-100' },
  'On-Hold':{ color: 'text-amber-700',   bg: 'bg-amber-100' },
  Replaced: { color: 'text-blue-700',    bg: 'bg-blue-100' },
  Ended:    { color: 'text-slate-600',   bg: 'bg-slate-100' },
}

/* ─── KPI Card ───────────────────────────────────────────────── */
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

/* ─── Progress bar ───────────────────────────────────────────── */
function ProgressBar({ pct, color = 'bg-violet-500' }: { pct: number; color?: string }) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
      <div
        className={`${color} h-3 rounded-full transition-all duration-700`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  /* Project */
  const { data: projectData, isLoading: projLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/projects/${id}`)
      return data.data
    },
  })

  /* Deployments for this project */
  const { data: deployData, isLoading: deployLoading } = useQuery({
    queryKey: ['project-deployments', id],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/deployments?projectId=${id}&limit=100`)
      return data.data?.data ?? []
    },
    enabled: !!id,
  })

  /* Invoices for this project */
  const { data: invoiceData, isLoading: invLoading } = useQuery({
    queryKey: ['project-invoices', id],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/invoices?projectId=${id}&limit=100`)
      return data.data?.data ?? []
    },
    enabled: !!id,
  })

  const project   = projectData
  const deploys: any[] = deployData ?? []
  const invoices: any[] = invoiceData ?? []

  /* ─── Computed metrics ───────────────────────────────────────── */
  const totalInvoiced  = invoices.reduce((s, i) => s + (i.totalAmount ?? 0), 0)
  const totalCollected = invoices.reduce((s, i) => s + (i.paidAmount ?? 0), 0)
  const totalOutstanding = totalInvoiced - totalCollected
  const budget = project?.budget ?? 0

  /* % work done: budget-based if budget set, else time-based */
  let workPct = 0
  let workLabel = ''
  if (budget > 0) {
    workPct = Math.min(100, (totalInvoiced / budget) * 100)
    workLabel = `${workPct.toFixed(0)}% of budget invoiced`
  } else if (project?.startDate) {
    const start = new Date(project.startDate)
    const end   = project?.endDate ? new Date(project.endDate) : new Date()
    const total = differenceInDays(end, start)
    const elapsed = differenceInDays(new Date(), start)
    workPct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0
    workLabel = `${workPct.toFixed(0)}% of timeline elapsed`
  }

  const pctColor = workPct >= 100 ? 'bg-emerald-500' : workPct >= 75 ? 'bg-amber-500' : 'bg-violet-500'

  const statusCfg = project?.status ? (PROJECT_STATUS[project.status] ?? { color: 'text-slate-600', bg: 'bg-slate-100' }) : null

  const isLoading = projLoading || deployLoading || invLoading

  if (isLoading) {
    return (
      <div className="space-y-5 pb-10">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <FolderKanban className="h-12 w-12 mb-3 text-slate-300" />
        <p className="font-medium">Project not found</p>
        <Link href="/projects"><Button variant="outline" size="sm" className="mt-3 gap-2"><ArrowLeft className="h-3.5 w-3.5" />Back to Projects</Button></Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-in fade-in pb-10">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground transition-colors flex items-center gap-1">
          <FolderKanban className="h-3.5 w-3.5" /> Projects
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{project.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
              <FolderKanban className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                {statusCfg && (
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
                    {project.status}
                  </span>
                )}
              </div>
              {project.description && (
                <p className="text-muted-foreground text-sm mt-1 max-w-2xl">{project.description}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3">
                {project.clientId && (
                  <Link href={`/clients/${project.clientId._id}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                    <Building2 className="h-3.5 w-3.5" />
                    {project.clientId.name}
                  </Link>
                )}
                {project.startDate && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(new Date(project.startDate), 'dd MMM yyyy')}
                    {project.endDate && <> → {format(new Date(project.endDate), 'dd MMM yyyy')}</>}
                    {!project.endDate && <span className="text-emerald-600 ml-1">(Ongoing)</span>}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link href="/projects">
            <Button variant="outline" size="sm" className="gap-2"><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
          </Link>
        </div>

        {/* Progress */}
        {(budget > 0 || project.startDate) && (
          <div className="mt-5 pt-5 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Work Progress</span>
              <span className="text-sm font-bold text-slate-700">{workPct.toFixed(0)}%</span>
            </div>
            <ProgressBar pct={workPct} color={pctColor} />
            <p className="text-xs text-muted-foreground mt-1.5">{workLabel}</p>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Budget"
          value={budget > 0 ? `AED ${budget.toLocaleString()}` : '—'}
          sub="approved budget"
          color="bg-slate-700 text-white border-slate-800"
        />
        <KpiCard
          icon={FileText}
          label="Total Invoiced"
          value={`AED ${totalInvoiced.toLocaleString()}`}
          sub={`${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`}
          color="bg-violet-600 text-white border-violet-700"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Collected"
          value={`AED ${totalCollected.toLocaleString()}`}
          sub={totalInvoiced > 0 ? `${((totalCollected / totalInvoiced) * 100).toFixed(0)}% of invoiced` : '—'}
          color="bg-emerald-600 text-white border-emerald-700"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Outstanding"
          value={`AED ${totalOutstanding.toLocaleString()}`}
          sub="unpaid balance"
          color={totalOutstanding > 0 ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-200 text-slate-700 border-slate-300'}
        />
      </div>

      {/* Employees / Deployments */}
      <Card className="shadow-sm border-0 border-t-4 border-t-cyan-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-600" />
            Employees on this Project
            <span className="ml-1 text-sm font-normal text-muted-foreground">({deploys.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {deploys.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No employees deployed to this project yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Monthly Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deploys.map((d: any) => {
                    const emp = d.employeeId
                    const monthlyBilling = d.billingType === 'Monthly' ? d.billingRate
                      : d.billingType === 'Daily' ? d.billingRate * 22
                      : d.billingRate * 176
                    const margin = monthlyBilling - (d.salary ?? 0)
                    const st = DEPLOY_STATUS[d.status] ?? { color: 'text-slate-600', bg: 'bg-slate-100' }
                    return (
                      <TableRow key={d._id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{emp?.name ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{emp?.employeeCode ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.position || '—'}</TableCell>
                        <TableCell className="text-sm">
                          AED {d.billingRate?.toLocaleString()}
                          <span className="text-xs text-muted-foreground ml-1">/{d.billingType}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {d.startDate ? format(new Date(d.startDate), 'dd MMM yy') : '—'}
                          {d.endDate && ` → ${format(new Date(d.endDate), 'dd MMM yy')}`}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${st.bg} ${st.color}`}>
                            {d.status}
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-semibold text-sm ${margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {margin >= 0 ? '+' : ''}AED {margin.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card className="shadow-sm border-0 border-t-4 border-t-violet-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-600" />
            Invoices
            <span className="ml-1 text-sm font-normal text-muted-foreground">({invoices.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No invoices raised for this project yet.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv: any) => {
                      const outstanding = (inv.totalAmount ?? 0) - (inv.paidAmount ?? 0)
                      const st = INVOICE_STATUS[inv.status] ?? { color: 'text-slate-600', bg: 'bg-slate-100' }
                      const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && outstanding > 0
                      return (
                        <TableRow key={inv._id} className="hover:bg-slate-50">
                          <TableCell>
                            <Link href={`/invoices/${inv._id}`} className="font-mono font-semibold text-violet-600 hover:underline text-sm">
                              {inv.invoiceNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{inv.month}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {inv.invoiceDate ? format(new Date(inv.invoiceDate), 'dd MMM yyyy') : '—'}
                          </TableCell>
                          <TableCell className={`text-sm ${isOverdue ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}`}>
                            {inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy') : '—'}
                            {isOverdue && <span className="ml-1 text-xs">overdue</span>}
                          </TableCell>
                          <TableCell className="text-right font-medium">AED {(inv.totalAmount ?? 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-semibold">AED {(inv.paidAmount ?? 0).toLocaleString()}</TableCell>
                          <TableCell className={`text-right font-semibold ${outstanding > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {outstanding > 0 ? `AED ${outstanding.toLocaleString()}` : '—'}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.bg} ${st.color}`}>
                              {inv.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {/* Summary row */}
                    <TableRow className="bg-violet-50 font-bold border-t-2 border-violet-200">
                      <TableCell colSpan={4} className="text-violet-800">Total</TableCell>
                      <TableCell className="text-right text-violet-800">AED {totalInvoiced.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-emerald-700">AED {totalCollected.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-amber-700">
                        {totalOutstanding > 0 ? `AED ${totalOutstanding.toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Users className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">Active Staff</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {deploys.filter(d => d.status === 'Active').length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">of {deploys.length} total deployed</p>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">Collection Rate</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {totalInvoiced > 0 ? `${((totalCollected / totalInvoiced) * 100).toFixed(0)}%` : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">of total invoiced amount</p>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Layers className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">Work Done</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{workPct.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground mt-1">{workLabel || 'No timeline or budget set'}</p>
        </div>
      </div>
    </div>
  )
}
