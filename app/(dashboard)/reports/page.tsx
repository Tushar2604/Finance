'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { BarChart3, TrendingUp, Users, Building2, Wallet, Clock, DollarSign } from 'lucide-react'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `AED ${(n / 1_000).toFixed(1)}K`
  return `AED ${n.toFixed(0)}`
}

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function marginClass(m: number) {
  if (m > 20) return 'text-emerald-400'
  if (m >= 0) return 'text-amber-400'
  return 'text-red-400'
}

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = `${CURRENT_YEAR}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}

function shortMonth(m: string) {
  const [, mon] = m.split('-')
  return MONTH_LABELS[mon] ?? m
}

// ── data hooks ────────────────────────────────────────────────────────────────

function usePL(year: number) {
  return useQuery({
    queryKey: ['reports-pl', year],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/reports/pl?year=${year}`)
      return data.data
    },
    staleTime: 60_000,
  })
}

function useEmpProfitability(month: string) {
  return useQuery({
    queryKey: ['reports-emp-profit', month],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/reports/employee-profitability?month=${month}`)
      return data.data ?? []
    },
    staleTime: 60_000,
  })
}

function useClientProfitability(year: number, month: string) {
  return useQuery({
    queryKey: ['reports-client-profit', year, month],
    queryFn: async () => {
      const p = month ? `month=${month}` : `year=${year}`
      const { data } = await apiClient.get<any>(`/reports/client-profitability?${p}`)
      return data.data ?? []
    },
    staleTime: 60_000,
  })
}

function useAgingReport() {
  return useQuery({
    queryKey: ['reports-aging'],
    queryFn: async () => {
      const { data } = await apiClient.get<any>('/reports/receivables-aging')
      return data.data
    },
    staleTime: 30_000,
  })
}

function useCashFlow(year: number) {
  return useQuery({
    queryKey: ['reports-cashflow', year],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/reports/cash-flow?year=${year}`)
      return data.data ?? []
    },
    staleTime: 60_000,
  })
}

