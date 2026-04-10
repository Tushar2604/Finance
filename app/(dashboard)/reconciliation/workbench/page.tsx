'use client'

import React, { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import {
  useBankTransactions, useSystemRecords, computeMatches,
  MatchSuggestion, BankTx, SystemRecord,
} from '@/lib/hooks/useReconciliation'
import { ConfidenceBadge } from '@/components/reconciliation/ConfidenceBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Building2, FileText, Wallet, Receipt, Zap,
  RefreshCw, CheckCircle2, XCircle, ArrowLeftRight,
  Search, X, CheckCheck, ChevronDown, Layers,
} from 'lucide-react'
import { format } from 'date-fns'

/* ─── Shared sub-components ─────────────────────────────────────────────────── */

const TYPE_ICON: Record<string, React.ElementType> = { Invoice: Receipt, Salary: Wallet, Expense: FileText }
const TYPE_COLOR: Record<string, string> = { Invoice: 'text-amber-400', Salary: 'text-blue-400', Expense: 'text-rose-400' }

function BankRow({ tx, selected, onClick }: { tx: BankTx; selected: boolean; onClick: () => void }) {
  const isCredit = tx.type === 'Credit'
  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-b border-slate-700/40 last:border-0 transition-colors ${selected ? 'bg-blue-600/15 border-l-2 border-l-blue-500' : 'hover:bg-slate-700/30'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold truncate">{tx.description}</p>
          {tx.counterparty && <p className="text-slate-500 text-[10px] truncate">{tx.counterparty}</p>}
          <p className="text-slate-600 text-[10px] mt-0.5">{tx.date ? format(new Date(tx.date), 'dd MMM yyyy') : '—'}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-xs font-bold ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isCredit ? '+' : '-'}AED {(tx.amount ?? 0).toLocaleString()}
          </p>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${isCredit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>{tx.type}</span>
        </div>
      </div>
      {tx.matchStatus && (
        <span className={`mt-1 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tx.matchStatus === 'Matched' ? 'bg-emerald-500/15 text-emerald-400' : tx.matchStatus === 'Partial' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400'}`}>
          {tx.matchStatus}
        </span>
      )}
    </button>
  )
}

function SystemRow({ rec, selected, onClick }: { rec: SystemRecord; selected: boolean; onClick: () => void }) {
  const Icon  = TYPE_ICON[rec.type] ?? FileText
  const color = TYPE_COLOR[rec.type] ?? 'text-slate-400'
  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-b border-slate-700/40 last:border-0 transition-colors ${selected ? 'bg-violet-600/15 border-l-2 border-l-violet-500' : 'hover:bg-slate-700/30'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className={`mt-0.5 shrink-0 ${color}`}><Icon className="w-3.5 h-3.5" /></div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{rec.label}</p>
            {rec.party && <p className="text-slate-500 text-[10px] truncate">{rec.party}</p>}
            <p className="text-slate-600 text-[10px] mt-0.5">{rec.date ? format(new Date(rec.date), 'dd MMM yyyy') : '—'}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-bold text-slate-200">AED {(rec.amount ?? 0).toLocaleString()}</p>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${color} bg-slate-700/50`}>{rec.type}</span>
        </div>
      </div>
    </button>
  )
}

