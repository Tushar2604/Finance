'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboard } from '@/lib/hooks/useDashboard'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, RadialBarChart, RadialBar, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, AlertCircle,
  DollarSign, Wallet, Percent, ArrowUpRight, ArrowDownRight,
  CheckCircle2,
} from 'lucide-react'

/* ── helpers ──────────────────────────────────────────── */
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}
function fmtAED(n: number) { return `AED ${fmt(n)}` }
function fmtPct(n: number) { return `${n.toFixed(1)}%` }

/* ── custom tooltip ───────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
      <div className="font-semibold text-slate-700 mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium text-slate-800">AED {Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

/* ── skeleton card ────────────────────────────────────── */
function SkeletonCard() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-40" />
      </CardContent>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════
   WIDGET 1 — Revenue vs Salary (Live)
══════════════════════════════════════════════════════ */
function RevenueVsSalaryWidget({ snapshots }: { snapshots: any[] }) {
  const curMonth = snapshots[snapshots.length - 1]
  const revGtSal = (curMonth?.revenue ?? 0) >= (curMonth?.salary ?? 0)

  return (
    <Card className="col-span-2 shadow-sm border-0 border-t-4 border-t-emerald-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Revenue vs Salary — Last 6 Months
            </CardTitle>
            <CardDescription>Monthly billing revenue compared to total salary payout</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">This month</div>
            <div className={`text-sm font-bold flex items-center gap-1 justify-end ${revGtSal ? 'text-emerald-600' : 'text-rose-600'}`}>
              {revGtSal
                ? <ArrowUpRight className="h-4 w-4" />
                : <ArrowDownRight className="h-4 w-4" />}
              {fmtAED(curMonth?.revenue ?? 0)} rev
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={snapshots} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}K`}
              width={40}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
            <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="salary" name="Salary" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Line
              dataKey="profit"
              name="Profit"
              type="monotone"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════
   WIDGET 2 — Outstanding Payments
══════════════════════════════════════════════════════ */
function OutstandingWidget({
  outstandingAmount, outstandingCount, overdueAmount, overdueCount,
}: {
  outstandingAmount: number; outstandingCount: number
  overdueAmount: number; overdueCount: number
}) {
  const nonOverdueAmt = outstandingAmount - overdueAmount
  const gaugeData = [
    { name: 'Overdue', value: overdueAmount, fill: '#f43f5e' },
    { name: 'Pending', value: nonOverdueAmt, fill: '#fb923c' },
  ]
  const overdueRatio = outstandingAmount > 0
    ? Math.round((overdueAmount / outstandingAmount) * 100)
    : 0

  return (
    <Card className="shadow-sm border-0 border-t-4 border-t-rose-500">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          Outstanding Payments
        </CardTitle>
        <CardDescription>{outstandingCount} unpaid invoices</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Mini radial */}
          <div className="relative w-24 h-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius="55%" outerRadius="85%"
                startAngle={90} endAngle={-270}
                data={gaugeData}
                barSize={10}
              >
                <RadialBar dataKey="value" background={{ fill: '#f1f5f9' }} cornerRadius={6}>
                  {gaugeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </RadialBar>
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-black text-rose-600">{overdueRatio}%</span>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Total Outstanding</div>
              <div className="text-2xl font-black text-slate-800">{fmtAED(outstandingAmount)}</div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-rose-50 rounded-lg px-3 py-2">
                <div className="text-xs text-rose-600 font-medium">Overdue</div>
                <div className="text-sm font-bold text-rose-700">{fmtAED(overdueAmount)}</div>
                <div className="text-xs text-rose-500">{overdueCount} invoices</div>
              </div>
              <div className="flex-1 bg-amber-50 rounded-lg px-3 py-2">
                <div className="text-xs text-amber-600 font-medium">Pending</div>
                <div className="text-sm font-bold text-amber-700">{fmtAED(nonOverdueAmt)}</div>
                <div className="text-xs text-amber-500">{outstandingCount - overdueCount} invoices</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════
   WIDGET 3 — Active Employees
══════════════════════════════════════════════════════ */
function ActiveEmployeesWidget({
  activeEmployees, totalEmployees,
}: {
  activeEmployees: number; totalEmployees: number
}) {
  const pct = totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 0
  const inactive = totalEmployees - activeEmployees
  const gaugeData = [
    { name: 'Active', value: activeEmployees, fill: '#f59e0b' },
    { name: 'Inactive', value: inactive, fill: '#e2e8f0' },
  ]

  return (
    <Card className="shadow-sm border-0 border-t-4 border-t-amber-500">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-amber-600" />
          Active Employees
        </CardTitle>
        <CardDescription>Current workforce utilisation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Mini radial */}
          <div className="relative w-24 h-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius="55%" outerRadius="85%"
                startAngle={90} endAngle={-270}
                data={gaugeData}
                barSize={10}
              >
                <RadialBar dataKey="value" background={{ fill: '#f1f5f9' }} cornerRadius={6}>
                  {gaugeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </RadialBar>
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-black text-amber-600">{pct}%</span>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Active Headcount</div>
              <div className="text-2xl font-black text-slate-800">{activeEmployees}</div>
              <div className="text-xs text-muted-foreground">of {totalEmployees} total employees</div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-amber-50 rounded-lg px-3 py-2">
                <div className="text-xs text-amber-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Active
                </div>
                <div className="text-sm font-bold text-amber-700">{activeEmployees}</div>
              </div>
              <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500 font-medium">Inactive</div>
                <div className="text-sm font-bold text-slate-600">{inactive}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════
   WIDGET 4 — Profit %
══════════════════════════════════════════════════════ */
function ProfitWidget({
  currentProfitPct, currentProfit, currentRevenue, snapshots,
}: {
  currentProfitPct: number; currentProfit: number; currentRevenue: number; snapshots: any[]
}) {
  const isPositive = currentProfitPct >= 0
  const clampedPct = Math.min(100, Math.max(0, currentProfitPct))
  const color = currentProfitPct >= 20 ? '#10b981' : currentProfitPct >= 0 ? '#f59e0b' : '#f43f5e'

  // Spark bars from monthly profit %
  const sparkData = snapshots.map(s => ({
    label: s.label,
    pct: Math.max(-100, Math.min(100, s.profitPct)),
  }))

  return (
    <Card className="shadow-sm border-0 border-t-4" style={{ borderTopColor: color }}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Percent className="h-4 w-4" style={{ color }} />
          Profit Margin
        </CardTitle>
        <CardDescription>This month's net profit as % of revenue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Big number */}
        <div className="flex items-end gap-3">
          <div className="text-4xl font-black" style={{ color }}>
            {isPositive ? '+' : ''}{fmtPct(currentProfitPct)}
          </div>
          <div className="mb-1">
            {isPositive
              ? <Badge className="bg-emerald-100 text-emerald-700 text-xs gap-1"><TrendingUp className="h-3 w-3" /> Profitable</Badge>
              : <Badge className="bg-rose-100 text-rose-700 text-xs gap-1"><TrendingDown className="h-3 w-3" /> Loss</Badge>}
          </div>
        </div>

        {/* Progress arc */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Profit</span>
            <span>{fmtAED(currentProfit)} of {fmtAED(currentRevenue)} revenue</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${clampedPct}%`, backgroundColor: color }}
            />
          </div>
        </div>

        {/* Mini sparkline — profit % trend */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">6-month trend</div>
          <ResponsiveContainer width="100%" height={48}>
            <ComposedChart data={sparkData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Bar dataKey="pct" radius={[3, 3, 0, 0]} maxBarSize={20}>
                {sparkData.map((entry, i) => (
                  <Cell key={i} fill={entry.pct >= 20 ? '#10b981' : entry.pct >= 0 ? '#f59e0b' : '#f43f5e'} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════
   KPI STAT CARD (top row)
══════════════════════════════════════════════════════ */
function StatCard({
  label, value, sub, icon: Icon, iconBg, iconColor, trend,
}: {
  label: string; value: string; sub: string
  icon: React.ElementType; iconBg: string; iconColor: string
  trend?: 'up' | 'down' | null
}) {
  return (
    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-black text-slate-900">{value}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 text-rose-500" />}
              {sub}
            </p>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard()

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">
          Financial Overview
        </h2>
        <p className="text-muted-foreground mt-1">Live KPIs and performance widgets for this month.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
          Failed to load dashboard data.
        </div>
      )}

      {/* ── Top KPI row ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
        ) : data ? (
          <>
            <StatCard
              label="Total Revenue"
              value={fmtAED(data.totalRevenue)}
              sub="All-time paid invoices"
              icon={DollarSign}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              trend="up"
            />
            <StatCard
              label="Net Profit"
              value={fmtAED(data.netProfit)}
              sub={`Margin ${fmtPct(data.profitMargin)}`}
              icon={TrendingUp}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              trend={data.netProfit >= 0 ? 'up' : 'down'}
            />
            <StatCard
              label="Active Employees"
              value={String(data.activeEmployees)}
              sub={`${data.totalEmployees} total headcount`}
              icon={Users}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
            <StatCard
              label="Outstanding"
              value={fmtAED(data.outstandingAmount)}
              sub={`${data.outstandingCount} unpaid invoices`}
              icon={Wallet}
              iconBg="bg-rose-100"
              iconColor="text-rose-600"
              trend="down"
            />
          </>
        ) : null}
      </div>

      {/* ── Main widgets ── */}
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className={i === 0 ? 'col-span-2' : ''}>
              <CardContent className="pt-6">
                <Skeleton className="h-[260px] w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Revenue vs Salary — full width */}
          <RevenueVsSalaryWidget snapshots={data.monthlySnapshots} />

          {/* Outstanding + Employees + Profit — 3-col bottom row */}
          <div className="lg:col-span-2 grid gap-4 sm:grid-cols-3">
            <OutstandingWidget
              outstandingAmount={data.outstandingAmount}
              outstandingCount={data.outstandingCount}
              overdueAmount={data.overdueAmount}
              overdueCount={data.overdueCount}
            />
            <ActiveEmployeesWidget
              activeEmployees={data.activeEmployees}
              totalEmployees={data.totalEmployees}
            />
            <ProfitWidget
              currentProfitPct={data.currentProfitPct}
              currentProfit={data.currentProfit}
              currentRevenue={data.currentRevenue}
              snapshots={data.monthlySnapshots}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
