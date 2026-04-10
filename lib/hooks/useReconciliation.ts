import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface BankTx {
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

export interface SystemRecord {
  _id: string
  type: 'Invoice' | 'Salary' | 'Expense'
  label: string
  amount: number
  date: string
  status: string
  ref?: string
  party?: string
}

export interface MatchSuggestion {
  bankTx: BankTx
  systemRecord: SystemRecord
  confidence: number
  reasons: string[]
  amountDiff: number
  dateDiff: number
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useBankTransactions(month: string) {
  return useQuery({
    queryKey: ['bank-recon', month],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' })
      if (month) params.append('month', month)
      const { data } = await apiClient.get<any>(`/bank?${params}`)
      return (data.data?.data ?? []).map((tx: any): BankTx => ({
        _id: tx._id,
        description: tx.description ?? '',
        amount: tx.transactionType === 'Credit' ? (tx.credit ?? 0) : (tx.debit ?? 0),
        type: tx.transactionType as 'Credit' | 'Debit',
        date: tx.date ?? tx.createdAt,
        reference: tx.reference,
        counterparty: tx.counterparty,
        matchStatus: tx.matchStatus,
        reconciliationConfidence: tx.matchConfidence,
      }))
    },
  })
}

export function useSystemRecords() {
  return useQuery({
    queryKey: ['system-records'],
    queryFn: async () => {
      const [inv, sal, exp] = await Promise.all([
        apiClient.get<any>(`/invoices?limit=50`),
        apiClient.get<any>(`/salaries?limit=50`),
        apiClient.get<any>(`/expenses?limit=50`),
      ])
      const invoices: SystemRecord[] = (inv.data.data?.data ?? []).map((i: any) => ({
        _id: i._id,
        type: 'Invoice' as const,
        label: i.invoiceNumber ?? `INV-${i._id.slice(-6)}`,
        amount: i.totalAmount ?? 0,
        date: i.issueDate ?? i.invoiceDate ?? i.createdAt,
        status: i.status,
        ref: i.invoiceNumber,
        party: i.clientId?.name ?? i.clientId,
      }))
      const salaries: SystemRecord[] = (sal.data.data?.data ?? []).map((s: any) => ({
        _id: s._id,
        type: 'Salary' as const,
        label: `Salary – ${s.employeeId?.name ?? s.employeeId}`,
        amount: s.netSalary ?? s.baseSalary ?? 0,
        date: s.month ?? s.createdAt,
        status: s.paymentStatus ?? s.status,
        ref: s.month,
        party: s.employeeId?.name,
      }))
      const expenses: SystemRecord[] = (exp.data.data?.data ?? []).map((e: any) => ({
        _id: e._id,
        type: 'Expense' as const,
        label: e.description,
        amount: e.amount ?? 0,
        date: e.date,
        status: e.status,
        ref: e.bankReference,
        party: e.paidTo,
      }))
      return [...invoices, ...salaries, ...expenses]
    },
  })
}

export function useReconSummary() {
  return useQuery({
    queryKey: ['recon-summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<any>('/reconciliation/summary')
      return data.data
    },
  })
}

// ─── Match Engine ──────────────────────────────────────────────────────────────

export function computeMatches(bankTxs: BankTx[], systemRecords: SystemRecord[]): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = []
  const usedSystem = new Set<string>()

  for (const btx of bankTxs) {
    let best: MatchSuggestion | null = null
    for (const sys of systemRecords) {
      if (usedSystem.has(sys._id)) continue
      if (btx.type === 'Credit' && sys.type !== 'Invoice') continue
      if (btx.type === 'Debit' && sys.type === 'Invoice') continue

      const amtDiff = Math.abs(btx.amount - sys.amount)
      const amtPct  = amtDiff / (sys.amount || 1)
      const daysOff = Math.abs((new Date(btx.date).getTime() - new Date(sys.date).getTime()) / 86400000)

      let score = 100
      const reasons: string[] = []

      if (amtPct < 0.001)     { reasons.push('Exact amount match') }
      else if (amtPct < 0.02) { score -= 10; reasons.push('Amount within 2%') }
      else if (amtPct < 0.1)  { score -= 30; reasons.push('Amount within 10%') }
      else                     { score -= 60 }

      if (daysOff === 0)       { reasons.push('Same date') }
      else if (daysOff <= 3)   { score -= 5;  reasons.push(`${daysOff}d apart`) }
      else if (daysOff <= 7)   { score -= 15; reasons.push(`${daysOff}d apart`) }
      else if (daysOff <= 30)  { score -= 25; reasons.push(`${daysOff}d apart`) }
      else                     { score -= 50 }

      if (score < 30) continue
      if (!best || score > best.confidence) {
        best = { bankTx: btx, systemRecord: sys, confidence: Math.min(100, Math.max(0, score)), reasons, amountDiff: amtDiff, dateDiff: daysOff }
      }
    }
    if (best && best.confidence >= 40) {
      usedSystem.add(best.systemRecord._id)
      suggestions.push(best)
    }
  }
  return suggestions.sort((a, b) => b.confidence - a.confidence)
}