function useSalaryPayment(month: string) {
  return useQuery({
    queryKey: ['reports-salary', month],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/reports/salary-payment?month=${month}`)
      return data.data
    },
    staleTime: 60_000,
    enabled: !!month,
  })
}

// ── P&L Tab ───────────────────────────────────────────────────────────────────

function PLReport() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const { data, isLoading } = usePL(year)
  const months: any[] = data?.months ?? []
  const totals = data?.totals

  const chartData = months.map((m) => ({ ...m, name: shortMonth(m.month) }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">Profit & Loss Report</h2>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
          {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* KPI row */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Revenue', value: fmt(totals.revenue), color: 'text-blue-400' },
            { label: 'Salary Cost', value: fmt(totals.salaryCost), color: 'text-amber-400' },
            { label: 'Expenses', value: fmt(totals.expenses), color: 'text-rose-400' },
            { label: 'Net Profit', value: fmt(totals.netProfit), color: totals.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
            { label: 'Margin', value: pct(totals.margin ?? 0), color: marginClass(totals.margin ?? 0) },
          ].map((k) => (
            <div key={k.label} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Monthly Trend</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" dot={false} />
            <Line type="monotone" dataKey="salaryCost" stroke="#f59e0b" strokeWidth={2} name="Salary" dot={false} />
            <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" dot={false} />
            <Line type="monotone" dataKey="netProfit" stroke="#10b981" strokeWidth={2} name="Net Profit" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60">
              {['Month', 'Revenue', 'Salary Cost', 'Expenses', 'Net Profit', 'Margin'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-slate-700/30">
                  {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-700 rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : months.map((m: any) => (
              <tr key={m.month} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                <td className="px-4 py-3 text-white font-medium">{m.month}</td>
                <td className="px-4 py-3 text-blue-400">{fmt(m.revenue)}</td>
                <td className="px-4 py-3 text-amber-400">{fmt(m.salaryCost)}</td>
                <td className="px-4 py-3 text-rose-400">{fmt(m.expenses)}</td>
                <td className={`px-4 py-3 font-semibold ${m.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(m.netProfit)}</td>
                <td className={`px-4 py-3 font-semibold ${marginClass(m.margin)}`}>{pct(m.margin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Employee Profitability Tab ─────────────────────────────────────────────────

function EmployeeProfitability() {
  const [month, setMonth] = useState(CURRENT_MONTH)
  const { data: rows = [], isLoading } = useEmpProfitability(month)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">Employee Profitability</h2>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
      </div>
      <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60">
              {['Code', 'Name', 'Position', 'Billing Total', 'Salary Cost', 'Profit', 'Margin'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-slate-700/30">
                  {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-700 rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-slate-500">No data for this period.</td></tr>
            ) : rows.map((r: any) => (
              <tr key={r.employeeId} className={`border-b border-slate-700/30 hover:bg-slate-700/20 ${r.margin < 0 ? 'bg-red-900/10' : r.margin < 20 ? 'bg-amber-900/10' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.employeeCode}</td>
                <td className="px-4 py-3 text-white font-medium">{r.name}</td>
                <td className="px-4 py-3 text-slate-400">{r.position}</td>
                <td className="px-4 py-3 text-blue-400">{fmt(r.billingTotal)}</td>
                <td className="px-4 py-3 text-amber-400">{fmt(r.salaryCost)}</td>
                <td className={`px-4 py-3 font-semibold ${r.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(r.profit)}</td>
                <td className={`px-4 py-3 font-semibold ${marginClass(r.margin)}`}>{pct(r.margin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Client Profitability Tab ───────────────────────────────────────────────────

function ClientProfitability() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [month, setMonth] = useState('')
  const { data: rows = [], isLoading } = useClientProfitability(year, month)

  const top5 = [...rows].sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-white font-bold text-lg flex-1">Client Profitability</h2>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          placeholder="Filter by month"
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
          {[CURRENT_YEAR, CURRENT_YEAR - 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {top5.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Top 5 Clients by Revenue</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top5.map((r: any) => ({ name: r.name.split(' ')[0], revenue: r.revenue, profit: r.profit }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
              <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60">
              {['Client', 'Industry', 'Revenue', 'Est. Cost', 'Profit', 'Margin'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-slate-700/30">
                  {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-700 rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : rows.map((r: any) => (
              <tr key={r.clientId} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                <td className="px-4 py-3 text-white font-medium">{r.name}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{r.industry || '—'}</td>
                <td className="px-4 py-3 text-blue-400">{fmt(r.revenue)}</td>
                <td className="px-4 py-3 text-amber-400">{fmt(r.cost)}</td>
                <td className={`px-4 py-3 font-semibold ${r.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(r.profit)}</td>
                <td className={`px-4 py-3 font-semibold ${marginClass(r.margin)}`}>{pct(r.margin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Receivables Aging Tab ─────────────────────────────────────────────────────

function ReceivablesAging() {
  const { data, isLoading } = useAgingReport()
  const summary = data?.summary ?? {}
  const clientBreakdown: any[] = data?.clientBreakdown ?? []

  const buckets = [
    { key: 'current', label: 'Current', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { key: 'bucket_0_30', label: '0–30 days', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { key: 'bucket_31_60', label: '31–60 days', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
    { key: 'bucket_61_90', label: '61–90 days', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
    { key: 'bucket_90_plus', label: '90+ days', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-white font-bold text-lg">Receivables Aging</h2>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {buckets.map((b) => (
          <div key={b.key} className={`border rounded-xl p-4 ${b.color}`}>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{b.label}</p>
            <p className="text-xl font-bold mt-1">{fmt(summary[b.key] ?? 0)}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60">
              {['Client', 'Current', '0–30d', '31–60d', '61–90d', '90+d', 'Total'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="border-b border-slate-700/30">
                  {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-700 rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : clientBreakdown.map((c: any) => (
              <tr key={c.clientId} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                <td className="px-4 py-3 text-white font-medium">{c.clientName}</td>
                <td className="px-4 py-3 text-emerald-400">{fmt(c.current ?? 0)}</td>
                <td className="px-4 py-3 text-amber-400">{fmt(c.bucket_0_30 ?? 0)}</td>
                <td className="px-4 py-3 text-orange-400">{fmt(c.bucket_31_60 ?? 0)}</td>
                <td className="px-4 py-3 text-red-400">{fmt(c.bucket_61_90 ?? 0)}</td>
                <td className="px-4 py-3 text-rose-400">{fmt(c.bucket_90_plus ?? 0)}</td>
                <td className="px-4 py-3 text-white font-semibold">{fmt(c.total ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Cash Flow Tab ─────────────────────────────────────────────────────────────

function CashFlowReport() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const { data: rows = [], isLoading } = useCashFlow(year)

  const chartData = rows.map((r: any) => ({ ...r, name: shortMonth(r.month) }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">Cash Flow</h2>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
          {[CURRENT_YEAR, CURRENT_YEAR - 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Inflow vs Outflow</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
            <Legend />
            <Area type="monotone" dataKey="inflow" stroke="#3b82f6" fill="#3b82f620" name="Inflow" strokeWidth={2} />
            <Area type="monotone" dataKey="salaryOutflow" stroke="#f59e0b" fill="#f59e0b20" name="Salary" strokeWidth={2} />
            <Area type="monotone" dataKey="expenseOutflow" stroke="#ef444480" fill="#ef444410" name="Expenses" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60">
              {['Month', 'Inflow', 'Salary Out', 'Expense Out', 'Net', 'Running Balance'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-slate-700/30">
                  {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-700 rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : rows.map((r: any) => (
              <tr key={r.month} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                <td className="px-4 py-3 text-white font-medium">{r.month}</td>
                <td className="px-4 py-3 text-blue-400">{fmt(r.inflow)}</td>
                <td className="px-4 py-3 text-amber-400">{fmt(r.salaryOutflow)}</td>
                <td className="px-4 py-3 text-rose-400">{fmt(r.expenseOutflow)}</td>
                <td className={`px-4 py-3 font-semibold ${r.netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(r.netCashFlow)}</td>
                <td className={`px-4 py-3 font-semibold ${r.runningBalance >= 0 ? 'text-slate-200' : 'text-red-400'}`}>{fmt(r.runningBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Salary Payment Tab ────────────────────────────────────────────────────────

function SalaryPaymentReport() {
  const [month, setMonth] = useState(CURRENT_MONTH)
  const { data, isLoading } = useSalaryPayment(month)
  const salaries: any[] = data?.salaries ?? []
  const summary = data?.summary ?? {}

  const statusColors: Record<string, string> = {
    Paid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">Salary Payment Report</h2>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
      </div>

      {Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Paid', value: fmt(summary.totalPaid ?? 0), color: 'text-emerald-400' },
            { label: 'Pending', value: fmt(summary.totalPending ?? 0), color: 'text-amber-400' },
            { label: 'Failed', value: fmt(summary.totalFailed ?? 0), color: 'text-red-400' },
            { label: 'Grand Total', value: fmt(summary.grandTotal ?? 0), color: 'text-white' },
          ].map((k) => (
            <div key={k.label} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60">
              {['Employee', 'Position', 'Net Salary', 'Payment Mode', 'Status', 'Payment Date'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="border-b border-slate-700/30">
                  {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-700 rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : salaries.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center text-slate-500">No salary records for this month.</td></tr>
            ) : salaries.map((s: any) => (
              <tr key={s._id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{s.employeeId?.name ?? '—'}</p>
                  <p className="text-slate-500 text-xs">{s.employeeId?.employeeCode ?? ''}</p>
                </td>
                <td className="px-4 py-3 text-slate-400">{s.employeeId?.position ?? '—'}</td>
                <td className="px-4 py-3 text-white font-semibold">{fmt(s.netSalary)}</td>
                <td className="px-4 py-3 text-slate-400">{s.paymentMode}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusColors[s.paymentStatus] ?? 'text-slate-400 border-slate-600'}`}>
                    {s.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {s.paymentDate ? new Date(s.paymentDate).toLocaleDateString('en-AE') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-slate-900 -m-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reports & Analytics</h1>
          <p className="text-slate-400 text-sm">Financial insights across P&L, employees, clients, and cash flow.</p>
        </div>
      </div>

      <Tabs defaultValue="pl">
        <TabsList className="bg-slate-800/60 border border-slate-700/60 mb-6 h-auto flex-wrap gap-1 p-1">
          {[
            { value: 'pl', label: 'P&L', icon: TrendingUp },
            { value: 'emp', label: 'Employee Profitability', icon: Users },
            { value: 'client', label: 'Client Profitability', icon: Building2 },
            { value: 'aging', label: 'Receivables Aging', icon: Clock },
            { value: 'cashflow', label: 'Cash Flow', icon: DollarSign },
            { value: 'salary', label: 'Salary Payment', icon: Wallet },
          ].map((t) => (
            <TabsTrigger key={t.value} value={t.value}
              className="flex items-center gap-1.5 text-slate-400 data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="pl"><PLReport /></TabsContent>
        <TabsContent value="emp"><EmployeeProfitability /></TabsContent>
        <TabsContent value="client"><ClientProfitability /></TabsContent>
        <TabsContent value="aging"><ReceivablesAging /></TabsContent>
        <TabsContent value="cashflow"><CashFlowReport /></TabsContent>
        <TabsContent value="salary"><SalaryPaymentReport /></TabsContent>
      </Tabs>
    </div>
  )
}
