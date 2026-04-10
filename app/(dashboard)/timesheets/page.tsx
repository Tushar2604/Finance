'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import Link from 'next/link'
import { Clock, Plus, Download, Upload, Search, X, Filter } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'

const IMPORT_COLUMNS = [
  { key: 'employeeCode', label: 'Employee Code', required: true },
  { key: 'email', label: 'Employee Email', required: true },
  { key: 'referenceCode', label: 'Timesheet Reference Code' },
  { key: 'siteName', label: 'Site Name' },
  { key: 'siteCode', label: 'Site Code (ERP)' },
  { key: 'projectName', label: 'Project Name' },
  { key: 'projectCode', label: 'Project Code' },
  { key: 'month', label: 'Month/Year (YYYY-MM)', required: true },
  { key: 'totalRequiredHours', label: 'Total Required Hours' },
  { key: 'normalServedHours', label: 'Normal Served Hours' },
  { key: 'totalOTHours', label: 'Total OT Hours' },
  { key: 'totalServedHours', label: 'Total Served Hours' },
  { key: 'totalServedDays', label: 'Total Served Days' },
  { key: 'totalLeave', label: 'Total No. of Leave' },
  { key: 'signedTimesheetStatus', label: 'Signed Timesheet Upload Status' },
  { key: 'hrApprovalStatus', label: 'HR Approval Status' },
  { key: 'employeeSignedStatus', label: 'Employee Signed Timesheet Upload Status' },
]

const TEMPLATE_ROWS = [
  {
    employeeCode: 'EMP-001', email: 'emp1@bimstaff.ae', referenceCode: 'TS-2024-001',
    siteName: 'Site Alpha', siteCode: 'SA-001', projectName: 'Project X', projectCode: 'PX-001',
    month: '2024-11', totalRequiredHours: '176', normalServedHours: '160', totalOTHours: '16',
    totalServedHours: '176', totalServedDays: '22', totalLeave: '0',
    signedTimesheetStatus: 'Uploaded', hrApprovalStatus: 'Approved', employeeSignedStatus: 'Uploaded',
  },
]

const HR_COLORS: Record<string, string> = {
  'Approved': 'bg-emerald-100 text-emerald-700',
  'Rejected': 'bg-rose-100 text-rose-700',
  'Pending': 'bg-amber-100 text-amber-700',
  'Under Review': 'bg-blue-100 text-blue-700',
}

const SIGNED_COLORS: Record<string, string> = {
  'Uploaded': 'bg-emerald-100 text-emerald-700',
  'Not Uploaded': 'bg-slate-100 text-slate-500',
  'Pending': 'bg-amber-100 text-amber-700',
  'Rejected': 'bg-rose-100 text-rose-700',
}

interface Filters {
  page: number
  search: string
  month: string
  hrStatus: string
  signedStatus: string
  client: string
}

function useTimesheets(filters: Filters) {
  return useQuery({
    queryKey: ['timesheets', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', filters.page.toString())
      params.append('limit', '20')
      if (filters.month) params.append('month', filters.month)
      if (filters.hrStatus) params.append('hrApprovalStatus', filters.hrStatus)
      if (filters.signedStatus) params.append('signedTimesheetStatus', filters.signedStatus)
      if (filters.client) params.append('clientId', filters.client)
      const { data } = await apiClient.get<any>(`/timesheets?${params}`)
      return data.data
    },
  })
}

