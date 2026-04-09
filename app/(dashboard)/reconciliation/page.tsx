'use client'

import React, { useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfidenceBadge } from '@/components/reconciliation/ConfidenceBadge'
import {
  RefreshCw, CheckCircle2, XCircle, ArrowRight, Building2,
  Wallet, Receipt, FileText, X, Search, GitMerge, Zap,
  CheckCheck, ArrowLeftRight, ChevronDown,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BankTx {
  _id: string
  description: string
  amount: number
  type: 'Credit' | 'Debit'
  date: string
  reference?: string
  counterparty?: string
  matchStatus?: string
  reconciliationConfidence?: number
}

interface SystemRecord {
  _id: string
  type: 'Invoice' | 'Salary' | 'Expense'
  label: string
  amount: number
  date: string
  status: string
  ref?: string
  party?: string
}

interface MatchSuggestion {
  bankTx: BankTx
  systemRecord: SystemRecord
  confidence: number
  reasons: string[]
  amountDiff: number
  dateDiff: number
}

// ─── API Hooks ─────────────────────────────────────────────────────────────────

function useBankTransactions(month: string) {
  return useQuery({
    queryKey: ['bank-recon', month],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' })
      if (month) params.append('month', month)
      const { data } = await apiClient.get<any>(`/bank?${params}`)
      return (data.data?.data ?? []) as BankTx[]
    },
  })
}

function useSystemRecords(month: string) {
  return useQuery({
    queryKey: ['system-records', month],
    queryFn: async () => {
      const [inv, sal, exp] = await Promise.all([
        apiClient.get<any>(`/invoices?limit=50`),
        apiClient.get<any>(`/salaries?limit=50`),
        apiClient.get<any>(`/expenses?limit=50`),
      ])
      const invoices: SystemRecord[] = (inv.data.data?.data ?? []).map((i: any) => ({
        _id: i._id,
        type: 'Invoice',
        label: i.invoiceNumber ?? `INV-${i._id.slice(-6)}`,
        amount: i.totalAmount,
        date: i.issueDate ?? i.createdAt,
        status: i.status,
        ref: i.invoiceNumber,
        party: i.clientId?.name ?? i.clientId,
      }))
      const salaries: SystemRecord[] = (sal.data.data?.data ?? []).map((s: any) => ({
        _id: s._id,
        type: 'Salary',
        label: `Salary – ${s.employeeId?.name ?? s.employeeId}`,
        amount: s.netSalary ?? s.baseSalary,
        date: s.month ?? s.createdAt,
        status: s.paymentStatus ?? s.status,
        ref: s.month,
        party: s.employeeId?.name,
      }))
      const expenses: SystemRecord[] = (exp.data.data?.data ?? []).map((e: any) => ({
        _id: e._id,
        type: 'Expense',
        label: e.description,
        amount: e.amount,
        date: e.date,
        status: e.status,
        ref: e.bankReference,
        party: e.paidTo,
      }))
      return [...invoices, ...salaries, ...expenses] as SystemRecord[]
    },
  })
}

function useReconSummary() {
  return useQuery({
    queryKey: ['recon-summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<any>('/reconciliation/summary')
      return data.data
    },
  })
}

// ─── Match Engine (frontend heuristic) ─────────────────────────────────────────

