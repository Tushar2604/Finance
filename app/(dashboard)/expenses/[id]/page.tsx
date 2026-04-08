'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Receipt, Calendar, User, Building2,
  FolderKanban, CheckCircle2, XCircle, Clock,
  CreditCard, Tag, DollarSign,
} from 'lucide-react'
import { format } from 'date-fns'

function useExpense(id: string) {
  return useQuery({
    queryKey: ['expense', id],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/expenses/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

function Row({ label, value, mono, highlight }: {
  label: string; value: string; mono?: boolean; highlight?: 'green' | 'red' | 'amber'
}) {
  const colorMap = { green: 'text-emerald-600', red: 'text-rose-600', amber: 'text-amber-600' }
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className={`font-medium text-sm text-right ${mono ? 'font-mono text-xs' : ''} ${highlight ? colorMap[highlight] : ''}`}>
        {value}
      </dd>
    </div>
  )
}

const statusConfig: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; icon: React.ReactNode }> = {
  Approved: { variant: 'default', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
  Rejected: { variant: 'destructive', icon: <XCircle className="h-4 w-4 text-rose-500" /> },
  Pending:  { variant: 'secondary',  icon: <Clock className="h-4 w-4 text-amber-500" /> },
}

const categoryColors: Record<string, string> = {
  Salary: 'bg-blue-100 text-blue-800', Travel: 'bg-amber-100 text-amber-800',
  Office: 'bg-slate-100 text-slate-800', Software: 'bg-violet-100 text-violet-800',
  Equipment: 'bg-cyan-100 text-cyan-800', Marketing: 'bg-pink-100 text-pink-800',
  Utilities: 'bg-orange-100 text-orange-800', Visa: 'bg-emerald-100 text-emerald-800',
  Admin: 'bg-indigo-100 text-indigo-800', IT: 'bg-teal-100 text-teal-800',
  Other: 'bg-gray-100 text-gray-800',
}

export default function ExpenseProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: expense, isLoading, error } = useExpense(id)

  if (isLoading) {
    return (
      <div className="space-y-6 pb-10">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
      </div>
    )
  }

  if (error || !expense) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-600">Expense not found.</div>
      </div>
    )
  }

  const status = expense.status ?? 'Pending'
  const cfg = statusConfig[status] ?? statusConfig.Pending
  const catColor = categoryColors[expense.category] ?? categoryColors.Other
  const currency = expense.currency ?? 'AED'

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to Expenses
      </Button>

      {/* Header */}
      <Card className="shadow-sm border overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start gap-6">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
              <Receipt className="w-7 h-7 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight truncate max-w-lg">{expense.description}</h1>
                <div className="flex items-center gap-1.5">
                  {cfg.icon}
                  <Badge variant={cfg.variant}>{status}</Badge>
                </div>
                {expense.isBillable && (
                  <Badge variant="outline" className="text-blue-700 border-blue-300">Billable</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-muted-foreground">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${catColor}`}>
                  <Tag className="h-3 w-3" />
                  {expense.category}
                  {expense.subCategory && ` › ${expense.subCategory}`}
                </span>
                {expense.date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(expense.date), 'dd MMM yyyy')}
                  </span>
                )}
                {expense.employeeId && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {expense.employeeId.name ?? '—'}
                  </span>
                )}
                {expense.clientId && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {expense.clientId.name ?? '—'}
                  </span>
                )}
                {expense.projectId && (
                  <span className="flex items-center gap-1.5">
                    <FolderKanban className="h-3.5 w-3.5" />
                    {expense.projectId.name ?? '—'}
                  </span>
                )}
              </div>
            </div>

            {/* Amount block */}
            <div className="shrink-0 text-right">
              <div className="text-3xl font-bold text-amber-700">
                {currency} {expense.amount?.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{expense.paymentMode ?? 'Bank'}</div>
              {expense.bankReference && (
                <div className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 mt-2">
                  {expense.bankReference}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-sm border-0 border-t-4 border-t-amber-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Financial Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-0">
              <Row label="Amount" value={`${currency} ${expense.amount?.toLocaleString()}`} highlight="amber" />
              <Row label="Currency" value={currency} />
              <Row label="Category" value={expense.category} />
              {expense.subCategory && <Row label="Sub-Category" value={expense.subCategory} />}
              <Row label="Paid To" value={expense.paidTo || '—'} />
              <Row label="Payment Mode" value={expense.paymentMode ?? '—'} />
              <Row label="Bank Reference" value={expense.bankReference || '—'} mono />
              <Row label="Billable to Client" value={expense.isBillable ? 'Yes' : 'No'} />
            </dl>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 border-t-4 border-t-slate-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Expense Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-0">
              <Row label="Date" value={expense.date ? format(new Date(expense.date), 'dd MMM yyyy') : '—'} />
              <Row label="Status" value={status} />
              <Row
                label="Employee"
                value={expense.employeeId ? (expense.employeeId.name ?? '—') : 'N/A'}
              />
              <Row
                label="Client"
                value={expense.clientId ? (expense.clientId.name ?? '—') : 'N/A'}
              />
              <Row
                label="Project"
                value={expense.projectId ? (expense.projectId.name ?? '—') : 'N/A'}
              />
              <Row label="Created" value={expense.createdAt ? format(new Date(expense.createdAt), 'dd MMM yyyy') : '—'} />
              <Row label="Last Updated" value={expense.updatedAt ? format(new Date(expense.updatedAt), 'dd MMM yyyy') : '—'} />
            </dl>
            {expense.notes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground font-medium mb-1">Notes</p>
                <p className="text-sm text-slate-700">{expense.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
