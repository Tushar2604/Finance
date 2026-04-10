'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import Link from 'next/link'
import { Clock, Plus, Download, Upload, Search, X, Filter, Trash2, Pencil } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'
import TimesheetFormModal from '@/components/TimesheetFormModal'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { TIMESHEET_COLUMNS } from '@/constants/tableColumns'
import { ERPTableHeader } from '@/components/shared/ERPTableHeader'
import { cn } from '@/lib/utils'

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

function DeleteConfirm({ label, onConfirm, onCancel, loading }: { label: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white border rounded-2xl p-6 max-w-sm w-full shadow-2xl mx-4">
        <h3 className="font-bold text-lg text-slate-800">Delete Timesheet</h3>
        <p className="text-slate-500 text-sm mt-2">Delete timesheet for <span className="font-semibold text-slate-700">{label}</span>? This cannot be undone.</p>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const queryClient = useQueryClient()

  const filters: Filters = { page, search, month, hrStatus, signedStatus, client: '' }
  const { data, isLoading, error, refetch } = useTimesheets(filters)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/timesheets/${id}`),
    onSuccess: () => { setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ['timesheets'] }) },
  })

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

  const mappedData = useMemo(() => {
    return (data?.data ?? []).map((ts: any) => {
      const firstSite = ts.sites?.[0]
      const totalSiteHrs = (ts.sites ?? []).reduce((s: number, si: any) => s + (si.servedHours ?? 0), 0)
      const totalSiteDays = (ts.sites ?? []).reduce((s: number, si: any) => s + (si.servedDays ?? 0), 0)
      
      return {
        ...ts,
        empCode: ts.employeeId?.employeeCode ?? '—',
        employeeName: ts.employeeId?.name ?? '—',
        referenceCode: ts.referenceCode ?? '—',
        siteName: firstSite?.siteName ?? ts.projectId?.name ?? '—',
        siteCode: firstSite?.siteCode ?? '—',
        projectName: firstSite?.projectName ?? ts.projectId?.name ?? '—',
        projectCode: firstSite?.projectCode ?? '—',
        monthYear: ts.month ?? '—',
        reqHrs: ts.totalRequiredHours ?? 0,
        normalHrs: ts.normalServedHours ?? ts.hours ?? 0,
        otHrs: ts.totalOTHours ?? ts.overtimeHours ?? 0,
        servedHrs: ts.totalServedHours ?? 0,
        sumSitesHrs: totalSiteHrs || 0,
        servedDays: ts.totalServedDays ?? ts.workingDays ?? 0,
        sumSitesDays: totalSiteDays || 0,
        leaves: ts.totalLeave ?? 0,
        signedTs: ts.signedTimesheetStatus ?? '—'
      }
    })
  }, [data?.data])

  const tableColumns = useMemo(() => [
    ...TIMESHEET_COLUMNS,
    {
      id: 'actions',
      header: '',
      cell: ({ row }: any) => {
        const ts = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => { setEditTarget(ts); setFormOpen(true) }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeleteTarget({ id: ts._id, label: `${ts.employeeId?.name ?? 'Unknown'} – ${ts.month}` })}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      }
    }
  ], [])

  const table = useReactTable({
    data: mappedData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      {formOpen && (
        <TimesheetFormModal
          timesheet={editTarget}
          onClose={() => { setFormOpen(false); setEditTarget(null) }}
          onSuccess={() => { setFormOpen(false); setEditTarget(null); queryClient.invalidateQueries({ queryKey: ['timesheets'] }) }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          label={deleteTarget.label}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
        />
      )}
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
          <Button className="shadow-md gap-2" onClick={() => { setEditTarget(null); setFormOpen(true) }}>
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
          {error ? (
            <div className="p-6 text-red-500 bg-red-50 rounded-lg mx-6 mb-6">Failed to load timesheets.</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm min-w-max">
                <ERPTableHeader table={table} isLoading={isLoading} />
                {!isLoading && (
                  <tbody className="bg-white">
                    {table.getRowModel().rows.length === 0 ? (
                      <tr>
                        <td colSpan={tableColumns.length} className="text-center h-32 text-slate-500 py-10">
                          <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No timesheets found. {hasFilters ? 'Try adjusting your filters.' : 'Import a CSV or log a timesheet.'}
                        </td>
                      </tr>
                    ) : (
                      table.getRowModel().rows.map(row => (
                        <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors h-10">
                          {row.getVisibleCells().map(cell => {
                            const meta = cell.column.columnDef.meta as any
                            const align = meta?.align || (meta?.isNumeric ? 'center' : 'left')
                            return (
                              <td key={cell.id} className={cn("px-3 py-2 whitespace-nowrap text-slate-600", align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left')}>
                                {cell.column.id === 'employeeName' ? (
                                  <Link href={`/timesheets/${row.original._id}`} className="font-semibold text-blue-600 hover:underline">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </Link>
                                ) : (
                                  flexRender(cell.column.columnDef.cell, cell.getContext())
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                )}
              </table>
            </div>
          )}
          
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
        </CardContent>
      </Card>
    </div>
  )
}