function MatchCard({ match, onApprove, onReject }: { match: MatchSuggestion; onApprove: () => void; onReject: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden mb-2">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border-b border-slate-700/40">
        <ConfidenceBadge score={match.confidence} />
        <span className="text-[10px] text-slate-500 flex-1 truncate">{match.reasons.join(' · ')}</span>
        <button onClick={() => setExpanded(e => !e)} className="text-slate-500 hover:text-white">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-1 items-center p-2">
        <div className="bg-slate-700/40 rounded-lg px-2.5 py-2">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Bank</p>
          <p className="text-white text-xs font-semibold truncate">{match.bankTx.description}</p>
          <p className={`text-xs font-bold ${match.bankTx.type === 'Credit' ? 'text-emerald-400' : 'text-rose-400'}`}>AED {(match.bankTx.amount ?? 0).toLocaleString()}</p>
          <p className="text-slate-500 text-[10px]">{format(new Date(match.bankTx.date), 'dd MMM')}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
          {match.amountDiff > 0 && <span className="text-[9px] text-amber-400 font-bold">Δ{match.amountDiff.toLocaleString()}</span>}
        </div>
        <div className="bg-slate-700/40 rounded-lg px-2.5 py-2">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">{match.systemRecord.type}</p>
          <p className="text-white text-xs font-semibold truncate">{match.systemRecord.label}</p>
          <p className="text-xs font-bold text-slate-300">AED {(match.systemRecord.amount ?? 0).toLocaleString()}</p>
          <p className="text-slate-500 text-[10px]">{format(new Date(match.systemRecord.date), 'dd MMM')}</p>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-2 text-[10px] text-slate-400 space-y-0.5 border-t border-slate-700/40 pt-2">
          <p>Amount diff: <span className="text-slate-200">AED {match.amountDiff.toFixed(2)}</span></p>
          <p>Date gap: <span className="text-slate-200">{match.dateDiff} day(s)</span></p>
          <p>Reasons: <span className="text-slate-200">{match.reasons.join(', ')}</span></p>
        </div>
      )}
      <div className="flex gap-1.5 px-3 pb-3">
        <button onClick={onApprove} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold hover:bg-emerald-600/30 transition-colors">
          <CheckCircle2 className="w-3 h-3" /> Approve
        </button>
        <button onClick={onReject} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-400 text-[10px] font-bold hover:bg-rose-600/30 transition-colors">
          <XCircle className="w-3 h-3" /> Reject
        </button>
      </div>
    </div>
  )
}

/* ─── Column panel ────────────────────────────────────────────────────────────── */