function computeMatches(bankTxs: BankTx[], systemRecords: SystemRecord[]): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = []
  const usedBank = new Set<string>()
  const usedSystem = new Set<string>()

  for (const btx of bankTxs) {
    let best: MatchSuggestion | null = null
    for (const sys of systemRecords) {
      if (usedSystem.has(sys._id)) continue
      // type gate
      if (btx.type === 'Credit' && sys.type !== 'Invoice') continue
      if (btx.type === 'Debit' && sys.type === 'Invoice') continue

      const amtDiff = Math.abs(btx.amount - sys.amount)
      const amtPct = amtDiff / (sys.amount || 1)
      const daysOff = Math.abs(
        (new Date(btx.date).getTime() - new Date(sys.date).getTime()) / 86400000
      )

      let score = 100
      const reasons: string[] = []

      if (amtPct < 0.001) { reasons.push('Exact amount match') }
      else if (amtPct < 0.02) { score -= 10; reasons.push('Amount within 2%') }
      else if (amtPct < 0.1) { score -= 30; reasons.push('Amount within 10%') }
      else { score -= 60 }

      if (daysOff === 0) { reasons.push('Same date') }
      else if (daysOff <= 3) { score -= 5; reasons.push(`${daysOff}d apart`) }
      else if (daysOff <= 7) { score -= 15; reasons.push(`${daysOff}d apart`) }
      else if (daysOff <= 30) { score -= 25; reasons.push(`${daysOff}d apart`) }
      else { score -= 50 }

      if (score < 30) continue

      if (!best || score > best.confidence) {
        best = {
          bankTx: btx,
          systemRecord: sys,
          confidence: Math.min(100, Math.max(0, score)),
          reasons,
          amountDiff: amtDiff,
          dateDiff: daysOff,
        }
      }
    }
    if (best && best.confidence >= 40) {
      usedBank.add(btx._id)
      usedSystem.add(best.systemRecord._id)
      suggestions.push(best)
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, React.ElementType> = {
  Invoice: Receipt,
  Salary: Wallet,
  Expense: FileText,
}

const TYPE_COLOR: Record<string, string> = {
  Invoice: 'text-amber-400',
  Salary: 'text-blue-400',
  Expense: 'text-rose-400',
}

function BankRow({ tx, selected, onClick }: { tx: BankTx; selected: boolean; onClick: () => void }) {
  const isCredit = tx.type === 'Credit'
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-slate-700/40 last:border-0 transition-colors ${
        selected ? 'bg-blue-600/15 border-l-2 border-l-blue-500' : 'hover:bg-slate-700/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold truncate">{tx.description}</p>
          {tx.counterparty && <p className="text-slate-500 text-[10px] truncate">{tx.counterparty}</p>}
          <p className="text-slate-600 text-[10px] mt-0.5">{tx.date ? format(new Date(tx.date), 'dd MMM yyyy') : '—'}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-xs font-bold ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isCredit ? '+' : '-'}AED {tx.amount.toLocaleString()}
          </p>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
            isCredit
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-rose-500/15 text-rose-400'
          }`}>
            {tx.type}
          </span>
        </div>
      </div>
      {tx.matchStatus && (
        <div className="mt-1.5">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            tx.matchStatus === 'Matched' ? 'bg-emerald-500/15 text-emerald-400' :
            tx.matchStatus === 'Partial' ? 'bg-amber-500/15 text-amber-400' :
            'bg-slate-500/15 text-slate-400'
          }`}>
            {tx.matchStatus}
          </span>
        </div>
      )}
    </button>
  )
}

function SystemRow({ rec, selected, onClick }: { rec: SystemRecord; selected: boolean; onClick: () => void }) {
  const Icon = TYPE_ICON[rec.type] ?? FileText
  const color = TYPE_COLOR[rec.type] ?? 'text-slate-400'
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-slate-700/40 last:border-0 transition-colors ${
        selected ? 'bg-violet-600/15 border-l-2 border-l-violet-500' : 'hover:bg-slate-700/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className={`mt-0.5 shrink-0 ${color}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{rec.label}</p>
            {rec.party && <p className="text-slate-500 text-[10px] truncate">{rec.party}</p>}
            <p className="text-slate-600 text-[10px] mt-0.5">{rec.date ? format(new Date(rec.date), 'dd MMM yyyy') : '—'}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-bold text-slate-200">AED {rec.amount.toLocaleString()}</p>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${color} bg-slate-700/50`}>
            {rec.type}
          </span>
        </div>
      </div>
    </button>
  )
}

