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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Calendar,
  Building2,
  FolderKanban,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CreditCard,
  User,
} from 'lucide-react'
import { format } from 'date-fns'

function useEmployeeProfile(id: string) {
  return useQuery({
    queryKey: ['employee-profile', id],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/employees/${id}/profile`)
      return data.data
    },
    enabled: !!id,
  })
}

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
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

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: profile, isLoading, error } = useEmployeeProfile(id)

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in pb-10">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="space-y-4 animate-in fade-in">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-600">
          Employee profile not found.
        </div>
      </div>
    )
  }

  const emp = profile.employee
  const initials = emp.name
    ?.split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '??'

  const isProfitable = profile.profitContribution >= 0

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to Employees
      </Button>

      {/* Profile Header Card */}
      <Card className="shadow-sm border overflow-hidden">
        {/* Top accent bar */}
        <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-blue-700 text-xl font-bold">{initials}</span>
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{emp.name}</h1>
                <Badge
                  variant={emp.status === 'Active' ? 'default' : emp.status === 'On-Leave' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {emp.status}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-0.5">{emp.position}</p>

              {/* Meta info row */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-muted-foreground">
                {emp.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {emp.email}
                  </span>
                )}
                {emp.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {emp.phone}
                  </span>
                )}
                {emp.nationality && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    {emp.nationality}
                  </span>
                )}
                {emp.joiningDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Joined {format(new Date(emp.joiningDate), 'MMM yyyy')}
                  </span>
                )}
              </div>
            </div>

            {/* Right meta block */}
            <div className="shrink-0 text-right space-y-1 text-sm">
              <div className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                {emp.employeeCode}
              </div>
              {emp.assignedClientId && (
                <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[180px]">{(emp.assignedClientId as any)?.name ?? '—'}</span>
                </div>
              )}
              {emp.assignedProjectId && (
                <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                  <FolderKanban className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[180px]">{(emp.assignedProjectId as any)?.name ?? '—'}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Revenue Generated"
          value={`AED ${profile.totalRevenueGenerated?.toLocaleString()}`}
          sub={`Over ${profile.tenure} months`}
          icon={DollarSign}
          color="bg-emerald-500"
        />
        <KPICard
          label="Salary Paid"
          value={`AED ${profile.totalSalaryPaid?.toLocaleString()}`}
          sub="Cumulative net payout"
          icon={CreditCard}
          color="bg-blue-500"
        />
        <KPICard
          label="Profit Contribution"
          value={`AED ${Math.abs(profile.profitContribution)?.toLocaleString()}`}
          sub={isProfitable ? 'Positive margin' : 'Negative margin'}
          icon={isProfitable ? TrendingUp : TrendingDown}
          color={isProfitable ? 'bg-indigo-500' : 'bg-rose-500'}
        />
        <KPICard
          label="Utilization Rate"
          value={`${profile.utilizationRate}%`}
          sub="Approved billed months"
          icon={Clock}
          color="bg-amber-500"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="shadow-sm border-0 border-t-4 border-t-blue-400">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Personal Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <Row label="Full Name" value={emp.name} />
                  <Row label="Employee Code" value={emp.employeeCode} mono />
                  <Row label="Position" value={emp.position} />
                  <Row label="Email" value={emp.email} />
                  <Row label="Phone" value={emp.phone || '—'} />
                  <Row label="Nationality" value={emp.nationality || '—'} />
                  <Row label="Joining Date" value={emp.joiningDate ? format(new Date(emp.joiningDate), 'dd MMM yyyy') : '—'} />
                  <Row label="Tenure" value={`${profile.tenure} months`} />
                </dl>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0 border-t-4 border-t-emerald-400">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Compensation</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <Row label="Base Salary" value={`AED ${emp.baseSalary?.toLocaleString()}`} />
                  <Row label="Total Salary Paid" value={`AED ${profile.totalSalaryPaid?.toLocaleString()}`} />
                  <Row label="Revenue Generated" value={`AED ${profile.totalRevenueGenerated?.toLocaleString()}`} />
                  <Row
                    label="Profit Contribution"
                    value={`AED ${Math.abs(profile.profitContribution)?.toLocaleString()}`}
                    highlight={isProfitable ? 'green' : 'red'}
                  />
                  <Row label="Utilization Rate" value={`${profile.utilizationRate}%`} />
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timesheets */}
        <TabsContent value="timesheets" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recent Timesheets (Last 12 months)</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.recentTimesheets?.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No timesheet records found.</p>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile.recentTimesheets?.map((ts: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{ts.month}</TableCell>
                        <TableCell>{ts.hours}h</TableCell>
                        <TableCell>
                          <Badge variant={ts.status === 'Approved' ? 'default' : ts.status === 'Rejected' ? 'destructive' : 'secondary'}>
                            {ts.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects */}
        <TabsContent value="projects" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Project History</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.projectHistory?.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No project assignments found.</p>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile.projectHistory?.map((proj: any) => (
                      <TableRow key={proj._id}>
                        <TableCell className="font-medium">{proj.name}</TableCell>
                        <TableCell>
                          <Badge variant={proj.status === 'Active' ? 'default' : 'secondary'}>
                            {proj.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {proj.startDate ? format(new Date(proj.startDate), 'MMM yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {proj.endDate ? format(new Date(proj.endDate), 'MMM yyyy') : 'Ongoing'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Details */}
        <TabsContent value="bank" className="mt-4">
          <Card className="shadow-sm border-0 border-t-4 border-t-slate-400">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <Row label="Bank Name" value={emp.bankDetails?.bankName || '—'} />
                <Row label="Account Number" value={emp.bankDetails?.accountNumber || '—'} mono />
                <Row label="IBAN" value={emp.bankDetails?.iban || '—'} mono />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: 'green' | 'red'
}) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={[
          'font-medium',
          mono ? 'font-mono text-xs' : '',
          highlight === 'green' ? 'text-emerald-600' : '',
          highlight === 'red' ? 'text-rose-600' : '',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  )
}
