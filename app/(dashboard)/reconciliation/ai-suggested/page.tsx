'use client'

import React, { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { useBankTransactions, useSystemRecords, computeMatches, MatchSuggestion } from '@/lib/hooks/useReconciliation'
import { ConfidenceBadge } from '@/components/reconciliation/ConfidenceBadge'
import { Button } from '@/components/ui/button'
import {
  Zap, CheckCircle2, XCircle, ArrowLeftRight, RefreshCw,
  CheckCheck, ChevronDown, X,
} from 'lucide-react'
import { format } from 'date-fns'

function MatchCard({ match, onApprove, onReject, approved, rejected }: {
  match: MatchSuggestion
  onApprove: () => void
  onReject: () => void
  approved: boolean
  rejected: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  if (approved) return (
    <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-emerald-300 text-xs font-semibold truncate">{match.bankTx.description}</p>
        <p className="text-emerald-500 text-[10px]">↔ {match.systemRecord.label}</p>
      </div>
      <span className="text-xs font-bold text-emerald-400">Approved</span>
      <button onClick={onReject} className="text-emerald-600 hover:text-white ml-1"><X className="w-3.5 h-3.5" /></button>
    </div>
  )

  if (rejected) return (
    <div className="bg-rose-900/20 border border-rose-500/30 rounded-xl px-4 py-3 flex items-center gap-3 opacity-50">
      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-rose-300 text-xs font-semibold truncate line-through">{match.bankTx.description}</p>
      </div>
      <span className="text-xs text-rose-400">Rejected</span>
      <button onClick={onApprove} className="text-rose-600 hover:text-white ml-1 text-[10px]">Undo</button>
    </div>
  )

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/80 border-b border-slate-700/40">
        <ConfidenceBadge score={match.confidence} />
        <span className="text-[10px] text-slate-500 flex-1 truncate">{match.reasons.join(' · ')}</span>
        <button onClick={() => setExpanded(e => !e)} className="text-slate-500 hover:text-white transition-colors">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Pair */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center p-3">
        <div className="bg-slate-700/40 rounded-lg px-3 py-2.5">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Bank</p>
          <p className="text-white text-xs font-semibold truncate">{match.bankTx.description}</p>
          <p className={`text-sm font-bold mt-0.5 ${match.bankTx.type === 'Credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
            AED {(match.bankTx.amount ?? 0).toLocaleString()}
          </p>
          <p className="text-slate-500 text-[10px] mt-0.5">{format(new Date(match.bankTx.date), 'dd MMM yyyy')}</p>
        </div>

        <div className="flex flex-col items-center gap-1 px-1">
          <ArrowLeftRight className="w-4 h-4 text-slate-500" />
          {match.amountDiff > 0 && (
            <span className="text-[9px] text-amber-400 font-bold whitespace-nowrap">Δ {match.amountDiff.toLocaleString()}</span>
          )}
          {match.dateDiff > 0 && (
            <span className="text-[9px] text-slate-500 whitespace-nowrap">{match.dateDiff}d gap</span>
          )}
        </div>

        <div className="bg-slate-700/40 rounded-lg px-3 py-2.5">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-1">{match.systemRecord.type}</p>
          <p className="text-white text-xs font-semibold truncate">{match.systemRecord.label}</p>
          <p className="text-sm font-bold text-slate-300 mt-0.5">AED {(match.systemRecord.amount ?? 0).toLocaleString()}</p>
          <p className="text-slate-500 text-[10px] mt-0.5">{match.systemRecord.party || format(new Date(match.systemRecord.date), 'dd MMM yyyy')}</p>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 space-y-1 border-t border-slate-700/40 pt-2">
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div><span className="text-slate-500">Amount diff:</span> <span className="text-slate-200 font-semibold">AED {match.amountDiff.toFixed(2)}</span></div>
            <div><span className="text-slate-500">Date gap:</span> <span className="text-slate-200 font-semibold">{match.dateDiff} days</span></div>
            <div><span className="text-slate-500">Confidence:</span> <span className="text-slate-200 font-semibold">{match.confidence}%</span></div>
          </div>
          <p className="text-[10px] text-slate-500">Reasons: <span className="text-slate-300">{match.reasons.join(', ')}</span></p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-3 pb-3">
        <button onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-600/30 transition-colors">
          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
        </button>
        <button onClick={onReject}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-600/30 transition-colors">
          <XCircle className="w-3.5 h-3.5" /> Reject
        </button>
      </div>
    </div>
  )
}

export default function AISuggestedPage() {
  const currentMonth = format(new Date(), 'yyyy-MM')
  const [month, setMonth] = useState(currentMonth)
  const [confidenceFilter, setConfidenceFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All')
  const [approvedMatches, setApprovedMatches] = useState<Set<string>>(new Set())
  const [rejectedMatches, setRejectedMatches] = useState<Set<string>>(new Set())
  const [runResult, setRunResult] = useState<any>(null)

  const { data: bankTxs = [],    refetch: refetchBank } = useBankTransactions(month)
  const { data: systemRecs = [] }                        = useSystemRecords()

  const runMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<any>('/reconciliation/run', { month })
      return data.data
    },
    onSuccess: (data) => { setRunResult(data); refetchBank() },
  })

  const allMatches = computeMatches(bankTxs, systemRecs)

  const filtered = allMatches.filter((m: MatchSuggestion) => {
    if (confidenceFilter === 'High')   return m.confidence >= 90
    if (confidenceFilter === 'Medium') return m.confidence >= 70 && m.confidence < 90
    if (confidenceFilter === 'Low')    return m.confidence < 70
    return true
  })

  const approveMatch  = useCallback((m: MatchSuggestion) => {
    const key = m.bankTx._id + m.systemRecord._id
    setApprovedMatches(prev => new Set([...prev, key]))
    setRejectedMatches(prev => { const s = new Set(prev); s.delete(key); return s })
  }, [])
  const rejectMatch   = useCallback((m: MatchSuggestion) => {
    const key = m.bankTx._id + m.systemRecord._id
    setRejectedMatches(prev => new Set([...prev, key]))
    setApprovedMatches(prev => { const s = new Set(prev); s.delete(key); return s })
  }, [])

  const highCount   = allMatches.filter((m: MatchSuggestion) => m.confidence >= 90).length
  const medCount    = allMatches.filter((m: MatchSuggestion) => m.confidence >= 70 && m.confidence < 90).length
  const lowCount    = allMatches.filter((m: MatchSuggestion) => m.confidence < 70).length
  const pending     = allMatches.filter((m: MatchSuggestion) => !approvedMatches.has(m.bankTx._id + m.systemRecord._id) && !rejectedMatches.has(m.bankTx._id + m.systemRecord._id)).length

  return (
    <div className="min-h-screen bg-slate-900 -m-6 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Suggested Matches</h1>
            <p className="text-slate-400 text-xs">Rule-based heuristic matching — review, approve or reject each pair</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500" />
          <Button size="sm" onClick={() => runMutation.mutate()} disabled={runMutation.isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
            <RefreshCw className={`h-4 w-4 ${runMutation.isPending ? 'animate-spin' : ''}`} />
            {runMutation.isPending ? 'Running…' : 'Run Reconciliation'}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Suggestions', value: String(allMatches.length),        color: 'text-white',         bg: 'bg-slate-700/60 border-slate-600/40' },
          { label: '≥90% High',         value: String(highCount),                color: 'text-emerald-400',   bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: '70–89% Medium',     value: String(medCount),                 color: 'text-amber-400',     bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: '<70% Low',          value: String(lowCount),                 color: 'text-rose-400',      bg: 'bg-rose-500/10 border-rose-500/20' },
          { label: 'Approved',          value: String(approvedMatches.size),     color: 'text-blue-400',      bg: 'bg-blue-500/10 border-blue-500/20' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} border rounded-xl px-4 py-3`}>
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">{k.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Run result banner */}
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

      {/* Filter + bulk actions bar */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Legend + filter pills */}
        <div className="flex gap-1">
          {([
            { label: 'All',    val: 'All',    cls: 'bg-slate-600/60 text-slate-200 border-slate-500/40' },
            { label: '≥90% High',  val: 'High',   cls: 'bg-emerald-600/30 text-emerald-400 border-emerald-500/30' },
            { label: '70–89% Med', val: 'Medium', cls: 'bg-amber-600/30 text-amber-400 border-amber-500/30' },
            { label: '<70% Low',   val: 'Low',    cls: 'bg-rose-600/30 text-rose-400 border-rose-500/30' },
          ] as const).map(f => (
            <button key={f.val} onClick={() => setConfidenceFilter(f.val as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                confidenceFilter === f.val ? f.cls : 'bg-slate-700/40 text-slate-500 border-transparent hover:text-slate-300'
              }`}>{f.label}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => allMatches.filter((m: MatchSuggestion) => m.confidence >= 90).forEach(approveMatch)}
            className="px-4 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-600/30 transition-colors flex items-center gap-1.5">
            <CheckCheck className="w-3.5 h-3.5" /> Approve All High ({highCount})
          </button>
          <button
            onClick={() => { setApprovedMatches(new Set()); setRejectedMatches(new Set()) }}
            className="px-3 py-1.5 rounded-lg bg-slate-700/40 border border-slate-600/40 text-slate-400 text-xs font-bold hover:bg-slate-700 transition-colors">
            Reset All
          </button>
        </div>
        {pending > 0 && (
          <p className="text-slate-500 text-xs w-full">{pending} pending · {approvedMatches.size} approved · {rejectedMatches.size} rejected</p>
        )}
      </div>

      {/* Match cards grid */}
      {allMatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Zap className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 font-semibold">No suggestions yet</p>
          <p className="text-slate-500 text-sm mt-1">Click "Run Reconciliation" to generate AI match suggestions</p>
          <Button className="mt-4 bg-violet-600 hover:bg-violet-700 text-white gap-2" onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
            <RefreshCw className={`h-4 w-4 ${runMutation.isPending ? 'animate-spin' : ''}`} />
            {runMutation.isPending ? 'Running…' : 'Run Reconciliation'}
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCheck className="w-10 h-10 text-emerald-500 mb-2" />
          <p className="text-emerald-400 font-semibold">No matches in this confidence band</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(match => {
            const key = match.bankTx._id + match.systemRecord._id
            return (
              <MatchCard
                key={key}
                match={match}
                onApprove={() => approveMatch(match)}
                onReject={() => rejectMatch(match)}
                approved={approvedMatches.has(key)}
                rejected={rejectedMatches.has(key)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
