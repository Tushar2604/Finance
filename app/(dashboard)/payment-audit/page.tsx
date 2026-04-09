'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertTriangle, ShieldCheck, RefreshCw, TrendingUp, TrendingDown,
  DollarSign, Users, AlertCircle, CheckCircle2, Info,
  Clock, CreditCard, Banknote, Copy, FileSearch,
} from 'lucide-react'
import { format } from 'date-fns'

// ── hooks ──────────────────────────────────────────────────────────────────────

function useAudit(months: string) {
  return useQuery({
    queryKey: ['payment-audit', months],
    queryFn: async () => {
      const params = months ? `?months=${months}` : ''
      const { data } = await apiClient.get<any>(`/payment-audit${params}`)
      return data.data
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
}

// ── helpers ───────────────────────────────────────────────────────────────────

function getLast3Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function fmtAED(n?: number) {
  return n != null ? `AED ${Math.abs(n).toLocaleString()}` : '—'
}

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  OVERPAYMENT:        { label: 'Overpayment',        icon: TrendingUp,    color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200' },
  UNDERPAYMENT:       { label: 'Underpayment',       icon: TrendingDown,  color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  LATE_PAYMENT:       { label: 'Late Payment',        icon: Clock,         color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  MISSING_PAYMENT:    { label: 'Missing Payment',     icon: AlertCircle,   color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200' },
  DUPLICATE_PAYMENT:  { label: 'Duplicate Payment',   icon: Copy,          color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200' },
  BANK_UNMATCHED:     { label: 'Bank Unmatched',      icon: CreditCard,    color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  RATE_MISMATCH:      { label: 'Rate Mismatch',       icon: DollarSign,    color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  TIMESHEET_MISMATCH: { label: 'Timesheet Mismatch',  icon: FileSearch,    color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
}

const SEVERITY_META = {
  critical: { label: 'Critical', cls: 'bg-rose-100 text-rose-700 border border-rose-200', dot: 'bg-rose-500' },
  warning:  { label: 'Warning',  cls: 'bg-amber-100 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
  info:     { label: 'Info',     cls: 'bg-blue-100 text-blue-700 border border-blue-200', dot: 'bg-blue-400' },
}

// ── subcomponents ──────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const m = SEVERITY_META[severity as keyof typeof SEVERITY_META] ?? SEVERITY_META.info
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

function AlertCard({ alert }: { alert: any }) {
  const meta = CATEGORY_META[alert.category] ?? CATEGORY_META.RATE_MISMATCH
  const Icon = meta.icon
  return (
    <div className={`rounded-xl border p-4 ${meta.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white border ${meta.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-bold uppercase tracking-wide ${meta.color}`}>{meta.label}</span>
            <SeverityBadge severity={alert.severity} />
            <span className="text-xs text-slate-500 font-mono">{alert.month}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-800 text-sm">{alert.employeeName}</span>
            {alert.employeeCode && (
              <span className="text-xs text-slate-400 font-mono">{alert.employeeCode}</span>
            )}
          </div>
          <p className="text-sm text-slate-700">{alert.message}</p>
          {(alert.expected != null || alert.actual != null) && (
            <div className="flex gap-4 mt-2 text-xs">
              {alert.expected != null && (
                <span className="text-slate-500">Expected: <strong className="text-slate-700">{fmtAED(alert.expected)}</strong></span>
              )}
              {alert.actual != null && (
                <span className="text-slate-500">Actual: <strong className="text-slate-700">{fmtAED(alert.actual)}</strong></span>
              )}
              {alert.delta != null && (
                <span className={`font-semibold ${alert.delta > 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                  {alert.delta > 0 ? '+' : ''}{fmtAED(alert.delta)}
                </span>
              )}
            </div>
          )}
          {alert.paymentDate && (
            <p className="text-xs text-slate-400 mt-1">
              Paid: {format(new Date(alert.paymentDate), 'dd MMM yyyy')}
              {alert.paymentMode && ` via ${alert.paymentMode}`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function CashFlowCard({ row }: { row: any }) {
  const isPositive = row.netCashFlow >= 0
  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{row.month}</div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Revenue In</span>
          <span className="font-semibold text-emerald-600">{fmtAED(row.totalRevenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Salary Out ({row.salaryCount} staff)</span>
          <span className="font-semibold text-rose-600">−{fmtAED(row.totalSalaryOut)}</span>
        </div>
        <div className={`flex justify-between pt-2 border-t font-bold ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
          <span>Net Cash Flow</span>
          <span>{isPositive ? '+' : '−'}{fmtAED(Math.abs(row.netCashFlow))}</span>
        </div>
      </div>
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

const FILTER_CATEGORIES = ['All', 'OVERPAYMENT', 'UNDERPAYMENT', 'LATE_PAYMENT', 'MISSING_PAYMENT', 'DUPLICATE_PAYMENT', 'BANK_UNMATCHED', 'RATE_MISMATCH', 'TIMESHEET_MISMATCH']
const FILTER_SEVERITIES = ['All', 'critical', 'warning', 'info']

export default function PaymentAuditPage() {
  const [months] = useState(() => getLast3Months().join(','))
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [severityFilter, setSeverityFilter] = useState('All')
  const { data, isLoading, refetch, isFetching } = useAudit(months)

  const filteredAlerts = (data?.alerts ?? []).filter((a: any) => {
    if (categoryFilter !== 'All' && a.category !== categoryFilter) return false
    if (severityFilter !== 'All' && a.severity !== severityFilter) return false
    return true
  })

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* Header */}
      <div className="flex justify-between items-start bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-rose-600" />
            Payment Integrity Audit
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Rule-based engine that checks every salary payment for correctness, timing, and bank match.
          </p>
          {data?.runAt && (
            <p className="text-xs text-slate-400 mt-1">Last run: {format(new Date(data.runAt), 'dd MMM yyyy, HH:mm')}</p>
          )}
        </div>
        <Button onClick={() => refetch()} disabled={isFetching} className="gap-2 bg-rose-600 hover:bg-rose-700 text-white">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Running…' : 'Run Audit'}
        </Button>
      </div>

      {/* Summary KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Salaries Scanned', value: String(data.totalSalaries), icon: Users, color: 'bg-slate-600' },
            { label: 'Critical Alerts', value: String(data.criticalCount), icon: AlertTriangle, color: data.criticalCount > 0 ? 'bg-rose-600' : 'bg-emerald-500' },
            { label: 'Warnings', value: String(data.warningCount), icon: AlertCircle, color: data.warningCount > 0 ? 'bg-amber-500' : 'bg-emerald-500' },
            { label: 'Total Issues', value: String(data.totalAlerts), icon: data.totalAlerts === 0 ? CheckCircle2 : Info, color: data.totalAlerts === 0 ? 'bg-emerald-500' : 'bg-blue-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className="text-3xl font-black mt-1">{value}</p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Cash Flow Summary */}
      {data?.cashFlow?.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Banknote className="h-4 w-4" /> Monthly Cash Flow
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {data.cashFlow.map((row: any) => <CashFlowCard key={row.month} row={row} />)}
          </div>
        </div>
      )}

      {/* Alerts */}
      <Card className="shadow-sm border-0 border-t-4 border-t-rose-500">
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" /> Flagged Issues
              </CardTitle>
              <CardDescription>
                {data?.totalAlerts === 0 ? 'No issues detected — all payments look correct.' : `${filteredAlerts.length} issue${filteredAlerts.length !== 1 ? 's' : ''} shown`}
              </CardDescription>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <select
                className="border rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white"
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
              >
                {FILTER_SEVERITIES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Severities' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <select
                className="border rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                {FILTER_CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Categories' : (CATEGORY_META[c]?.label ?? c)}
                  </option>
                ))}
              </select>
              {(categoryFilter !== 'All' || severityFilter !== 'All') && (
                <Button variant="ghost" size="sm" onClick={() => { setCategoryFilter('All'); setSeverityFilter('All') }}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
              <p className="font-semibold text-slate-700">
                {data?.totalAlerts === 0 ? 'All payments verified — no issues found.' : 'No issues match the current filters.'}
              </p>
              <p className="text-sm mt-1">Run the audit after each payroll cycle to stay ahead of discrepancies.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert: any) => <AlertCard key={alert.id} alert={alert} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rules reference */}
      <Card className="shadow-sm bg-slate-50 border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-600">
            <Info className="h-4 w-4" /> What this engine checks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              ['Duplicate Payment', 'Same employee paid more than once in the same month'],
              ['Rate Mismatch', 'Net salary differs >5% from the contract base salary'],
              ['Late Payment', 'Salary paid more than 7 days after month-end'],
              ['Missing Payment', 'Active employee has no salary record for a month'],
              ['Bank Unmatched', 'Bank-paid salary has no matching bank debit transaction (±2% / ±3 days)'],
              ['Timesheet Mismatch', 'Paid salary vs hours-worked implied pay differs >15% and >AED 500'],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span><strong className="text-slate-700">{title}:</strong> <span className="text-slate-500">{desc}</span></span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
