'use client'

import React, { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, Upload, Trash2, Search, X, Filter } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api'

/* ─── Column headers (exact spec order) ──────────────────────────────────── */
const COL_HEADERS = [
  'Employee Code', 'Employee Name', 'Site Name', 'Labour Card No', 'WPS Routing Code',
  'IBAN', 'Visa Under Company', 'Monthly Salary', 'Month/Year',
  'Total Served Days', 'Normal Served Hours', 'OT Hours', 'Total Required Hours',
  'Total Served Hrs.', 'Total Site Served Hours', 'Salary Amount',
  'Prev. Month OT Amt.', 'OT Amount', 'Gross Amount', 'Other Payable',
  'Compensation Amount', 'Advance Deduction', 'Petty Cash Amount', 'Other Deduction',
  'WPS Violation', 'Diff. From Current Salary', 'Net Payable', 'Total Site Net Payable',
  'Signed TS Status', 'Payment Source', '',
]

/* ─── Import columns (exact spec order) ──────────────────────────────────── */
const IMPORT_COLUMNS = [
  { key: 'email',                       label: 'Employee Email',               required: true },
  { key: 'month',                       label: 'Month/Year (YYYY-MM)',          required: true },
  { key: 'siteName',                    label: 'Site Name' },
  { key: 'labourCardNo',                label: 'Labour Card No' },
  { key: 'wpsRoutingCode',              label: 'WPS Routing Code' },
  { key: 'iban',                        label: 'IBAN' },
  { key: 'visaUnderCompany',            label: 'Visa Under Company' },
  { key: 'monthlySalary',               label: 'Monthly Salary' },
  { key: 'totalServedDays',             label: 'Total Served Days' },
  { key: 'normalServedHours',           label: 'Normal Served Hours' },
  { key: 'otHours',                     label: 'OT Hours' },
  { key: 'totalRequiredHours',          label: 'Total Required Hours' },
  { key: 'totalServedHrs',              label: 'Total Served Hrs.' },
  { key: 'totalSiteServedHours',        label: 'Total Site Served Hours' },
  { key: 'salaryAmount',                label: 'Salary Amount' },
  { key: 'previousMonthOvertimeAmt',    label: 'Previous Month OT Amt.' },
  { key: 'otAmount',                    label: 'OT Amount' },
  { key: 'grossAmount',                 label: 'Gross Amount' },
  { key: 'otherPayable',               label: 'Other Payable' },
  { key: 'compensationAmount',          label: 'Compensation Amount' },
  { key: 'advanceDeduction',            label: 'Advance Deduction' },
  { key: 'pettyCashAmount',             label: 'Petty Cash Amount' },
  { key: 'otherDeduction',              label: 'Other Deduction' },
  { key: 'wpsViolation',                label: 'WPS Violation' },
  { key: 'differenceFromCurrentSalary', label: 'Difference From Current Salary' },
  { key: 'netPayable',                  label: 'Net Payable' },
  { key: 'totalSiteNetPayable',         label: 'Total Site Net Payable' },
  { key: 'signedTimesheetUploadStatus', label: 'Signed Timesheet Upload Status' },
  { key: 'paymentSource',               label: 'Payment Source' },
]

const TEMPLATE_ROWS = [{
  email: 'emp@bimstaff.ae', month: '2026-04', siteName: 'Site Alpha',
  labourCardNo: 'LC-001', wpsRoutingCode: 'WPS-123', iban: 'AE070331234567890123456',
  visaUnderCompany: 'BIM Staff', monthlySalary: '15000', totalServedDays: '26',
  normalServedHours: '208', otHours: '16', totalRequiredHours: '208',
  totalServedHrs: '224', totalSiteServedHours: '224', salaryAmount: '15000',
  previousMonthOvertimeAmt: '0', otAmount: '1200', grossAmount: '16200',
  otherPayable: '0', compensationAmount: '0', advanceDeduction: '0',
  pettyCashAmount: '0', otherDeduction: '0', wpsViolation: '0',
  differenceFromCurrentSalary: '0', netPayable: '16200', totalSiteNetPayable: '16200',
  signedTimesheetUploadStatus: 'Uploaded', paymentSource: 'WPS',
}]

