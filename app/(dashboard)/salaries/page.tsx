'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useSalaries } from '@/lib/hooks/useSalaries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Upload, Trash2, Pencil, Plus } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { SALARY_COLUMNS } from '@/constants/tableColumns'
import { ERPTableHeader } from '@/components/shared/ERPTableHeader'
import { cn } from '@/lib/utils'
import SalaryFormModal from '@/components/SalaryFormModal'

const IMPORT_COLUMNS = [
  { key: 'email', label: 'Employee Email', required: true },
  { key: 'month', label: 'Month (YYYY-MM)', required: true },
  { key: 'baseSalary', label: 'Base Salary', required: true },
  { key: 'overtime', label: 'Overtime' },
  { key: 'deductions', label: 'Deductions' },
  { key: 'netSalary', label: 'Net Salary' },
  { key: 'paymentStatus', label: 'Payment Status' },
  { key: 'paymentMode', label: 'Payment Mode' },
  { key: 'paymentDate', label: 'Payment Date' },
  { key: 'bankReference', label: 'Bank Reference' },
]

const TEMPLATE_ROWS = [
  { email: 'emp1@bimstaff.ae', month: '2024-11', baseSalary: '15000', overtime: '500', deductions: '0', netSalary: '15500', paymentStatus: 'Paid', paymentMode: 'WPS', paymentDate: '2024-11-28', bankReference: 'SAL-2024-11-BIM-EMP-00001' },
]

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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const qc = useQueryClient()
  const { data, isLoading, error, refetch } = useSalaries({ page, limit: 10 })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/salaries/${id}`),
    onSuccess: () => { setDeleteTarget(null); qc.invalidateQueries({ queryKey: ['salaries'] }) },
  })

  const handleExport = () => {
    const rows = (data?.data ?? []).map((s: any) => ({
      email: s.employeeId?.email ?? '',
      month: s.month,
      baseSalary: s.baseSalary,
      overtime: s.overtime ?? 0,
      deductions: s.deductions ?? 0,
      netSalary: s.netSalary,
      paymentStatus: s.paymentStatus,
      paymentMode: s.paymentMode,
      paymentDate: s.paymentDate ? new Date(s.paymentDate).toISOString().split('T')[0] : '',
      bankReference: s.bankReference ?? '',
    }))
    exportToCSV(rows, 'salaries')
  }

  const mappedData = useMemo(() => {
    return (data?.data ?? []).map((salary: any) => ({
      ...salary,
      employeeCode: salary.employeeId?.employeeCode ?? '—',
      employeeName: salary.employeeId?.name ?? '—',
      siteName: salary.siteName ?? '—',
      labourCardNo: salary.labourCardNo ?? '—',
      wpsRoutingCode: salary.wpsRoutingCode ?? '—',
      iban: salary.iban ?? '—',
      visaCompany: salary.visaCompany ?? '—',
      monthlySalary: salary.baseSalary ?? 0,
      monthYear: salary.month ?? '—',
      servedDays: salary.servedDays ?? 0,
      normalHrs: salary.normalHrs ?? 0,
      otHrs: salary.otHrs ?? 0,
      requiredHrs: salary.requiredHrs ?? 0,
      servedHrs: salary.servedHrs ?? 0,
      siteServedHrs: salary.siteServedHrs ?? 0,
      salaryAmount: salary.baseSalary ?? 0,
      otAmount: salary.overtime ?? 0,
      grossAmount: salary.grossAmount ?? 0,
      deductions: salary.deductions ?? 0,
      netSalary: salary.netSalary ?? 0,
    }))
  }, [data?.data])

  const tableColumns = useMemo(() => [
    ...SALARY_COLUMNS,
    {
      id: 'actions',
      header: '',
      cell: ({ row }: any) => {
        const salary = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => { setEditTarget(salary); setFormOpen(true) }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeleteTarget({ id: salary._id, label: `${salary.employeeId?.name ?? 'Unknown'} – ${salary.month}` })}
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
    <div className="space-y-6 animate-in fade-in pb-10">
      {formOpen && (
        <SalaryFormModal
          salary={editTarget}
          onClose={() => { setFormOpen(false); setEditTarget(null) }}
          onSuccess={() => { setFormOpen(false); setEditTarget(null); qc.invalidateQueries({ queryKey: ['salaries'] }) }}
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
        entityLabel="Salaries"
        apiEndpoint="/salaries/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Salaries & Payroll</h2>
          <p className="text-muted-foreground mt-1">Manage employee salaries and WPS transfers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!data?.data?.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2" onClick={() => { setEditTarget(null); setFormOpen(true) }}>
            <Plus className="h-4 w-4" /> Add Salary
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-0 border-t-4 border-t-primary overflow-hidden">
        <CardHeader>
          <CardTitle>Salary Records</CardTitle>
          <CardDescription>All generated salary records based on timesheets.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-4 text-red-500">Failed to load salaries</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm min-w-max">
                <ERPTableHeader table={table} isLoading={isLoading} />
                {!isLoading && (
                  <tbody className="bg-white">
                    {table.getRowModel().rows.length === 0 ? (
                      <tr>
                        <td colSpan={tableColumns.length} className="text-center h-24 text-muted-foreground py-10">
                          {isLoading ? 'Loading...' : 'No salaries found.'}
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
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
            <div className="flex items-center justify-between p-4 border-t border-slate-100">
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
