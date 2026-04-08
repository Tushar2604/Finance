'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Globe,
  ExternalLink,
  Building2,
  FileText,
  Users,
  FolderKanban,
  DollarSign,
  AlertCircle,
  Receipt,
  CreditCard,
} from 'lucide-react'
import { format } from 'date-fns'

// ─── Data hooks ──────────────────────────────────────────────────────────────

function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/clients/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

function useClientSummary(id: string) {
  return useQuery({
    queryKey: ['client-summary', id],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/clients/${id}/summary`)
      return data.data
    },
    enabled: !!id,
  })
}

function useClientEmployees(id: string) {
  return useQuery({
    queryKey: ['client-employees', id],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/employees?clientId=${id}&limit=50`)
      return data.data?.data ?? []
    },
    enabled: !!id,
  })
}

function useClientInvoices(id: string) {
  return useQuery({
    queryKey: ['client-invoices', id],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/invoices?clientId=${id}&limit=20`)
      return data.data?.data ?? []
    },
    enabled: !!id,
  })
}

// ─── Small reusable row ───────────────────────────────────────────────────────

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className={`font-medium text-sm text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: client, isLoading: loadingClient } = useClient(id)
  const { data: summary, isLoading: loadingSummary } = useClientSummary(id)
  const { data: employees } = useClientEmployees(id)
  const { data: invoices } = useClientInvoices(id)

  const isLoading = loadingClient || loadingSummary

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in pb-10">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-600">Client not found.</div>
      </div>
    )
  }

  const initials = client.name
    ?.split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '??'

  // Normalize website URL for display and href
  const rawWebsite = client.website?.trim() ?? ''
  const websiteHref = rawWebsite && !rawWebsite.startsWith('http') ? `https://${rawWebsite}` : rawWebsite
  const websiteDisplay = rawWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '')

  const statusVariant = (s: string) => {
    if (s === 'Paid') return 'default' as const
    if (s === 'Overdue') return 'destructive' as const
    return 'secondary' as const
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* Back */}
      <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to Clients
      </Button>

      {/* Header card */}
      <Card className="shadow-sm border overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-blue-700 text-xl font-bold">{initials}</span>
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
                <Badge variant={client.isActive ? 'default' : 'secondary'}>
                  {client.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {client.contractType && client.contractType !== 'None' && (
                  <Badge variant="outline">{client.contractType}</Badge>
                )}
              </div>

              {client.industry && (
                <p className="text-muted-foreground mt-0.5">{client.industry}</p>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-muted-foreground">
                {client.companyDetails?.email && (
                  <a href={`mailto:${client.companyDetails.email}`} className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                    <Mail className="h-3.5 w-3.5" />
                    {client.companyDetails.email}
                  </a>
                )}
                {client.companyDetails?.phone && (
                  <a href={`tel:${client.companyDetails.phone}`} className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                    <Phone className="h-3.5 w-3.5" />
                    {client.companyDetails.phone}
                  </a>
                )}
                {client.companyDetails?.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {client.companyDetails.address}
                  </span>
                )}
              </div>
            </div>

            {/* Right block — website + billing info */}
            <div className="shrink-0 text-right space-y-2">
              {websiteDisplay && (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {websiteDisplay}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              )}
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Rate: <span className="font-semibold text-slate-700">AED {client.rateCard}/hr</span></div>
                <div>Billing: <span className="font-semibold text-slate-700">{client.billingType}</span></div>
                <div>Credit Terms: <span className="font-semibold text-slate-700">{client.creditTerms} days</span></div>
              </div>
              {client.companyDetails?.taxNumber && (
                <div className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                  TRN: {client.companyDetails.taxNumber}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Total Revenue"
          value={`AED ${(summary?.totalRevenue ?? 0).toLocaleString()}`}
          sub="All invoiced amounts"
          icon={DollarSign}
          color="bg-emerald-500"
        />
        <KPICard
          label="Active Employees"
          value={String(summary?.totalEmployees ?? 0)}
          sub="Currently assigned"
          icon={Users}
          color="bg-blue-500"
        />
        <KPICard
          label="Active Projects"
          value={String(summary?.activeProjects ?? 0)}
          sub="Running right now"
          icon={FolderKanban}
          color="bg-violet-500"
        />
        <KPICard
          label="Outstanding"
          value={`AED ${(summary?.unpaidAmount ?? 0).toLocaleString()}`}
          sub={`${summary?.unpaidInvoices ?? 0} unpaid invoice${summary?.unpaidInvoices !== 1 ? 's' : ''}`}
          icon={summary?.unpaidInvoices > 0 ? AlertCircle : Receipt}
          color={summary?.unpaidInvoices > 0 ? 'bg-rose-500' : 'bg-slate-400'}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees ({employees?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="shadow-sm border-0 border-t-4 border-t-blue-400">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Company Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-0">
                  <DetailRow label="Client Name" value={client.name} />
                  <DetailRow label="Industry" value={client.industry || '—'} />
                  <DetailRow label="Email" value={client.companyDetails?.email || '—'} />
                  <DetailRow label="Phone" value={client.companyDetails?.phone || '—'} />
                  <DetailRow label="Address" value={client.companyDetails?.address || '—'} />
                  <DetailRow label="Tax Number" value={client.companyDetails?.taxNumber || '—'} mono />
                  {websiteDisplay && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <dt className="text-muted-foreground text-sm">Website</dt>
                      <dd>
                        <a
                          href={websiteHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {websiteDisplay}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </dd>
                    </div>
                  )}
                  <DetailRow label="Status" value={client.isActive ? 'Active' : 'Inactive'} />
                  <DetailRow label="Member since" value={client.createdAt ? format(new Date(client.createdAt), 'dd MMM yyyy') : '—'} />
                </dl>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0 border-t-4 border-t-emerald-400">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Contract & Billing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-0">
                  <DetailRow label="Contract Type" value={client.contractType || '—'} />
                  <DetailRow label="Billing Type" value={client.billingType || '—'} />
                  <DetailRow label="Rate Card" value={`AED ${client.rateCard}/hr`} />
                  <DetailRow label="Credit Terms" value={`${client.creditTerms} days`} />
                  <DetailRow label="Total Revenue" value={`AED ${(summary?.totalRevenue ?? 0).toLocaleString()}`} />
                  <DetailRow label="Unpaid Amount" value={`AED ${(summary?.unpaidAmount ?? 0).toLocaleString()}`} />
                  <DetailRow label="Unpaid Invoices" value={String(summary?.unpaidInvoices ?? 0)} />
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employees */}
        <TabsContent value="employees" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Assigned Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!employees?.length ? (
                <p className="text-muted-foreground text-sm text-center py-8">No employees assigned to this client.</p>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Position</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Base Salary</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp: any) => (
                        <tr key={emp._id} className="border-t hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium">{emp.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{emp.employeeCode}</td>
                          <td className="px-4 py-3 text-muted-foreground">{emp.position ?? '—'}</td>
                          <td className="px-4 py-3">AED {emp.baseSalary?.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <Badge variant={emp.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                              {emp.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Invoice History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!invoices?.length ? (
                <p className="text-muted-foreground text-sm text-center py-8">No invoices found for this client.</p>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice #</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Month</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paid</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Due Date</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv: any) => (
                        <tr key={inv._id} className="border-t hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold text-blue-600 text-xs">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3 text-muted-foreground">{inv.month}</td>
                          <td className="px-4 py-3 font-semibold">AED {inv.totalAmount?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-emerald-600">AED {inv.paidAmount?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {inv.dueDate ? format(new Date(inv.dueDate), 'MMM dd, yyyy') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusVariant(inv.status)} className="text-xs">{inv.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