const TS_STATUS_COLORS: Record<string, string> = {
  Uploaded: 'bg-emerald-100 text-emerald-700',
  'Not Uploaded': 'bg-slate-100 text-slate-500',
  Pending: 'bg-amber-100 text-amber-700',
  Rejected: 'bg-rose-100 text-rose-700',
}

function fmt(v: number | null | undefined) {
  if (v == null || v === 0) return '—'
  return v.toLocaleString()
}
function fmtAED(v: number | null | undefined) {
  if (v == null || v === 0) return '—'
  return `AED ${v.toLocaleString()}`
}

function useSalaries(filters: { page: number; month?: string; search?: string }) {
  return useQuery({
    queryKey: ['salaries', filters],
    queryFn: async () => {
      const p = new URLSearchParams()
      p.append('page', filters.page.toString())
      p.append('limit', '20')
      if (filters.month) p.append('month', filters.month)
      if (filters.search) p.append('search', filters.search)
      const { data } = await apiClient.get<any>(`/salaries?${p}`)
      return data.data
    },
  })
}

function DeleteConfirm({ label, onConfirm, onCancel, loading }: { label: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white border rounded-2xl p-6 max-w-sm w-full shadow-2xl mx-4">
        <h3 className="font-bold text-lg text-slate-800">Delete Salary Record</h3>
        <p className="text-slate-500 text-sm mt-2">Delete salary for <span className="font-semibold text-slate-700">{label}</span>? This cannot be undone.</p>
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

export default function SalariesPage() {
  const [page, setPage] = useState(1)
  const [importOpen, setImportOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [month, setMonth] = useState('')
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)

  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useSalaries({ page, month, search })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/salaries/${id}`),
    onSuccess: () => { setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ['salaries'] }) },
  })

  const salaries: any[] = data?.data ?? []

  const handleExport = () => {
    const rows = salaries.map((s: any) => ({
      'Employee Code': s.employeeId?.employeeCode ?? '',
      'Employee Name': s.employeeId?.name ?? '',
      'Site Name': s.siteName ?? '',
      'Labour Card No': s.labourCardNo ?? '',
      'WPS Routing Code': s.wpsRoutingCode ?? '',
      'IBAN': s.iban ?? '',
      'Visa Under Company': s.visaUnderCompany ?? '',
      'Monthly Salary': s.monthlySalary ?? '',
      'Month/Year': s.month ?? '',
      'Total Served Days': s.totalServedDays ?? '',
      'Normal Served Hours': s.normalServedHours ?? '',
      'OT Hours': s.otHours ?? '',
      'Total Required Hours': s.totalRequiredHours ?? '',
      'Total Served Hrs.': s.totalServedHrs ?? '',
      'Total Site Served Hours': s.totalSiteServedHours ?? '',
      'Salary Amount': s.salaryAmount ?? '',
      'Prev. Month OT Amt.': s.previousMonthOvertimeAmt ?? '',
      'OT Amount': s.otAmount ?? '',
      'Gross Amount': s.grossAmount ?? '',
      'Other Payable': s.otherPayable ?? '',
      'Compensation Amount': s.compensationAmount ?? '',
      'Advance Deduction': s.advanceDeduction ?? '',
      'Petty Cash Amount': s.pettyCashAmount ?? '',
      'Other Deduction': s.otherDeduction ?? '',
      'WPS Violation': s.wpsViolation ?? '',
      'Diff. From Current Salary': s.differenceFromCurrentSalary ?? '',
      'Net Payable': s.netPayable ?? '',
      'Total Site Net Payable': s.totalSiteNetPayable ?? '',
      'Signed TS Status': s.signedTimesheetUploadStatus ?? '',
      'Payment Source': s.paymentSource ?? '',
    }))
    exportToCSV(rows, 'salaries')
  }

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
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
        entityLabel="Salaries"
        apiEndpoint="/salaries/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      {/* Page header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Salaries & Payroll</h2>
          <p className="text-muted-foreground mt-1">
            {data?.pagination ? `${data.pagination.total} records` : 'WPS salary management'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" className={`gap-2 ${month || search ? 'border-blue-500 text-blue-600' : ''}`} onClick={() => setShowFilters(v => !v)}>
            <Filter className="h-4 w-4" /> Filters
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!salaries.length}>
            <Download className="h-4 w-4" /> Export CSV
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
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Name or code…"
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
          <div className="min-w-[140px]">
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Month / Year</label>
            <input type="month" value={month} onChange={e => { setMonth(e.target.value); setPage(1) }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          {(month || search) && (
            <Button variant="ghost" size="sm" className="gap-1 text-slate-500" onClick={() => { setMonth(''); setSearch(''); setPage(1) }}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      )}

      {/* Table — always renders headers */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                {COL_HEADERS.map((h, i) => (
                  <TableHead key={i} className="whitespace-nowrap text-[11px] font-bold px-3 py-3 border-r border-slate-100 last:border-0">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {COL_HEADERS.map((_, j) => (
                      <TableCell key={j} className="px-3 py-3"><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={COL_HEADERS.length} className="text-center h-24 text-rose-500">
                    Failed to load salaries.
                  </TableCell>
                </TableRow>
              ) : salaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COL_HEADERS.length} className="text-center h-32 text-muted-foreground">
                    No salary records yet. Click <span className="text-blue-600 font-medium">Import CSV</span> to get started.
                  </TableCell>
                </TableRow>
              ) : (
                salaries.map((s: any) => (
                  <TableRow key={s._id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="px-3 py-2 font-mono text-xs text-slate-500 whitespace-nowrap">{s.employeeId?.employeeCode ?? '—'}</TableCell>
                    <TableCell className="px-3 py-2 font-semibold text-sm whitespace-nowrap">{s.employeeId?.name ?? '—'}</TableCell>
                    <TableCell className="px-3 py-2 text-sm whitespace-nowrap">{s.siteName || '—'}</TableCell>
                    <TableCell className="px-3 py-2 font-mono text-xs">{s.labourCardNo || '—'}</TableCell>
                    <TableCell className="px-3 py-2 font-mono text-xs">{s.wpsRoutingCode || '—'}</TableCell>
                    <TableCell className="px-3 py-2 font-mono text-xs whitespace-nowrap">{s.iban || '—'}</TableCell>
                    <TableCell className="px-3 py-2 text-sm whitespace-nowrap">{s.visaUnderCompany || '—'}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right font-semibold whitespace-nowrap">{fmtAED(s.monthlySalary)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm font-medium whitespace-nowrap">{s.month}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right">{fmt(s.totalServedDays)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right">{fmt(s.normalServedHours)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right">{fmt(s.otHours)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right">{fmt(s.totalRequiredHours)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right font-semibold">{fmt(s.totalServedHrs)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right">{fmt(s.totalSiteServedHours)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right font-semibold">{fmtAED(s.salaryAmount)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right">{fmtAED(s.previousMonthOvertimeAmt)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right text-emerald-600">{fmtAED(s.otAmount)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right font-bold">{fmtAED(s.grossAmount)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right">{fmtAED(s.otherPayable)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right">{fmtAED(s.compensationAmount)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right text-rose-600">{fmtAED(s.advanceDeduction)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right text-rose-600">{fmtAED(s.pettyCashAmount)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right text-rose-600">{fmtAED(s.otherDeduction)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right">{fmt(s.wpsViolation)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right">{fmt(s.differenceFromCurrentSalary)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right font-bold text-emerald-600 whitespace-nowrap">{fmtAED(s.netPayable)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right font-semibold whitespace-nowrap">{fmtAED(s.totalSiteNetPayable)}</TableCell>
                    <TableCell className="px-3 py-2">
                      {s.signedTimesheetUploadStatus ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${TS_STATUS_COLORS[s.signedTimesheetUploadStatus] ?? 'bg-slate-100 text-slate-500'}`}>
                          {s.signedTimesheetUploadStatus}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm">{s.paymentSource || '—'}</TableCell>
                    <TableCell className="px-3 py-2">
                      <button
                        onClick={() => setDeleteTarget({ id: s._id, label: `${s.employeeId?.name ?? 'Unknown'} – ${s.month}` })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50">
            <p className="text-sm text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} records
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!data.pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={!data.pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
