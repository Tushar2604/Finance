'use client'

import React, { useState } from 'react'
import { useSystemRecords, SystemRecord } from '@/lib/hooks/useReconciliation'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { FileText, Wallet, Receipt, Search, X, Download } from 'lucide-react'
import { format } from 'date-fns'
import { exportToCSV } from '@/lib/export'

const TYPE_ICON: Record<string, React.ElementType> = { Invoice: Receipt, Salary: Wallet, Expense: FileText }
const TYPE_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  Invoice: { text: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/30' },
  Salary:  { text: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30'  },
  Expense: { text: 'text-rose-400',   bg: 'bg-rose-500/15',   border: 'border-rose-500/30'  },
}
const STATUS_COLOR: Record<string, string> = {
  Paid:          'bg-emerald-500/15 text-emerald-400',
  PartiallyPaid: 'bg-blue-500/15 text-blue-400',
  Overdue:       'bg-rose-500/15 text-rose-400',
  Sent:          'bg-slate-500/15 text-slate-400',
  Draft:         'bg-slate-600/20 text-slate-500',
  Pending:       'bg-amber-500/15 text-amber-400',
  Approved:      'bg-emerald-500/15 text-emerald-400',
}

export default function SystemRecordsPage() {
  const [typeFilter, setTypeFilter] = useState<'All' | 'Invoice' | 'Salary' | 'Expense'>('All')
  const [search, setSearch] = useState('')

  const { data: systemRecs = [], isLoading } = useSystemRecords()

  const filtered = systemRecs
    .filter((r: SystemRecord) => typeFilter === 'All' || r.type === typeFilter)
    .filter((r: SystemRecord) => !search || r.label.toLowerCase().includes(search.toLowerCase()) || r.party?.toLowerCase().includes(search.toLowerCase()))

  const invoiceTotal = systemRecs.filter((r: SystemRecord) => r.type === 'Invoice').reduce((s, r: SystemRecord) => s + r.amount, 0)
  const salaryTotal  = systemRecs.filter((r: SystemRecord) => r.type === 'Salary').reduce((s, r: SystemRecord) => s + r.amount, 0)
  const expenseTotal = systemRecs.filter((r: SystemRecord) => r.type === 'Expense').reduce((s, r: SystemRecord) => s + r.amount, 0)

  const handleExport = () => {
    exportToCSV(filtered.map(r => ({
      Type:   r.type,
      Label:  r.label,
      Party:  r.party ?? '',
      Amount: r.amount,
      Date:   r.date ? format(new Date(r.date), 'yyyy-MM-dd') : '',
      Status: r.status,
      Ref:    r.ref ?? '',
    })), 'system_records')
  }

  return (
    <div className="min-h-screen bg-slate-900 -m-6 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">System Records</h1>
            <p className="text-slate-400 text-xs">Invoices, salaries and expenses from the financial system</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-700" onClick={handleExport} disabled={!filtered.length}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Records',   value: String(systemRecs.length),                 color: 'text-white',         bg: 'bg-slate-700/60 border-slate-600/40' },
          { label: 'Invoice Amount',  value: `AED ${(invoiceTotal/1000).toFixed(1)}K`,  color: 'text-amber-400',     bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Salary Amount',   value: `AED ${(salaryTotal/1000).toFixed(1)}K`,   color: 'text-blue-400',      bg: 'bg-blue-500/10 border-blue-500/20'   },
          { label: 'Expense Amount',  value: `AED ${(expenseTotal/1000).toFixed(1)}K`,  color: 'text-rose-400',      bg: 'bg-rose-500/10 border-rose-500/20'   },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search label or party…"
            className="w-full bg-slate-700/50 border border-slate-600/40 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex gap-1">
          {(['All', 'Invoice', 'Salary', 'Expense'] as const).map(f => {
            const cfg = f !== 'All' ? TYPE_COLOR[f] : null
            return (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  typeFilter === f
                    ? cfg ? `${cfg.bg} ${cfg.text} border ${cfg.border}` : 'bg-slate-600/60 text-slate-200 border border-slate-500/40'
                    : 'bg-slate-700/40 text-slate-500 hover:text-slate-300'
                }`}>{f}</button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60">
                {['Type', 'Label / Reference', 'Party', 'Date', 'Amount', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-700/30">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No records found</p>
                    <p className="text-slate-500 text-xs mt-1">Adjust your filters or create invoices/salaries/expenses</p>
                  </td>
                </tr>
              ) : (
                filtered.map(rec => {
                  const Icon  = TYPE_ICON[rec.type] ?? FileText
                  const tcfg  = TYPE_COLOR[rec.type] ?? { text: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/30' }
                  const scfg  = STATUS_COLOR[rec.status] ?? 'bg-slate-500/15 text-slate-400'
                  return (
                    <tr key={rec._id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${tcfg.bg} ${tcfg.text} border ${tcfg.border}`}>
                          <Icon className="w-3 h-3" /> {rec.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium text-sm">{rec.label}</p>
                        {rec.ref && <p className="text-slate-500 text-[10px] font-mono mt-0.5">{rec.ref}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-sm">{rec.party || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {rec.date ? format(new Date(rec.date), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-white font-bold text-sm">
                        AED {(rec.amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scfg}`}>{rec.status || '—'}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-slate-700/40 bg-slate-800/80 flex justify-between text-xs">
          <span className="text-amber-400 font-semibold">{systemRecs.filter((r: SystemRecord) => r.type === 'Invoice').length} invoices</span>
          <span className="text-slate-500">{filtered.length} records shown</span>
          <span className="text-blue-400 font-semibold">{systemRecs.filter((r: SystemRecord) => r.type === 'Salary').length} salaries · <span className="text-rose-400">{systemRecs.filter((r: SystemRecord) => r.type === 'Expense').length} expenses</span></span>
        </div>
      </div>
    </div>
  )
}