function PanelHeader({ icon: Icon, title, sub, count, gradient }: {
  icon: React.ElementType; title: string; sub: string; count?: number; gradient: string
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 border-b border-slate-700/40 bg-gradient-to-r ${gradient}`}>
      <Icon className="w-4 h-4 text-white/70" />
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-bold">{title}</p>
        <p className="text-white/40 text-[10px]">{sub}</p>
      </div>
      {count !== undefined && <span className="text-xs font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded-full">{count}</span>}
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────────────────────────── */

export default function WorkbenchPage() {
  const currentMonth = format(new Date(), 'yyyy-MM')
  const [month, setMonth]               = useState(currentMonth)
  const [bankFilter, setBankFilter]     = useState<'All' | 'Credit' | 'Debit'>('All')
  const [systemFilter, setSystemFilter] = useState<'All' | 'Invoice' | 'Salary' | 'Expense'>('All')
  const [bankSearch, setBankSearch]     = useState('')
  const [selectedBank, setSelectedBank]     = useState<string | null>(null)
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null)
  const [approvedMatches, setApprovedMatches] = useState<Set<string>>(new Set())
  const [rejectedMatches, setRejectedMatches] = useState<Set<string>>(new Set())
  const [runResult, setRunResult]       = useState<any>(null)

  const { data: bankTxs = [], isLoading: bankLoading, refetch } = useBankTransactions(month)
  const { data: systemRecs = [], isLoading: sysLoading }        = useSystemRecords()

  const runMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<any>('/reconciliation/run', { month })
      return data.data
    },
    onSuccess: (d) => { setRunResult(d); refetch() },
  })

  const allMatches      = computeMatches(bankTxs, systemRecs)
  const filteredSuggs   = allMatches.filter(m =>
    !approvedMatches.has(m.bankTx._id + m.systemRecord._id) &&
    !rejectedMatches.has(m.bankTx._id + m.systemRecord._id)
  )

  const filteredBank    = bankTxs
    .filter(t => bankFilter === 'All' || t.type === bankFilter)
    .filter(t => !bankSearch || t.description.toLowerCase().includes(bankSearch.toLowerCase()) || t.counterparty?.toLowerCase().includes(bankSearch.toLowerCase()))

  const filteredSystem  = systemRecs.filter(r => systemFilter === 'All' || r.type === systemFilter)

  const approveMatch = useCallback((m: MatchSuggestion) => setApprovedMatches(p => new Set([...p, m.bankTx._id + m.systemRecord._id])), [])
  const rejectMatch  = useCallback((m: MatchSuggestion) => setRejectedMatches(p => new Set([...p, m.bankTx._id + m.systemRecord._id])), [])

  const creditTotal = bankTxs.filter(t => t.type === 'Credit').reduce((s, t) => s + t.amount, 0)
  const debitTotal  = bankTxs.filter(t => t.type === 'Debit').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="min-h-screen bg-slate-900 -m-6 p-6 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-900/40">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Side-by-Side Workbench</h1>
            <p className="text-slate-400 text-xs">Bank · System Records · AI Matches — all three panels simultaneously</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
          <Button size="sm" onClick={() => runMutation.mutate()} disabled={runMutation.isPending}
            className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2 shadow-lg shadow-cyan-900/30">
            <RefreshCw className={`h-4 w-4 ${runMutation.isPending ? 'animate-spin' : ''}`} />
            {runMutation.isPending ? 'Running…' : 'Run Reconciliation'}
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Credits In',      value: `AED ${(creditTotal/1000).toFixed(1)}K`, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Debits Out',      value: `AED ${(debitTotal/1000).toFixed(1)}K`,  color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20'     },
          { label: 'AI Suggestions',  value: String(allMatches.length),               color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20' },
          { label: 'Approved',        value: String(approvedMatches.size),            color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20'},
          { label: 'Pending Review',  value: String(filteredSuggs.length),            color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20'   },
        ].map(k => (
          <div key={k.label} className={`${k.bg} border rounded-xl px-4 py-3`}>
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">{k.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Run result */}
      {runResult && (
        <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="flex-1 text-sm text-emerald-300">
            Reconciliation complete for <strong>{runResult.month}</strong> —
            Invoices: {runResult.summary?.invoice?.matched ?? 0} matched,
            Salaries: {runResult.summary?.salary?.matched ?? 0} matched,
            Expenses: {runResult.summary?.expense?.matched ?? 0} matched
          </p>
          <button onClick={() => setRunResult(null)} className="text-emerald-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* 3-column workbench */}
      <div className="grid grid-cols-3 gap-3 flex-1" style={{ height: 'calc(100vh - 320px)', minHeight: 480 }}>

        {/* ── Col 1: Bank Ledger ──────────────────────────────── */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl flex flex-col overflow-hidden border-t-4 border-t-slate-500">
          <PanelHeader icon={Building2} title="Bank Ledger" sub="Uploaded transactions" count={filteredBank.length} gradient="from-slate-700/80 to-slate-800/60" />

          {/* Filters */}
          <div className="px-3 py-2.5 border-b border-slate-700/40 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input value={bankSearch} onChange={e => setBankSearch(e.target.value)} placeholder="Search…"
                className="w-full bg-slate-700/50 border border-slate-600/40 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500 transition-colors" />
            </div>
            <div className="flex gap-1">
              {(['All', 'Credit', 'Debit'] as const).map(f => (
                <button key={f} onClick={() => setBankFilter(f)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                    bankFilter === f
                      ? f === 'Credit' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                        : f === 'Debit' ? 'bg-rose-600/30 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-600/60 text-slate-200 border border-slate-500/40'
                      : 'bg-slate-700/40 text-slate-500 hover:text-slate-300'
                  }`}>{f}</button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {bankLoading
              ? <div className="p-3 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 bg-slate-700/50" />)}</div>
              : filteredBank.length === 0
                ? <div className="flex flex-col items-center justify-center h-full py-12"><Building2 className="w-8 h-8 text-slate-600 mb-2" /><p className="text-slate-500 text-xs">No transactions</p></div>
                : filteredBank.map(tx => <BankRow key={tx._id} tx={tx} selected={selectedBank === tx._id} onClick={() => setSelectedBank(s => s === tx._id ? null : tx._id)} />)
            }
          </div>

          <div className="px-4 py-2.5 border-t border-slate-700/40 bg-slate-800/80 flex justify-between text-[10px]">
            <span className="text-emerald-400 font-semibold">↑ AED {(creditTotal/1000).toFixed(1)}K</span>
            <span className="text-slate-500">{bankTxs.filter(t => t.matchStatus === 'Matched').length} matched</span>
            <span className="text-rose-400 font-semibold">↓ AED {(debitTotal/1000).toFixed(1)}K</span>
          </div>
        </div>

        {/* ── Col 2: System Records ────────────────────────────── */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl flex flex-col overflow-hidden border-t-4 border-t-indigo-500">
          <PanelHeader icon={FileText} title="System Records" sub="Invoices · Salaries · Expenses" count={filteredSystem.length} gradient="from-indigo-700/50 to-slate-800/60" />

          <div className="px-3 py-2.5 border-b border-slate-700/40">
            <div className="flex gap-1">
              {(['All', 'Invoice', 'Salary', 'Expense'] as const).map(f => (
                <button key={f} onClick={() => setSystemFilter(f)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-colors ${systemFilter === f ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/30' : 'bg-slate-700/40 text-slate-500 hover:text-slate-300'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {sysLoading
              ? <div className="p-3 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 bg-slate-700/50" />)}</div>
              : filteredSystem.length === 0
                ? <div className="flex flex-col items-center justify-center h-full py-12"><FileText className="w-8 h-8 text-slate-600 mb-2" /><p className="text-slate-500 text-xs">No records</p></div>
                : filteredSystem.map(rec => <SystemRow key={rec._id} rec={rec} selected={selectedSystem === rec._id} onClick={() => setSelectedSystem(s => s === rec._id ? null : rec._id)} />)
            }
          </div>

          <div className="px-4 py-2.5 border-t border-slate-700/40 bg-slate-800/80 flex justify-between text-[10px]">
            <span className="text-amber-400 font-semibold">{systemRecs.filter(r => r.type === 'Invoice').length} inv</span>
            <span className="text-blue-400 font-semibold">{systemRecs.filter(r => r.type === 'Salary').length} sal</span>
            <span className="text-rose-400 font-semibold">{systemRecs.filter(r => r.type === 'Expense').length} exp</span>
          </div>
        </div>

        {/* ── Col 3: AI Matches ────────────────────────────────── */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl flex flex-col overflow-hidden border-t-4 border-t-violet-500">
          <PanelHeader icon={Zap} title="AI Suggested Matches" sub="Rule-based heuristic matching" count={filteredSuggs.length} gradient="from-violet-700/50 to-slate-800/60" />

          <div className="px-3 py-2.5 border-b border-slate-700/40 flex items-center gap-3">
            {[['bg-emerald-400','≥90%'],['bg-amber-400','70–90%'],['bg-rose-400','<70%']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1 text-[10px] text-slate-400"><span className={`w-2 h-2 rounded-full ${c}`} />{l}</div>
            ))}
            <span className="ml-auto text-[10px] text-slate-500">{approvedMatches.size} approved</span>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide p-3">
            {filteredSuggs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                {approvedMatches.size > 0
                  ? <><CheckCheck className="w-10 h-10 text-emerald-500 mb-3" /><p className="text-emerald-400 font-semibold text-sm">All reviewed!</p><p className="text-slate-500 text-xs mt-1">{approvedMatches.size} approved · {rejectedMatches.size} rejected</p></>
                  : <><Zap className="w-8 h-8 text-slate-600 mb-2" /><p className="text-slate-500 text-xs">Run reconciliation to generate matches</p></>
                }
              </div>
            ) : (
              filteredSuggs.map(match => (
                <MatchCard key={match.bankTx._id + match.systemRecord._id} match={match} onApprove={() => approveMatch(match)} onReject={() => rejectMatch(match)} />
              ))
            )}
          </div>

          {filteredSuggs.length > 0 && (
            <div className="px-3 py-2.5 border-t border-slate-700/40 bg-slate-800/80 flex gap-2">
              <button onClick={() => allMatches.filter(m => m.confidence >= 90).forEach(approveMatch)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold hover:bg-emerald-600/30 transition-colors">
                <CheckCheck className="w-3 h-3" /> Approve All High
              </button>
              <button onClick={() => { setApprovedMatches(new Set()); setRejectedMatches(new Set()) }}
                className="px-3 py-1.5 rounded-lg bg-slate-700/40 border border-slate-600/40 text-slate-400 text-[10px] font-bold hover:bg-slate-700 transition-colors">
                Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
