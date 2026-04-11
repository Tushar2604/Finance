'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useBankTransactions, useUploadBankStatement } from '@/lib/hooks/useBank'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import {
  UploadCloud, FileText, CheckCircle2, Download, X,
  ArrowUpRight, ArrowDownLeft, Calendar, CreditCard,
  Building2, Hash, Banknote, Activity, Search, Filter,
} from 'lucide-react'
import { format } from 'date-fns'
import { exportToCSV } from '@/lib/export'

function useBankTransaction(id: string | null) {
  return useQuery({
    queryKey: ['bank-tx', id],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/bank/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

function DetailRow({ label, value, mono, className }: {
  label: string; value?: string | null; mono?: boolean; className?: string
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-medium text-slate-800 break-all ${mono ? 'font-mono' : ''} ${className ?? ''}`}>
        {value || '—'}
      </span>
    </div>
  )
}

function TransactionDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: tx, isLoading } = useBankTransaction(id)

  const isCredit = tx?.transactionType === 'Credit'
  const amount = isCredit ? tx?.credit : tx?.debit

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer header */}
        <div className={`px-6 pt-6 pb-4 shrink-0 ${isCredit ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-rose-500 to-red-600'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/80 text-sm font-medium">Transaction Detail</span>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-white/20" />
              <Skeleton className="h-5 w-32 bg-white/20" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                {isCredit
                  ? <ArrowDownLeft className="h-6 w-6 text-white" />
                  : <ArrowUpRight className="h-6 w-6 text-white" />}
                <span className="text-3xl font-bold text-white">
                  {tx?.currency || 'AED'} {amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${isCredit ? 'bg-emerald-700 text-white' : 'bg-rose-700 text-white'} text-xs`}>
                  {tx?.transactionType}
                </Badge>
                <Badge className="bg-white/20 text-white text-xs">{tx?.matchStatus}</Badge>
              </div>
              <p className="text-white/90 text-sm mt-2 leading-snug">{tx?.description}</p>
            </>
          )}
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {isLoading ? (
            <div className="space-y-3 pt-4">
              {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div>
              {/* IDs & Reference */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" /> Identification
                </p>
                <DetailRow label="Transaction ID" value={tx?.transactionId || tx?._id?.toString().slice(-12).toUpperCase().replace(/(.{4})/g, '$1-').slice(0,-1)} mono />
                <DetailRow label="Reference No" value={tx?.reference} mono />
                <DetailRow label="SWIFT / UTR" value={tx?.swift} mono />
              </div>

              {/* Dates */}
              <div className="pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Dates
                </p>
                <DetailRow label="Value Date" value={tx?.valueDate ? format(new Date(tx.valueDate), 'dd MMM yyyy') : tx?.date ? format(new Date(tx.date), 'dd MMM yyyy') : null} />
                <DetailRow label="Posted Date" value={tx?.postedDate ? format(new Date(tx.postedDate), 'dd MMM yyyy') : tx?.date ? format(new Date(tx.date), 'dd MMM yyyy') : null} />
              </div>

              {/* Bank Account */}
              <div className="pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5" /> Account
                </p>
                <DetailRow label="Bank Account" value={tx?.bankAccount || 'Emirates NBD - Main Ops'} />
                <DetailRow label="Currency" value={tx?.currency || 'AED'} />
                <DetailRow label="Payment Channel" value={tx?.paymentChannel || 'Bank Transfer'} />
              </div>

              {/* Counterparty */}
              <div className="pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Counterparty
                </p>
                <DetailRow label="Counterparty" value={tx?.counterparty} />
                <DetailRow label="Counterparty IBAN" value={tx?.counterpartyIban} mono />
              </div>

              {/* Amount breakdown */}
              <div className="pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Financials
                </p>
                <DetailRow label="Amount Type" value={tx?.transactionType} />
                <DetailRow
                  label="Amount"
                  value={`${tx?.currency || 'AED'} ${amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  className={isCredit ? 'text-emerald-600' : 'text-rose-600'}
                />
                <DetailRow
                  label="Running Balance After Txn"
                  value={`${tx?.currency || 'AED'} ${tx?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                />
              </div>

              {/* Reconciliation */}
              <div className="pt-4 pb-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Reconciliation
                </p>
                <DetailRow label="Match Status" value={tx?.matchStatus} />
                <DetailRow
                  label="Narration Confidence"
                  value={tx?.matchConfidence != null ? `${tx.matchConfidence}%` : null}
                  className={tx?.matchConfidence >= 90 ? 'text-emerald-600' : tx?.matchConfidence >= 60 ? 'text-amber-600' : 'text-rose-600'}
                />
                {tx?.matchedEntityType && (
                  <DetailRow label="Matched Entity" value={tx.matchedEntityType} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

export default function BankPage() {
  const [page, setPage] = useState(1)
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [description, setDescription] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [matchStatus, setMatchStatus] = useState('')
  const hasFilters = !!(description || dateFrom || dateTo || matchStatus)

  const { data, isLoading, error } = useBankTransactions({ page, limit: 15, description, dateFrom, dateTo, matchStatus: matchStatus as any || undefined })
  const uploadMutation = useUploadBankStatement()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clearFilters = () => {
    setDescription(''); setDateFrom(''); setDateTo(''); setMatchStatus(''); setPage(1)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('batchName', `Upload_${format(new Date(), 'yyyyMMdd_HHmm')}`)
    await uploadMutation.mutateAsync(formData)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleExport = () => {
    const rows = (data?.data ?? []).map((tx: any) => ({
      date: tx.date ? format(new Date(tx.date), 'yyyy-MM-dd') : '',
      description: tx.description,
      reference: tx.reference ?? '',
      debit: tx.debit > 0 ? tx.debit : '',
      credit: tx.credit > 0 ? tx.credit : '',
      balance: tx.balance,
      transactionType: tx.transactionType,
      matchStatus: tx.matchStatus,
      matchConfidence: tx.matchConfidence ?? '',
    }))
    exportToCSV(rows, 'bank_transactions')
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {selectedTxId && (
        <TransactionDrawer id={selectedTxId} onClose={() => setSelectedTxId(null)} />
      )}

      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bank Statements</h2>
          <p className="text-muted-foreground mt-1">Upload and review bank transactions for reconciliation.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className={`gap-2 ${hasFilters ? 'border-blue-500 text-blue-600' : ''}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <Filter className="h-4 w-4" /> Filters{hasFilters ? ' •' : ''}
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!data?.data?.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending} className="shadow-md gap-2">
            {uploadMutation.isPending
              ? <span className="animate-pulse">Uploading…</span>
              : <><UploadCloud className="h-4 w-4" /> Upload Bank CSV</>}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Description / Company Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={description}
                onChange={e => { setDescription(e.target.value); setPage(1) }}
                placeholder="Search narration…"
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {description && (
                <button onClick={() => setDescription('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="min-w-[140px]">
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Match Status</label>
            <select
              value={matchStatus}
              onChange={e => { setMatchStatus(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">All</option>
              <option>Matched</option>
              <option>Unmatched</option>
              <option>Partial</option>
            </select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="gap-1 text-slate-500 hover:text-slate-800" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      )}

      {uploadMutation.isSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>Successfully uploaded and parsed <strong>{uploadMutation.data?.count}</strong> transactions!</span>
        </div>
      )}
      {uploadMutation.isError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center gap-3">
          <X className="h-5 w-5 text-red-600 shrink-0" />
          <span>Upload failed: {(uploadMutation.error as any)?.response?.data?.error ?? 'Please check your CSV format and try again.'}</span>
        </div>
      )}

      <Card className="shadow-sm border-0 border-t-4 border-t-blue-500">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Click any row to view full transaction details.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-4 text-red-500">Failed to load bank transactions</div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Debit</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Match Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-48 text-muted-foreground">
                          <FileText className="h-10 w-10 text-slate-300 mb-2 mx-auto" />
                          No transactions found. Upload a bank statement CSV to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.data.map((tx: any) => (
                        <TableRow
                          key={tx._id}
                          className="cursor-pointer hover:bg-blue-50 transition-colors text-sm"
                          onClick={() => setSelectedTxId(tx._id)}
                        >
                          <TableCell className="whitespace-nowrap">{format(new Date(tx.date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={tx.description}>{tx.description}</TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">{tx.reference || '—'}</TableCell>
                          <TableCell className="text-rose-600 font-medium">
                            {tx.debit > 0 ? `AED ${tx.debit.toLocaleString()}` : '—'}
                          </TableCell>
                          <TableCell className="text-emerald-600 font-medium">
                            {tx.credit > 0 ? `AED ${tx.credit.toLocaleString()}` : '—'}
                          </TableCell>
                          <TableCell className="font-semibold">AED {tx.balance.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={tx.matchStatus === 'Matched' ? 'default' : tx.matchStatus === 'Partial' ? 'secondary' : 'outline'}>
                              {tx.matchStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} transactions
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={!data.pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={!data.pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
