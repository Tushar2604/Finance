'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Users, Plus, Download, Upload, LayoutGrid, List, Mail, Phone, Calendar, Search, X, Trash2, Pencil } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'
import EmployeeFormModal from '@/components/EmployeeFormModal'
import { format } from 'date-fns'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { EMPLOYEE_COLUMNS } from '@/constants/tableColumns'
import { ERPTableHeader } from '@/components/shared/ERPTableHeader'
import { cn } from '@/lib/utils'

const IMPORT_COLUMNS = [
  { key: 'employeeCode', label: 'Employee Code', required: true },
  { key: 'name', label: 'Employee Name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'position', label: 'Position', required: true },
  { key: 'clientCode', label: 'Clients Code (Worked with)' },
  { key: 'clientName', label: 'Clients Name (Worked with)' },
  { key: 'currentMonthlySalary', label: 'Current Monthly Salary' },
  { key: 'monthlySalaryContracted', label: 'Monthly Salary (as per LC)' },
  { key: 'basicSalaryContracted', label: 'Basic Salary (as per LC)' },
  { key: 'noticePeriod', label: 'Notice Period (as per LC)' },
  { key: 'probationPeriod', label: 'Probation Period (as per LC)' },
  { key: 'nationality', label: 'Nationality' },
]

const TEMPLATE_ROWS = [
  {
    employeeCode: 'EMP-001',
    name: 'John Smith',
    email: 'john@bimstaff.ae',
    position: 'Senior Engineer',
    clientCode: 'CLI-001',
    clientName: 'Acme Corp',
    currentMonthlySalary: '18000',
    monthlySalaryContracted: '17000',
    basicSalaryContracted: '12000',
    noticePeriod: '30',
    probationPeriod: '90',
    nationality: 'Indian',
  },
]

const STATUS_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  'Active':      { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Active' },
  'On Leave':    { color: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   label: 'On Leave' },
  'Terminated':  { color: 'bg-rose-100 text-rose-700 border-rose-200',          dot: 'bg-rose-500',    label: 'Terminated' },
  'Inactive':    { color: 'bg-slate-100 text-slate-700 border-slate-200',       dot: 'bg-slate-500',   label: 'Inactive' },
  'Probation':   { color: 'bg-blue-100 text-blue-700 border-blue-200',          dot: 'bg-blue-500',    label: 'Probation' },
  'Remote':      { color: 'bg-violet-100 text-violet-700 border-violet-200',    dot: 'bg-violet-500',  label: 'Remote' },
}

const AVATAR_COLORS = [
  'from-blue-100 to-blue-200 text-blue-700',
  'from-violet-100 to-violet-200 text-violet-700',
  'from-emerald-100 to-emerald-200 text-emerald-700',
  'from-amber-100 to-amber-200 text-amber-700',
  'from-rose-100 to-rose-200 text-rose-700',
  'from-cyan-100 to-cyan-200 text-cyan-700',
  'from-indigo-100 to-indigo-200 text-indigo-700',
  'from-pink-100 to-pink-200 text-pink-700',
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function useEmployees(filters: { page: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ['employees', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', filters.page.toString())
      params.append('limit', '24')
      if (filters.search) params.append('search', filters.search)
      if (filters.status) params.append('status', filters.status)
      const { data } = await apiClient.get<any>(`/employees?${params}`)
      return data.data
    },
  })
}

function EmployeeCard({ emp }: { emp: any }) {
  const statusCfg = STATUS_CONFIG[emp.status] ?? STATUS_CONFIG['Inactive']
  const avatarColor = getAvatarColor(emp.name)
  const initials = getInitials(emp.name)

  return (
    <Link href={`/employees/${emp._id}`} className="block group">
      <div className="relative bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        {/* Status badge top-right */}
        <div className="absolute top-4 right-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
        </div>

        {/* Avatar */}
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center mb-4`}>
          <span className="font-bold text-lg tracking-wide">{initials}</span>
        </div>

        {/* Name & Position */}
        <h3 className="text-slate-900 font-bold text-base leading-tight group-hover:text-blue-600 transition-colors truncate pr-16">
          {emp.name}
        </h3>
        <p className="text-blue-600 text-xs font-medium mt-0.5 truncate">{emp.position ?? 'No Position'}</p>

        {/* Code */}
        <p className="text-slate-500 text-[10px] font-mono mt-1">{emp.employeeCode}</p>

        {/* Divider */}
        <div className="h-px bg-slate-100 my-3" />

        {/* Meta */}
        <div className="space-y-1.5">
          {emp.email && (
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{emp.email}</span>
            </div>
          )}
          {emp.phone && (
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span>{emp.phone}</span>
            </div>
          )}
          {emp.joiningDate && (
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span>Joined {format(new Date(emp.joiningDate), 'MMM yyyy')}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <div>
            <p className="text-[10px] text-slate-500">Base Salary</p>
            <p className="text-sm font-bold text-slate-800">AED {emp.baseSalary?.toLocaleString() ?? '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500">Client</p>
            <p className="text-xs text-slate-700 font-medium">{(emp.assignedClientId as any)?.name ?? 'Internal'}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

function EmployeeCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
      <div className="w-14 h-14 rounded-2xl bg-slate-200 mb-4" />
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-1/2 mb-1" />
      <div className="h-px bg-slate-100 my-3" />
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 rounded w-full" />
        <div className="h-3 bg-slate-200 rounded w-2/3" />
      </div>
    </div>
  )
}

function DeleteConfirm({ name, onConfirm, onCancel, loading }: { name: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl mx-4">
        <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
          <Trash2 className="w-6 h-6 text-rose-600" />
        </div>
        <h3 className="text-slate-900 font-bold text-center text-lg">Delete Employee</h3>
        <p className="text-slate-500 text-sm text-center mt-2">
          Are you sure you want to delete <span className="text-slate-800 font-semibold">{name}</span>? This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function EmployeesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editEmp, setEditEmp] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useEmployees({ page, search, status })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/employees/${id}`),
    onSuccess: () => {
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })

  const handleExport = () => {
    const rows = (data?.data ?? []).map((emp: any, idx: number) => ({
      'S No.': (page - 1) * 24 + idx + 1,
      'Employee Code': emp.employeeCode ?? '',
      'Employee Name': emp.name,
      'Position': emp.position ?? '',
      'Clients Code (Worked with)': (emp.clientsWorkedWith ?? []).map((c: any) => c.clientCode).filter(Boolean).join(', ') || '',
      'Clients Name (Worked with)': (emp.clientsWorkedWith ?? []).map((c: any) => c.clientName).filter(Boolean).join(', ') || (emp.assignedClientId as any)?.name || '',
      'Current Monthly Salary': emp.currentMonthlySalary ?? '',
      'Monthly Salary (as per LC)': emp.monthlySalaryContracted ?? '',
      'Basic Salary (as per LC)': emp.basicSalaryContracted ?? '',
      'Notice Period (as per LC)': emp.noticePeriod ?? '',
      'Probation Period (as per LC)': emp.probationPeriod ?? '',
      'Nationality': emp.nationality ?? '',
    }))
    exportToCSV(rows, 'employees')
  }

  const mappedData = useMemo(() => {
    return (data?.data ?? []).map((emp: any) => ({
      ...emp,
      employeeCode: emp.employeeCode ?? '—',
      employeeName: emp.name ?? '—',
      position: emp.position ?? '—',
      discipline: emp.discipline ?? '—',
      employeeType: emp.employeeType ?? '—',
      email: emp.email ?? '—',
      mobileNo: emp.phone ?? '—',
      gender: emp.gender ?? '—',
      dob: emp.dob ? format(new Date(emp.dob), 'dd MMM yyyy') : '—',
      joiningDate: emp.joiningDate ? format(new Date(emp.joiningDate), 'dd MMM yyyy') : '—',
      status: emp.status ?? '—',
      nationality: emp.nationality ?? '—',
      visaCompany: emp.visaCompany ?? '—',
      totalSalary: emp.currentMonthlySalary ?? 0,
    }))
  }, [data?.data])

  const tableColumns = useMemo(() => [
    ...EMPLOYEE_COLUMNS,
    {
      id: 'actions',
      header: '',
      cell: ({ row }: any) => {
        const emp = row.original
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <button
              onClick={() => setEditEmp(emp)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
               onClick={() => setDeleteTarget({ id: emp._id, name: emp.name })}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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

  const statusCounts = (data?.data ?? []).reduce((acc: Record<string, number>, emp: any) => {
    acc[emp.status] = (acc[emp.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
        />
      )}
      {(addOpen || editEmp) && (
        <EmployeeFormModal
          employee={editEmp ?? undefined}
          onClose={() => { setAddOpen(false); setEditEmp(null) }}
          onSuccess={() => { setAddOpen(false); setEditEmp(null); refetch() }}
        />
      )}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="Employees"
        apiEndpoint="/employees/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Employee Directory</h1>
            <p className="text-slate-500 text-sm mt-1">
              {data?.pagination ? `${data.pagination.total} employees across all projects` : 'Manage your workforce'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExport}
              disabled={!data?.data?.length}
            >
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" /> Add Employee
            </Button>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = statusCounts[key] ?? 0
            const active = status === key
            return (
              <button
                key={key}
                onClick={() => { setStatus(active ? '' : key); setPage(1) }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  active
                    ? `${cfg.color} shadow-sm`
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? cfg.dot : 'bg-slate-300'}`} />
                {cfg.label}
                {count > 0 && <span className="ml-0.5 opacity-70">{count}</span>}
              </button>
            )
          })}
          {status && (
            <button
              onClick={() => { setStatus(''); setPage(1) }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Search + View toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search employees…"
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <EmployeeCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-rose-500" />
            </div>
            <p className="text-slate-800 font-semibold">Failed to load employees</p>
            <p className="text-slate-500 text-sm mt-1">Ensure MongoDB is running and seeded.</p>
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-800 font-semibold">No employees found</p>
            <p className="text-slate-500 text-sm mt-1">
              {search || status ? 'Try adjusting your filters.' : 'Run npm run seed to add sample data.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data?.data?.map((emp: any) => <EmployeeCard key={emp._id} emp={emp} />)}
          </div>
        )
      ) : (
        /* List view — utilizing ERPTableHeader */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-max">
              <ERPTableHeader table={table} isLoading={isLoading} />
              {!isLoading && (
                <tbody className="bg-white">
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={tableColumns.length} className="text-center h-32 text-slate-500 py-10">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No employees found.
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
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">
            Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} employees
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data.pagination.hasPrevPage}
              onClick={() => setPage(p => p - 1)}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.pagination.hasNextPage}
              onClick={() => setPage(p => p + 1)}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
