'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft, FileText, Calendar, Building2, User,
  FolderKanban, CheckCircle2, Clock, XCircle, AlertCircle,
  DollarSign, Receipt, Send, Ban,
} from 'lucide-react'
import { format } from 'date-fns'

function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/invoices/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

function Row({ label, value, mono, highlight }: {
  label: string; value: string; mono?: boolean; highlight?: 'green' | 'red' | 'amber' | 'blue'
}) {
  const colorMap = {
    green: 'text-emerald-600',
    red: 'text-rose-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
  }
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className={`font-medium text-sm text-right ${mono ? 'font-mono text-xs' : ''} ${highlight ? colorMap[highlight] : ''}`}>
        {value}
      </dd>
    </div>
  )
}

const statusConfig: Record<string, {
  variant: 'default' | 'destructive' | 'secondary' | 'outline'
  icon: React.ReactNode
  color: string
}> = {
  Paid:          { variant: 'default',      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, color: 'from-emerald-500 to-teal-600' },
  PartiallyPaid: { variant: 'secondary',    icon: <Clock className="h-4 w-4 text-amber-500" />,        color: 'from-amber-500 to-orange-500' },
  Sent:          { variant: 'secondary',    icon: <Send className="h-4 w-4 text-blue-500" />,           color: 'from-blue-500 to-indigo-600' },
  Draft:         { variant: 'outline',      icon: <FileText className="h-4 w-4 text-slate-400" />,      color: 'from-slate-400 to-slate-500' },
  Overdue:       { variant: 'destructive',  icon: <AlertCircle className="h-4 w-4 text-rose-500" />,    color: 'from-rose-500 to-red-600' },
  Cancelled:     { variant: 'outline',      icon: <Ban className="h-4 w-4 text-slate-400" />,           color: 'from-slate-300 to-slate-400' },
}

export default function InvoiceProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: inv, isLoading, error } = useInvoice(id)

  if (isLoading) {
    return (
      <div className="space-y-6 pb-10">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
      </div>
    )
  }

  if (error || !inv) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-600">Invoice not found.</div>
      </div>
    )
  }

  const status = inv.status ?? 'Draft'
  const cfg = statusConfig[status] ?? statusConfig.Draft
  const paidAmount = inv.paidAmount ?? 0
  const totalAmount = inv.totalAmount ?? 0
  const outstanding = Math.max(0, totalAmount - paidAmount)
  const paidPct = totalAmount > 0 ? Math.min(100, (paidAmount / totalAmount) * 100) : 0
  const isOverdue = status === 'Overdue'

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to Invoices
      </Button>

      {/* Header */}
      <Card className="shadow-sm border overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${cfg.color}`} />
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start gap-6">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100">
              <FileText className="w-7 h-7 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight font-mono">{inv.invoiceNumber}</h1>
                <div className="flex items-center gap-1.5">
                  {cfg.icon}
                  <Badge variant={cfg.variant}>{status}</Badge>
                </div>
                {isOverdue && (
                  <Badge variant="destructive" className="animate-pulse">Past Due</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-muted-foreground">
                {inv.clientId && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {inv.clientId.name ?? '—'}
                  </span>
                )}
                {inv.employeeId && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {inv.employeeId.name ?? '—'}
                  </span>
                )}
                {inv.projectId && (
                  <span className="flex items-center gap-1.5">
                    <FolderKanban className="h-3.5 w-3.5" />
                    {inv.projectId.name ?? '—'}
                  </span>
                )}
                {inv.invoiceDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Issued {format(new Date(inv.invoiceDate), 'dd MMM yyyy')}
                  </span>
                )}
                {inv.dueDate && (
                  <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-rose-600 font-medium' : ''}`}>
                    <Clock className="h-3.5 w-3.5" />
                    Due {format(new Date(inv.dueDate), 'dd MMM yyyy')}
                  </span>
                )}
              </div>
            </div>

            {/* Amount block */}
            <div className="shrink-0 text-right">
              <div className="text-3xl font-bold text-emerald-700">
                AED {totalAmount.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{inv.month ?? ''}</div>
              {outstanding > 0 && (
                <div className="text-sm font-semibold text-rose-600 mt-1">
                  AED {outstanding.toLocaleString()} outstanding
                </div>
              )}
            </div>
          </div>

          {/* Payment progress */}
          {totalAmount > 0 && (
            <div className="mt-5 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Payment progress</span>
                <span>{Math.round(paidPct)}% paid</span>
              </div>
              <Progress value={paidPct} className="h-2 [&>div]:bg-emerald-500" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Subtotal', value: `AED ${inv.subtotal?.toLocaleString() ?? 0}`, icon: Receipt, color: 'bg-blue-500' },
          { label: 'VAT (5%)', value: `AED ${inv.vatAmount?.toLocaleString() ?? 0}`, icon: DollarSign, color: 'bg-purple-500' },
          { label: 'Paid Amount', value: `AED ${paidAmount.toLocaleString()}`, icon: CheckCircle2, color: 'bg-emerald-500' },
          { label: 'Outstanding', value: `AED ${outstanding.toLocaleString()}`, icon: outstanding > 0 ? AlertCircle : CheckCircle2, color: outstanding > 0 ? 'bg-rose-500' : 'bg-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                  <p className="text-lg font-bold mt-1">{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-sm border-0 border-t-4 border-t-emerald-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Financial Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-0">
              <Row label="Rate" value={`AED ${inv.rate?.toLocaleString() ?? 0}/hr`} />
              <Row label="Hours Billed" value={`${inv.hours ?? 0}h`} />
              <Row label="Subtotal" value={`AED ${inv.subtotal?.toLocaleString() ?? 0}`} />
              <Row label="VAT Amount" value={`AED ${inv.vatAmount?.toLocaleString() ?? 0}`} />
              <Row label="Total Amount" value={`AED ${totalAmount.toLocaleString()}`} highlight="blue" />
              <Row label="Paid Amount" value={`AED ${paidAmount.toLocaleString()}`} highlight="green" />
              <Row label="Outstanding" value={`AED ${outstanding.toLocaleString()}`} highlight={outstanding > 0 ? 'red' : 'green'} />
              {inv.paidDate && (
                <Row label="Payment Date" value={format(new Date(inv.paidDate), 'dd MMM yyyy')} />
              )}
            </dl>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 border-t-4 border-t-slate-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-0">
              <Row label="Invoice Number" value={inv.invoiceNumber} mono />
              <Row label="Month" value={inv.month ?? '—'} />
              <Row label="Status" value={status} />
              <Row label="Issue Date" value={inv.invoiceDate ? format(new Date(inv.invoiceDate), 'dd MMM yyyy') : '—'} />
              <Row label="Due Date" value={inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy') : '—'} highlight={isOverdue ? 'red' : undefined} />
              <Row label="Client" value={inv.clientId?.name ?? '—'} />
              <Row label="Employee" value={inv.employeeId?.name ?? 'N/A'} />
              <Row label="Project" value={inv.projectId?.name ?? 'N/A'} />
              <Row label="Created" value={inv.createdAt ? format(new Date(inv.createdAt), 'dd MMM yyyy') : '—'} />
            </dl>
            {inv.notes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground font-medium mb-1">Notes</p>
                <p className="text-sm text-slate-700">{inv.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
