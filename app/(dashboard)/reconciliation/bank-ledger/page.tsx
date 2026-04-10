'use client'

import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { useBankTransactions, BankTx } from '@/lib/hooks/useReconciliation'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Building2, Search, X, RefreshCw, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'
import { format } from 'date-fns'
import { exportToCSV } from '@/lib/export'
import { Download } from 'lucide-react'

export default function BankLedgerPage() {
  const currentMonth = format(new Date(), 'yyyy-MM')
  const [month, setMonth]           = useState(currentMonth)
  const [filter, setFilter]         = useState<'All' | 'Credit' | 'Debit'>('All')
  const [matchFilter, setMatchFilter] = useState<'All' | 'Matched' | 'Unmatched' | 'Partial'>('All')
  const [search, setSearch]         = useState('')

  const { data: bankTxs = [], isLoading, refetch } = useBankTransactions(month)

  const runMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<any>('/reconciliation/run', { month })
      return data.data
    },
    onSuccess: () => refetch(),
  })

  const filtered = bankTxs
    .filter((tx: BankTx) => filter === 'All' || tx.type === filter)
    .filter((tx: BankTx) => matchFilter === 'All' || tx.matchStatus === matchFilter)
    .filter((tx: BankTx) => !search || tx.description.toLowerCase().includes(search.toLowerCase()) || tx.counterparty?.toLowerCase().includes(search.toLowerCase()))

  const creditTotal   = bankTxs.filter(t => t.type === 'Credit').reduce((s, t) => s + t.amount, 0)
  const debitTotal    = bankTxs.filter(t => t.type === 'Debit').reduce((s, t) => s + t.amount, 0)
  const matchedCount  = bankTxs.filter(t => t.matchStatus === 'Matched').length
  const unmatchedCount= bankTxs.filter(t => t.matchStatus !== 'Matched').length

  const handleExport = () => {
    exportToCSV(filtered.map(tx => ({
      Description:   tx.description,
      Counterparty:  tx.counterparty ?? '',
      Type:          tx.type,
      Amount:        tx.amount,
      Date:          tx.date ? format(new Date(tx.date), 'yyyy-MM-dd') : '',
      Reference:     tx.reference ?? '',
      'Match Status':tx.matchStatus ?? '',
    })), 'bank_ledger')
  }

  return (
    <div className="min-h-screen bg-slate-900 -m-6 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Bank Ledger</h1>
            <p className="text-slate-400 text-xs">Uploaded bank transactions for the selected period</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500" />
          <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-700" onClick={handleExport} disabled={!filtered.length}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => runMutation.mutate()} disabled={runMutation.isPending}
            className="bg-slate-600 hover:bg-slate-700 text-white gap-2">
            <RefreshCw className={`h-4 w-4 ${runMutation.isPending ? 'animate-spin' : ''}`} />
            {runMutation.isPending ? 'Running…' : 'Run Reconciliation'}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Transactions', value: String(bankTxs.length),              color: 'text-white',         bg: 'bg-slate-700/60 border-slate-600/40' },
          { label: 'Credits In',         value: `AED ${(creditTotal/1000).toFixed(1)}K`, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Debits Out',         value: `AED ${(debitTotal/1000).toFixed(1)}K`,  color: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/20' },
          { label: 'Matched',            value: `${matchedCount} / ${bankTxs.length}`,   color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} border rounded-xl px-4 py-3`}>
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">{k.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description or counterparty…"
            className="w-full bg-slate-700/50 border border-slate-600/40 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex gap-1">
          {(['All', 'Credit', 'Debit'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === f
                  ? f === 'Credit' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                    : f === 'Debit' ? 'bg-rose-600/30 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-600/60 text-slate-200 border border-slate-500/40'
                  : 'bg-slate-700/40 text-slate-500 hover:text-slate-300'
              }`}>{f}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['All', 'Matched', 'Unmatched', 'Partial'] as const).map(f => (
            <button key={f} onClick={() => setMatchFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                matchFilter === f
                  ? f === 'Matched' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                    : f === 'Unmatched' ? 'bg-rose-600/30 text-rose-400 border border-rose-500/30'
                    : f === 'Partial' ? 'bg-amber-600/30 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-600/60 text-slate-200 border border-slate-500/40'
                  : 'bg-slate-700/40 text-slate-500 hover:text-slate-300'
              }`}>{f}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60">
                {['Date','Description','Counterparty','Reference','Type','Amount','Match Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-700/30">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No transactions found</p>
                    <p className="text-slate-500 text-xs mt-1">Upload a bank CSV or adjust your filters</p>
                  </td>
                </tr>
              ) : (
                filtered.map(tx => {
                  const isCredit = tx.type === 'Credit'
                  return (
                    <tr key={tx._id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {tx.date ? format(new Date(tx.date), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="text-white text-sm font-medium truncate">{tx.description}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-[160px] truncate">{tx.counterparty || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{tx.reference || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isCredit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                          {isCredit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isCredit ? '+' : '-'}AED {(tx.amount ?? 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          tx.matchStatus === 'Matched' ? 'bg-emerald-500/15 text-emerald-400' :
                          tx.matchStatus === 'Partial'  ? 'bg-amber-500/15 text-amber-400' :
                          'bg-slate-500/15 text-slate-400'
                        }`}>{tx.matchStatus ?? 'Unmatched'}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-700/40 bg-slate-800/80 flex justify-between text-xs">
          <span className="text-emerald-400 font-semibold flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> AED {creditTotal.toLocaleString()} credits</span>
          <span className="text-slate-500">{filtered.length} of {bankTxs.length} transactions</span>
          <span className="text-rose-400 font-semibold flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5" /> AED {debitTotal.toLocaleString()} debits</span>
        </div>
      </div>
    </div>
  )
}
