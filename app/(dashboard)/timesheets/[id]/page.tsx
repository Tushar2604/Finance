'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft, Clock, Calendar, User, Building2,
  FolderKanban, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, Minus,
} from 'lucide-react'
import { format } from 'date-fns'

function useTimesheet(id: string) {
  return useQuery({
    queryKey: ['timesheet', id],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/timesheets/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}h</span>
      </div>
      <Progress value={pct} className={`h-2 ${color}`} />
    </div>
  )
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: 'green' | 'red' | 'amber' }) {
  const colorMap = { green: 'text-emerald-600', red: 'text-rose-600', amber: 'text-amber-600' }
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className={`font-medium text-sm ${mono ? 'font-mono text-xs' : ''} ${highlight ? colorMap[highlight] : ''}`}>
        {value}
      </dd>
    </div>
  )
}

const statusIcon = (s: string) => {
  if (s === 'Approved') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  if (s === 'Rejected') return <XCircle className="h-4 w-4 text-rose-500" />
  if (s === 'Submitted') return <AlertCircle className="h-4 w-4 text-amber-500" />
  return <Minus className="h-4 w-4 text-slate-400" />
}

const statusVariant = (s: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
  if (s === 'Approved') return 'default'
  if (s === 'Rejected') return 'destructive'
  if (s === 'Submitted') return 'secondary'
  return 'outline'
}

export default function TimesheetProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: ts, isLoading, error } = useTimesheet(id)

  if (isLoading) {
    return (
      <div className="space-y-6 pb-10">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      </div>
    )
  }

  if (error || !ts) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-600">Timesheet not found.</div>
      </div>
    )
  }

  const totalHours = ts.hours ?? 0
  const billableHours = ts.billableHours ?? totalHours
  const nonBillableHours = ts.nonBillableHours ?? 0
  const overtimeHours = ts.overtimeHours ?? 0
  const leaveDays = ts.leaveDays ?? 0
  const absentDays = ts.absentDays ?? 0
  const workingDays = ts.workingDays ?? 22
  const utilization = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0

  const emp = ts.employeeId
  const client = ts.clientId
  const project = ts.projectId

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to Timesheets
      </Button>

      {/* Header */}
      <Card className="shadow-sm border overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-teal-500 to-cyan-600" />
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start gap-6">
            <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center shrink-0">
              <Clock className="w-7 h-7 text-teal-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">Timesheet — {ts.month}</h1>
                <div className="flex items-center gap-1.5">
                  {statusIcon(ts.status)}
                  <Badge variant={statusVariant(ts.status)}>{ts.status}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-muted-foreground">
                {emp && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {emp.name ?? `${emp.firstName} ${emp.lastName}`}
                    {emp.employeeCode && <span className="font-mono text-xs">({emp.employeeCode})</span>}
                  </span>
                )}
                {client && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {client.name}
                  </span>
                )}
                {project && (
                  <span className="flex items-center gap-1.5">
                    <FolderKanban className="h-3.5 w-3.5" />
                    {project.name}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-3xl font-bold text-teal-700">{totalHours}h</div>
              <div className="text-xs text-muted-foreground mt-0.5">Total hours</div>
              <div className="text-sm font-semibold text-indigo-600 mt-1">{utilization}% billable</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Working Days', value: workingDays, suffix: 'days', icon: Calendar, color: 'bg-blue-500' },
          { label: 'Billable Hours', value: billableHours, suffix: 'hrs', icon: TrendingUp, color: 'bg-emerald-500' },
          { label: 'Leave Days', value: leaveDays, suffix: 'days', icon: AlertCircle, color: 'bg-amber-500' },
          { label: 'Absent Days', value: absentDays, suffix: 'days', icon: XCircle, color: 'bg-rose-500' },
        ].map(({ label, value, suffix, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-bold mt-1">{value}</p>
                  <p className="text-xs text-muted-foreground">{suffix}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hours breakdown + Details */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-sm border-0 border-t-4 border-t-teal-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Hours Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatBar label="Billable Hours" value={billableHours} max={totalHours || 1} color="[&>div]:bg-emerald-500" />
            <StatBar label="Non-Billable Hours" value={nonBillableHours} max={totalHours || 1} color="[&>div]:bg-slate-400" />
            <StatBar label="Overtime Hours" value={overtimeHours} max={totalHours || 1} color="[&>div]:bg-amber-500" />
            <div className="pt-2 border-t">
              <Row label="Utilization Rate" value={`${utilization}%`} highlight={utilization >= 80 ? 'green' : utilization >= 50 ? 'amber' : 'red'} />
              <Row label="Total Hours Logged" value={`${totalHours}h`} />
              <Row label="Working Days" value={`${workingDays} days`} />
              <Row label="Leave Days" value={`${leaveDays} days`} />
              <Row label="Absent Days" value={`${absentDays} days`} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 border-t-4 border-t-slate-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Timesheet Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-0">
              <Row label="Employee" value={emp ? (emp.name ?? `${emp.firstName} ${emp.lastName}`) : '—'} />
              <Row label="Employee Code" value={emp?.employeeCode ?? '—'} mono />
              <Row label="Client" value={client?.name ?? '—'} />
              <Row label="Project" value={project?.name ?? '—'} />
              <Row label="Month" value={ts.month} />
              <Row label="Status" value={ts.status} />
              {ts.approvalDate && (
                <Row label="Approved On" value={format(new Date(ts.approvalDate), 'dd MMM yyyy')} />
              )}
              <Row label="Created" value={ts.createdAt ? format(new Date(ts.createdAt), 'dd MMM yyyy') : '—'} />
              {ts.notes && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Notes</p>
                  <p className="text-sm text-slate-700">{ts.notes}</p>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