function MatchCard({ match, onApprove, onReject }: {
  match: MatchSuggestion
  onApprove: () => void
  onReject: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden mb-2">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border-b border-slate-700/40">
        <ConfidenceBadge score={match.confidence} />
        <span className="text-[10px] text-slate-500 flex-1 truncate">
          {match.reasons.join(' · ')}
        </span>
        <button onClick={() => setExpanded(e => !e)} className="text-slate-500 hover:text-white">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-1 items-center p-2">
        {/* Bank side */}
        <div className="bg-slate-700/40 rounded-lg px-2.5 py-2">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Bank</p>
          <p className="text-white text-xs font-semibold truncate">{match.bankTx.description}</p>
          <p className={`text-xs font-bold ${match.bankTx.type === 'Credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
            AED {match.bankTx.amount.toLocaleString()}
          </p>
          <p className="text-slate-500 text-[10px]">{format(new Date(match.bankTx.date), 'dd MMM')}</p>
        </div>

        <div className="flex flex-col items-center gap-1">
          <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
          {match.amountDiff > 0 && (
            <span className="text-[9px] text-amber-400 font-bold">Δ{match.amountDiff.toLocaleString()}</span>
          )}
        </div>

        {/* System side */}
        <div className="bg-slate-700/40 rounded-lg px-2.5 py-2">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">{match.systemRecord.type}</p>
          <p className="text-white text-xs font-semibold truncate">{match.systemRecord.label}</p>
          <p className="text-xs font-bold text-slate-300">AED {match.systemRecord.amount.toLocaleString()}</p>
          <p className="text-slate-500 text-[10px]">{format(new Date(match.systemRecord.date), 'dd MMM')}</p>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-2 text-[10px] text-slate-400 space-y-0.5">
          <p>Amount difference: <span className="text-slate-200">AED {match.amountDiff.toFixed(2)}</span></p>
          <p>Date gap: <span className="text-slate-200">{match.dateDiff} day(s)</span></p>
          <p>Match reasons: <span className="text-slate-200">{match.reasons.join(', ')}</span></p>
        </div>
      )}

      <div className="flex gap-1.5 px-3 pb-3">
        <button
          onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold hover:bg-emerald-600/30 transition-colors"
        >
          <CheckCircle2 className="w-3 h-3" /> Approve
        </button>
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-400 text-[10px] font-bold hover:bg-rose-600/30 transition-colors"
        >
          <XCircle className="w-3 h-3" /> Reject
        </button>
      </div>
    </div>
  )
}

function ColumnHeader({ title, sub, count, icon: Icon, color }: {
  title: string; sub: string; count?: number; icon: React.ElementType; color: string
}) {
  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 border-b border-slate-700/60 bg-gradient-to-r ${color}`}>
      <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
        <Icon className="w-4 h-4 text-white/80" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-bold leading-tight">{title}</p>
        <p className="text-white/50 text-[10px]">{sub}</p>
      </div>
      {count !== undefined && (
        <span className="text-xs font-bold text-white/70 bg-white/10 px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ReconciliationPage() {
  const currentMonth = format(new Date(), 'yyyy-MM')
  const [month, setMonth] = useState(currentMonth)
  const [bankFilter, setBankFilter] = useState<'All' | 'Credit' | 'Debit'>('All')
  const [systemFilter, setSystemFilter] = useState<'All' | 'Invoice' | 'Salary' | 'Expense'>('All')
  const [bankSearch, setBankSearch] = useState('')
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null)
  const [approvedMatches, setApprovedMatches] = useState<Set<string>>(new Set())
  const [rejectedMatches, setRejectedMatches] = useState<Set<string>>(new Set())
  const [overrideDrawer, setOverrideDrawer] = useState<MatchSuggestion | null>(null)
  const [runResult, setRunResult] = useState<any>(null)

  const { data: bankTxs = [], isLoading: bankLoading, refetch: refetchBank } = useBankTransactions(month)
  const { data: systemRecs = [], isLoading: sysLoading } = useSystemRecords(month)
  const { data: summary } = useReconSummary()

  const runMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<any>('/reconciliation/run', { month })
      return data.data
    },
    onSuccess: (data) => {
      setRunResult(data)
      refetchBank()
    },
  })

  const suggestions = computeMatches(bankTxs, systemRecs)
  const filteredSuggestions = suggestions.filter(m =>
    !approvedMatches.has(m.bankTx._id + m.systemRecord._id) &&
    !rejectedMatches.has(m.bankTx._id + m.systemRecord._id)
  )

  const filteredBank = bankTxs
    .filter(tx => bankFilter === 'All' || tx.type === bankFilter)
    .filter(tx => !bankSearch || tx.description.toLowerCase().includes(bankSearch.toLowerCase()) || tx.counterparty?.toLowerCase().includes(bankSearch.toLowerCase()))

  const filteredSystem = systemRecs
    .filter(r => systemFilter === 'All' || r.type === systemFilter)

  const approveMatch = useCallback((match: MatchSuggestion) => {
    setApprovedMatches(prev => new Set([...prev, match.bankTx._id + match.systemRecord._id]))
  }, [])

  const rejectMatch = useCallback((match: MatchSuggestion) => {
    setRejectedMatches(prev => new Set([...prev, match.bankTx._id + match.systemRecord._id]))
  }, [])

  const creditTotal = bankTxs.filter(t => t.type === 'Credit').reduce((s, t) => s + t.amount, 0)
  const debitTotal = bankTxs.filter(t => t.type === 'Debit').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="min-h-screen bg-slate-900 -m-6 p-6 flex flex-col gap-4">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-900/40">
              <GitMerge className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Reconciliation Workbench</h1>
          </div>
          <p className="text-slate-400 text-sm ml-12">Bank CSV → Auto Match → Manual Review → Approve → Close Month</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
          />
          <Button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-lg shadow-violet-900/40"
          >
            <RefreshCw className={`h-4 w-4 ${runMutation.isPending ? 'animate-spin' : ''}`} />
            {runMutation.isPending ? 'Running…' : 'Run Reconciliation'}
          </Button>
        </div>
      </div>

      {/* ── KPI Strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Credits In',      value: `AED ${(creditTotal/1000).toFixed(1)}K`, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Debits Out',      value: `AED ${(debitTotal/1000).toFixed(1)}K`,  color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20'     },
          { label: 'Suggested Matches', value: String(filteredSuggestions.length),    color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20'     },
          { label: 'Approved',        value: String(approvedMatches.size),            color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20'},
          { label: 'Pending Review',  value: String(filteredSuggestions.length),      color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20'    },
        ].map(k => (
          <div key={k.label} className={`${k.bg} border rounded-xl px-4 py-3`}>
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">{k.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Run Result Banner ──────────────────────────────────── */}
      {runResult && (
        <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1 text-sm text-emerald-300">
            Reconciliation complete for <strong>{runResult.month}</strong> —
            Invoices: {runResult.summary?.invoice?.matched ?? 0} matched,
            Salaries: {runResult.summary?.salary?.matched ?? 0} matched,
            Expenses: {runResult.summary?.expense?.matched ?? 0} matched
          </div>
          <button onClick={() => setRunResult(null)} className="text-emerald-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 3-Column Workbench ─────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 flex-1 min-h-0">

        {/* ── Column 1: Bank Ledger ──────────────────────────── */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          <ColumnHeader
            title="Bank Ledger"
            sub="Uploaded transactions"
            count={filteredBank.length}
            icon={Building2}
            color="from-slate-700/80 to-slate-800/60"
          />

          {/* Filters */}
          <div className="px-3 py-2.5 border-b border-slate-700/40 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={bankSearch}
                onChange={e => setBankSearch(e.target.value)}
                placeholder="Search transactions…"
                className="w-full bg-slate-700/50 border border-slate-600/40 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div className="flex gap-1">
              {(['All', 'Credit', 'Debit'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setBankFilter(f)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                    bankFilter === f
                      ? f === 'Credit' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                        : f === 'Debit' ? 'bg-rose-600/30 text-rose-400 border border-rose-500/30'
                        : 'bg-blue-600/30 text-blue-400 border border-blue-500/30'
                      : 'bg-slate-700/40 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {bankLoading ? (
              <div className="p-3 space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 bg-slate-700/50" />)}
              </div>
            ) : filteredBank.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
                <Building2 className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-slate-500 text-xs">No bank transactions found</p>
                <p className="text-slate-600 text-[10px] mt-1">Upload a bank CSV to begin</p>
              </div>
            ) : (
              filteredBank.map(tx => (
                <BankRow
                  key={tx._id}
                  tx={tx}
                  selected={selectedBank === tx._id}
                  onClick={() => setSelectedBank(s => s === tx._id ? null : tx._id)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-700/40 bg-slate-800/80">
            <div className="flex justify-between text-[10px]">
              <span className="text-emerald-400 font-semibold">↑ AED {(creditTotal/1000).toFixed(1)}K credits</span>
              <span className="text-rose-400 font-semibold">↓ AED {(debitTotal/1000).toFixed(1)}K debits</span>
            </div>
          </div>
        </div>

        {/* ── Column 2: System Transactions ─────────────────── */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          <ColumnHeader
            title="System Records"
            sub="Invoices · Salaries · Expenses"
            count={filteredSystem.length}
            icon={FileText}
            color="from-indigo-700/50 to-slate-800/60"
          />

          {/* Filters */}
          <div className="px-3 py-2.5 border-b border-slate-700/40">
            <div className="flex gap-1">
              {(['All', 'Invoice', 'Salary', 'Expense'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setSystemFilter(f)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                    systemFilter === f
                      ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/30'
                      : 'bg-slate-700/40 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {sysLoading ? (
              <div className="p-3 space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 bg-slate-700/50" />)}
              </div>
            ) : filteredSystem.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
                <FileText className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-slate-500 text-xs">No system records found</p>
              </div>
            ) : (
              filteredSystem.map(rec => (
                <SystemRow
                  key={rec._id}
                  rec={rec}
                  selected={selectedSystem === rec._id}
                  onClick={() => setSelectedSystem(s => s === rec._id ? null : rec._id)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-700/40 bg-slate-800/80">
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>{systemRecs.filter(r => r.type === 'Invoice').length} invoices</span>
              <span>{systemRecs.filter(r => r.type === 'Salary').length} salaries</span>
              <span>{systemRecs.filter(r => r.type === 'Expense').length} expenses</span>
            </div>
          </div>
        </div>

        {/* ── Column 3: AI Matches ───────────────────────────── */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          <ColumnHeader
            title="AI Suggested Matches"
            sub="Rule-based heuristic matching"
            count={filteredSuggestions.length}
            icon={Zap}
            color="from-violet-700/50 to-slate-800/60"
          />

          {/* Legend */}
          <div className="px-3 py-2.5 border-b border-slate-700/40 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> ≥90% High
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> 70–90% Med
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> &lt;70% Low
            </div>
            <span className="ml-auto text-[10px] text-slate-500">{approvedMatches.size} approved</span>
          </div>

          {/* Match cards */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-3">
            {filteredSuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                {approvedMatches.size > 0 ? (
                  <>
                    <CheckCheck className="w-10 h-10 text-emerald-500 mb-3" />
                    <p className="text-emerald-400 font-semibold text-sm">All matches reviewed!</p>
                    <p className="text-slate-500 text-xs mt-1">{approvedMatches.size} approved · {rejectedMatches.size} rejected</p>
                  </>
                ) : (
                  <>
                    <Zap className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="text-slate-500 text-xs">Run reconciliation to generate matches</p>
                  </>
                )}
              </div>
            ) : (
              filteredSuggestions.map(match => (
                <MatchCard
                  key={match.bankTx._id + match.systemRecord._id}
                  match={match}
                  onApprove={() => approveMatch(match)}
                  onReject={() => rejectMatch(match)}
                />
              ))
            )}
          </div>

          {/* Bulk actions footer */}
          {filteredSuggestions.length > 0 && (
            <div className="px-3 py-2.5 border-t border-slate-700/40 bg-slate-800/80 flex gap-2">
              <button
                onClick={() => filteredSuggestions.filter(m => m.confidence >= 90).forEach(approveMatch)}
                className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold hover:bg-emerald-600/30 transition-colors"
              >
                ✓ Approve All High
              </button>
              <button
                onClick={() => { setApprovedMatches(new Set()); setRejectedMatches(new Set()) }}
                className="px-3 py-1.5 rounded-lg bg-slate-700/40 border border-slate-600/40 text-slate-400 text-[10px] font-bold hover:bg-slate-700 transition-colors"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary Ledger Row ─────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Invoices ↔ Bank', data: summary.invoice, type: 'invoice' },
            { label: 'Salaries ↔ Bank', data: summary.salary, type: 'salary' },
            { label: 'Expenses ↔ Bank', data: summary.expense, type: 'expense' },
          ].map(({ label, data, type }) => {
            if (!data) return null
            const matched = data.matched ?? data.Matched ?? 0
            const total = Object.values(data as Record<string, number>).reduce((a: number, b: number) => a + b, 0)
            const pct = total > 0 ? Math.round((matched / total) * 100) : 0
            return (
              <div key={type} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-400 mb-1">{label}</p>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-emerald-400 font-semibold">{matched} matched</span>
                    <span className="text-[10px] text-slate-500">{pct}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {pct}%
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
