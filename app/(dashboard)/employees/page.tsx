'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Users, Plus, Download, Upload, LayoutGrid, List, Mail, Phone, Calendar, Search, X } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'
import EmployeeFormModal from '@/components/EmployeeFormModal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'

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
  'Active':      { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', label: 'Active' },
  'On Leave':    { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',       dot: 'bg-amber-400',   label: 'On Leave' },
  'Terminated':  { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',          dot: 'bg-rose-400',    label: 'Terminated' },
  'Inactive':    { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',       dot: 'bg-slate-400',   label: 'Inactive' },
  'Probation':   { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',          dot: 'bg-blue-400',    label: 'Probation' },
  'Remote':      { color: 'bg-violet-500/20 text-violet-400 border-violet-500/30',    dot: 'bg-violet-400',  label: 'Remote' },
}

const AVATAR_COLORS = [
  'from-blue-600 to-blue-800',
  'from-violet-600 to-violet-800',
  'from-emerald-600 to-emerald-800',
  'from-amber-600 to-amber-800',
  'from-rose-600 to-rose-800',
  'from-cyan-600 to-cyan-800',
  'from-indigo-600 to-indigo-800',
  'from-pink-600 to-pink-800',
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
      <div className="relative bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 hover:border-slate-500/80 hover:bg-slate-800 transition-all duration-200 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5">
        {/* Status badge top-right */}
        <div className="absolute top-4 right-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
        </div>

        {/* Avatar */}
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center mb-4 shadow-lg`}>
          <span className="text-white font-bold text-lg tracking-wide">{initials}</span>
        </div>

        {/* Name & Position */}
        <h3 className="text-white font-bold text-base leading-tight group-hover:text-blue-300 transition-colors truncate pr-16">
          {emp.name}
        </h3>
        <p className="text-blue-400 text-xs font-medium mt-0.5 truncate">{emp.position ?? 'No Position'}</p>

        {/* Code */}
        <p className="text-slate-500 text-[10px] font-mono mt-1">{emp.employeeCode}</p>

        {/* Divider */}
        <div className="h-px bg-slate-700/60 my-3" />

        {/* Meta */}
        <div className="space-y-1.5">
          {emp.email && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Mail className="w-3.5 h-3.5 shrink-0 text-slate-500" />
              <span className="truncate">{emp.email}</span>
            </div>
          )}
          {emp.phone && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Phone className="w-3.5 h-3.5 shrink-0 text-slate-500" />
              <span>{emp.phone}</span>
            </div>
          )}
          {emp.joiningDate && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-500" />
              <span>Joined {format(new Date(emp.joiningDate), 'MMM yyyy')}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/60">
          <div>
            <p className="text-[10px] text-slate-500">Base Salary</p>
            <p className="text-sm font-bold text-slate-200">AED {emp.baseSalary?.toLocaleString() ?? '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500">Client</p>
            <p className="text-xs text-slate-300 font-medium">{(emp.assignedClientId as any)?.name ?? 'Internal'}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

function EmployeeCardSkeleton() {
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5 animate-pulse">
      <div className="w-14 h-14 rounded-2xl bg-slate-700 mb-4" />
      <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
      <div className="h-3 bg-slate-700 rounded w-1/2 mb-1" />
      <div className="h-px bg-slate-700 my-3" />
      <div className="space-y-2">
        <div className="h-3 bg-slate-700 rounded w-full" />
        <div className="h-3 bg-slate-700 rounded w-2/3" />
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const { data, isLoading, error, refetch } = useEmployees({ page, search, status })

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

  const statusCounts = (data?.data ?? []).reduce((acc: Record<string, number>, emp: any) => {
    acc[emp.status] = (acc[emp.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-slate-900 -m-6 p-6">
      {addOpen && (
        <EmployeeFormModal
          onClose={() => setAddOpen(false)}
          onSuccess={() => { setAddOpen(false); refetch() }}
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
      <div className="mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Employee Directory</h1>
            <p className="text-slate-400 text-sm mt-1">
              {data?.pagination ? `${data.pagination.total} employees across all projects` : 'Manage your workforce'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700 gap-2"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700 gap-2"
              onClick={handleExport}
              disabled={!data?.data?.length}
            >
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-900/40"
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
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? cfg.dot : 'bg-slate-500'}`} />
                {cfg.label}
                {count > 0 && <span className="ml-0.5 opacity-70">{count}</span>}
              </button>
            )
          })}
          {status && (
            <button
              onClick={() => { setStatus(''); setPage(1) }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Search + View toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search employees…"
              className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex bg-slate-800/80 border border-slate-700/60 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <EmployeeCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-rose-900/30 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-rose-500" />
          </div>
          <p className="text-rose-400 font-semibold">Failed to load employees</p>
          <p className="text-slate-500 text-sm mt-1">Ensure MongoDB is running and seeded.</p>
        </div>
      ) : data?.data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-slate-300 font-semibold">No employees found</p>
          <p className="text-slate-500 text-sm mt-1">
            {search || status ? 'Try adjusting your filters.' : 'Run npm run seed to add sample data.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.data?.map((emp: any) => <EmployeeCard key={emp._id} emp={emp} />)}
        </div>
      ) : (
        /* List view — exact columns from spec */
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/60 hover:bg-transparent">
                  {[
                    'S No.', 'Employee Code', 'Employee Name', 'Position',
                    'Clients Code\n(Worked with)', 'Clients Name\n(Worked with)',
                    'Current Monthly\nSalary', 'Monthly Salary\n(as per LC)',
                    'Basic Salary\n(as per LC)', 'Notice Period\n(as per LC)',
                    'Probation Period\n(as per LC)', 'Nationality',
                  ].map(h => (
                    <TableHead
                      key={h}
                      className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-800/80 whitespace-pre-line text-center py-3 px-3 border-r border-slate-700/40 last:border-0"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center h-32 text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : data?.data?.map((emp: any, idx: number) => {
                  const clientCodes = (emp.clientsWorkedWith ?? []).map((c: any) => c.clientCode).filter(Boolean).join(', ')
                  const clientNames = (emp.clientsWorkedWith ?? []).map((c: any) => c.clientName).filter(Boolean).join(', ')
                    || (emp.assignedClientId as any)?.name || ''
                  const sNo = (page - 1) * 24 + idx + 1
                  return (
                    <TableRow
                      key={emp._id}
                      className="border-slate-700/40 hover:bg-slate-700/30 transition-colors group"
                    >
                      <TableCell className="text-center text-slate-400 text-xs font-mono px-3 py-3">{sNo}</TableCell>
                      <TableCell className="px-3 py-3">
                        <Link href={`/employees/${emp._id}`} className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline font-semibold">
                          {emp.employeeCode}
                        </Link>
                      </TableCell>
                      <TableCell className="px-3 py-3 whitespace-nowrap">
                        <Link href={`/employees/${emp._id}`} className="text-white font-semibold text-sm group-hover:text-blue-300 transition-colors">
                          {emp.name}
                        </Link>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-slate-300 text-sm whitespace-nowrap">{emp.position ?? '—'}</TableCell>
                      <TableCell className="px-3 py-3 text-center">
                        <span className="font-mono text-xs text-slate-400">{clientCodes || '—'}</span>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-slate-300 text-sm whitespace-nowrap">{clientNames || '—'}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm font-semibold text-slate-200 whitespace-nowrap">
                        {emp.currentMonthlySalary ? `AED ${emp.currentMonthlySalary.toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm text-slate-300 whitespace-nowrap">
                        {emp.monthlySalaryContracted ? `AED ${emp.monthlySalaryContracted.toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm text-slate-300 whitespace-nowrap">
                        {emp.basicSalaryContracted ? `AED ${emp.basicSalaryContracted.toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center text-sm text-slate-300">
                        {emp.noticePeriod != null ? `${emp.noticePeriod} days` : '—'}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center text-sm text-slate-300">
                        {emp.probationPeriod != null ? `${emp.probationPeriod} days` : '—'}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center text-sm text-slate-300">
                        {emp.nationality || '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-500">
            Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} employees
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data.pagination.hasPrevPage}
              onClick={() => setPage(p => p - 1)}
              className="border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.pagination.hasNextPage}
              onClick={() => setPage(p => p + 1)}
              className="border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