function StatusPill({ value, map }: { value?: string; map: Record<string, string> }) {
  if (!value) return <span className="text-slate-400 text-[10px]">—</span>
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[value] ?? 'bg-slate-100 text-slate-500'}`}>
      {value}
    </span>
  )
}

export default function TimesheetsPage() {
  const [page, setPage] = useState(1)
  const [importOpen, setImportOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('')
  const [hrStatus, setHrStatus] = useState('')
  const [signedStatus, setSignedStatus] = useState('')

  const filters: Filters = { page, search, month, hrStatus, signedStatus, client: '' }
  const { data, isLoading, error, refetch } = useTimesheets(filters)

  const hasFilters = !!(search || month || hrStatus || signedStatus)

  const clearFilters = () => {
    setSearch(''); setMonth(''); setHrStatus(''); setSignedStatus(''); setPage(1)
  }

  const handleExport = () => {
    const rows = (data?.data ?? []).map((ts: any) => {
      const firstSite = ts.sites?.[0]
      const totalSiteHrs = (ts.sites ?? []).reduce((s: number, si: any) => s + (si.servedHours ?? 0), 0)
      const totalSiteDays = (ts.sites ?? []).reduce((s: number, si: any) => s + (si.servedDays ?? 0), 0)
      return {
        'Employee Code': ts.employeeId?.employeeCode ?? '',
        'Employee Name': ts.employeeId?.name ?? '',
        'No. of Site/Projects': ts.sites?.length ?? 0,
        'Timesheet Reference Code': ts.referenceCode ?? '',
        'Site Name': firstSite?.siteName ?? '',
        'Site Code (ERP)': firstSite?.siteCode ?? '',
        'Project Name': firstSite?.projectName ?? ts.projectId?.name ?? '',
        'Project Code': firstSite?.projectCode ?? '',
        'Month/Year': ts.month,
        'Total Required Hours': ts.totalRequiredHours ?? '',
        'Normal Served Hours': ts.normalServedHours ?? ts.hours ?? '',
        'Total OT Hours': ts.totalOTHours ?? ts.overtimeHours ?? '',
        'Total Served Hours': ts.totalServedHours ?? '',
        'Total Sum of All Sites Served Hrs': totalSiteHrs || '',
        'Total Served Days': ts.totalServedDays ?? ts.workingDays ?? '',
        'Total Sum of All Sites Served Days': totalSiteDays || '',
        'Total No. of Leave': ts.totalLeave ?? '',
        'Signed Timesheet Upload Status': ts.signedTimesheetStatus ?? '',
        'HR Approval Status': ts.hrApprovalStatus ?? ts.status ?? '',
        'Employee Signed Timesheet Upload Status': ts.employeeSignedStatus ?? '',
      }
    })
    exportToCSV(rows, 'timesheets')
  }

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="Timesheets"
        apiEndpoint="/timesheets/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Timesheets</h2>
          <p className="text-muted-foreground mt-1">
            {data?.pagination ? `${data.pagination.total} records` : 'The source of truth for billing and payroll.'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            className={`gap-2 ${hasFilters ? 'border-teal-500 text-teal-600' : ''}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <Filter className="h-4 w-4" />
            Filters {hasFilters && <span className="bg-teal-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{[search, month, hrStatus, signedStatus].filter(Boolean).length}</span>}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!data?.data?.length}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button className="shadow-md gap-2">
            <Plus className="h-4 w-4" /> Log Timesheet
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Search Employee</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Name or code…"
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="min-w-[140px]">
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Month / Year</label>
            <input
              type="month"
              value={month}
              onChange={e => { setMonth(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>
          <div className="min-w-[160px]">
            <label className="text-xs text-muted-foreground font-medium mb-1 block">HR Approval Status</label>
            <select
              value={hrStatus}
              onChange={e => { setHrStatus(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              <option value="">All</option>
              <option>Pending</option>
              <option>Under Review</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
          <div className="min-w-[180px]">
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Signed Timesheet Status</label>
            <select
              value={signedStatus}
              onChange={e => { setSignedStatus(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              <option value="">All</option>
              <option>Uploaded</option>
              <option>Not Uploaded</option>
              <option>Pending</option>
              <option>Rejected</option>
            </select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="gap-1 text-slate-500 hover:text-slate-800" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Clear All
            </Button>
          )}
        </div>
      )}

      <Card className="shadow-sm border-0 border-t-4 border-t-teal-500 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle>Timesheet Records</CardTitle>
          <CardDescription>All columns from the official timesheet format. Scroll horizontally to view all fields.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : error ? (
            <div className="p-6 text-red-500 bg-red-50 rounded-lg mx-6 mb-6">Failed to load timesheets.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 sticky left-0 bg-slate-50 z-10">Emp Code</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 sticky left-[88px] bg-slate-50 z-10 min-w-[140px]">Employee Name</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 text-center"># Sites</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3">Reference Code</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 min-w-[120px]">Site Name</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3">Site Code (ERP)</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 min-w-[120px]">Project Name</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3">Project Code</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3">Month/Year</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 text-right">Req Hrs</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 text-right">Normal Hrs</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 text-right">OT Hrs</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 text-right">Served Hrs</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 text-right">∑ Sites Hrs</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 text-right">Served Days</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 text-right">∑ Sites Days</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 text-right">Leaves</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 min-w-[100px]">Signed TS</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 min-w-[110px]">HR Approval</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold px-3 py-3 min-w-[110px]">Emp Signed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!data?.data?.length ? (
                      <TableRow>
                        <TableCell colSpan={20} className="text-center h-32 text-muted-foreground">
                          <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No timesheets found. {hasFilters ? 'Try adjusting your filters.' : 'Import a CSV or log a timesheet.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.data.map((ts: any) => {
                        const firstSite = ts.sites?.[0]
                        const totalSiteHrs = (ts.sites ?? []).reduce((s: number, si: any) => s + (si.servedHours ?? 0), 0)
                        const totalSiteDays = (ts.sites ?? []).reduce((s: number, si: any) => s + (si.servedDays ?? 0), 0)
                        return (
                          <TableRow key={ts._id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="px-3 py-2.5 font-mono text-xs text-slate-500 sticky left-0 bg-white">
                              {ts.employeeId?.employeeCode ?? '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 sticky left-[88px] bg-white">
                              <Link href={`/timesheets/${ts._id}`} className="font-semibold text-blue-600 hover:underline text-sm whitespace-nowrap">
                                {ts.employeeId?.name ?? '—'}
                              </Link>
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-center text-sm font-medium">
                              {ts.sites?.length ?? 0}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 font-mono text-xs text-slate-500 whitespace-nowrap">
                              {ts.referenceCode ?? '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap">
                              {firstSite?.siteName ?? ts.projectId?.name ?? '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 font-mono text-xs text-slate-500">
                              {firstSite?.siteCode ?? '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap">
                              {firstSite?.projectName ?? ts.projectId?.name ?? '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 font-mono text-xs text-slate-500">
                              {firstSite?.projectCode ?? '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap">
                              {ts.month}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-sm text-right">
                              {ts.totalRequiredHours ?? '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-sm text-right">
                              {ts.normalServedHours ?? ts.hours ?? '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-sm text-right">
                              {ts.totalOTHours ?? ts.overtimeHours ?? '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-sm text-right font-semibold">
                              {ts.totalServedHours ?? '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-sm text-right">
                              {totalSiteHrs || '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-sm text-right">
                              {ts.totalServedDays ?? ts.workingDays ?? '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-sm text-right">
                              {totalSiteDays || '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-sm text-right">
                              {ts.totalLeave ?? '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2.5">
                              <StatusPill value={ts.signedTimesheetStatus} map={SIGNED_COLORS} />
                            </TableCell>
                            <TableCell className="px-3 py-2.5">
                              <StatusPill value={ts.hrApprovalStatus ?? ts.status} map={HR_COLORS} />
                            </TableCell>
                            <TableCell className="px-3 py-2.5">
                              <StatusPill value={ts.employeeSignedStatus} map={SIGNED_COLORS} />
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} records
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
