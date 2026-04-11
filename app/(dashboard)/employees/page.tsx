'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import {
  Users, Plus, Download, Upload, LayoutGrid, List,
  Mail, Phone, Calendar, Search, X, Trash2, Pencil,
} from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'
import EmployeeFormModal from '@/components/EmployeeFormModal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'

/* ─── Import columns (exact spec order) ─────────────────────────────────── */
const IMPORT_COLUMNS = [
  { key: 'employeeCode',        label: 'Employee Code',            required: true  },
  { key: 'name',                label: 'Employee Name',            required: true  },
  { key: 'position',            label: 'Position',                 required: true  },
  { key: 'discipline',          label: 'Discipline'                                },
  { key: 'employeeType',        label: 'Employee Type'                             },
  { key: 'email',               label: 'Email',                    required: true  },
  { key: 'mobileNo',            label: 'Mobile No.'                                },
  { key: 'gender',              label: 'Gender'                                    },
  { key: 'dob',                 label: 'Date of Birth (YYYY-MM-DD)'                },
  { key: 'contractJoiningDate', label: 'Contract Joining Date (YYYY-MM-DD)'        },
  { key: 'status',              label: 'Status'                                    },
  { key: 'nationality',         label: 'Nationality'                               },
  { key: 'visaCompany',         label: 'Visa Company'                              },
  { key: 'totalSalary',         label: 'Total Salary'                              },
]

const TEMPLATE_ROWS = [{
  employeeCode: 'EMP-JOHN-2026', name: 'John Smith', position: 'Senior Engineer',
  discipline: 'Mechanical', employeeType: 'Permanent', email: 'john@example.com',
  mobileNo: '+971501234567', gender: 'Male', dob: '1990-01-15',
  contractJoiningDate: '2024-03-01', status: 'Active', nationality: 'Indian',
  visaCompany: 'BIM Staff', totalSalary: '18000',
}]

/* ─── Config ─────────────────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  Active:     { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', label: 'Active'     },
  'On Leave': { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',       dot: 'bg-amber-400',   label: 'On Leave'   },
  Terminated: { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',          dot: 'bg-rose-400',    label: 'Terminated' },
  Inactive:   { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',       dot: 'bg-slate-400',   label: 'Inactive'   },
  Probation:  { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',          dot: 'bg-blue-400',    label: 'Probation'  },
  Remote:     { color: 'bg-violet-500/20 text-violet-400 border-violet-500/30',    dot: 'bg-violet-400',  label: 'Remote'     },
}

const AVATAR_COLORS = [
  'from-blue-600 to-blue-800','from-violet-600 to-violet-800',
  'from-emerald-600 to-emerald-800','from-amber-600 to-amber-800',
  'from-rose-600 to-rose-800','from-cyan-600 to-cyan-800',
]

function getAvatarColor(name: string) {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

/* ─── Hooks ─────────────────────────────────────────────────────────────── */
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

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function DeleteConfirm({ name, onConfirm, onCancel, loading }: {
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl mx-4">
        <div className="w-12 h-12 bg-rose-500/15 rounded-xl flex items-center justify-center mb-4 mx-auto">
          <Trash2 className="w-6 h-6 text-rose-400" />
        </div>
        <h3 className="text-white font-bold text-center text-lg">Delete Employee</h3>
        <p className="text-slate-400 text-sm text-center mt-2">
          Delete <span className="text-white font-semibold">{name}</span>? This cannot be undone.
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1 border-slate-600 text-slate-300" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function EmployeeCard({ emp, onEdit, onDelete }: { emp: any; onEdit: () => void; onDelete: () => void }) {
  const statusCfg = STATUS_CONFIG[emp.status] ?? STATUS_CONFIG['Inactive']
  const avatarColor = getAvatarColor(emp.name)
  return (
    <div className="relative bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 hover:border-slate-500/80 transition-all duration-200 group">
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border mb-3 ${statusCfg.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
      </span>
      <Link href={`/employees/${emp._id}`}>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center mb-3 shadow-lg`}>
          <span className="text-white font-bold text-base">{getInitials(emp.name)}</span>
        </div>
        <h3 className="text-white font-bold text-sm hover:text-blue-300 transition-colors truncate">{emp.name}</h3>
      </Link>
      <p className="text-blue-400 text-xs font-medium mt-0.5 truncate">{emp.position ?? '—'}</p>
      <p className="text-slate-500 text-[10px] font-mono mt-1">{emp.employeeCode}</p>
      <div className="h-px bg-slate-700/60 my-3" />
      <div className="space-y-1.5 text-xs text-slate-400">
        {emp.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3 text-slate-500" /><span className="truncate">{emp.email}</span></div>}
        {(emp.mobileNo || emp.phone) && <div className="flex items-center gap-2"><Phone className="w-3 h-3 text-slate-500" /><span>{emp.mobileNo || emp.phone}</span></div>}
        {emp.contractJoiningDate && <div className="flex items-center gap-2"><Calendar className="w-3 h-3 text-slate-500" /><span>Joined {format(new Date(emp.contractJoiningDate), 'MMM yyyy')}</span></div>}
      </div>
      <div className="flex justify-between mt-3 pt-3 border-t border-slate-700/60 text-xs">
        <div>
          <p className="text-slate-500 text-[10px]">Total Salary</p>
          <p className="font-bold text-slate-200">AED {(emp.totalSalary || emp.baseSalary)?.toLocaleString() ?? '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-slate-500 text-[10px]">Nationality</p>
          <p className="text-slate-300">{emp.nationality || '—'}</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Table column headers (exact spec order) ────────────────────────────── */
const COL_HEADERS = [
  'S No.','Employee Code','Employee Name','Position','Discipline','Employee Type',
  'Email','Mobile No.','Gender','Date of Birth','Contract Joining Date',
  'Status','Nationality','Visa Company','Total Salary','Actions',
]

/* ─── Main page ─────────────────────────────────────────────────────────── */
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
  const { data, isLoading, refetch } = useEmployees({ page, search, status })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/employees/${id}`),
    onSuccess: () => { setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ['employees'] }) },
  })

  const handleExport = () => {
    const rows = (data?.data ?? []).map((emp: any, idx: number) => ({
      'S No.': (page - 1) * 24 + idx + 1,
      'Employee Code': emp.employeeCode ?? '',
      'Employee Name': emp.name,
      'Position': emp.position ?? '',
      'Discipline': emp.discipline ?? '',
      'Employee Type': emp.employeeType ?? '',
      'Email': emp.email ?? '',
      'Mobile No.': emp.mobileNo || emp.phone || '',
      'Gender': emp.gender ?? '',
      'Date of Birth': emp.dob ? new Date(emp.dob).toISOString().split('T')[0] : '',
      'Contract Joining Date': emp.contractJoiningDate ? new Date(emp.contractJoiningDate).toISOString().split('T')[0] : '',
      'Status': emp.status ?? '',
      'Nationality': emp.nationality ?? '',
      'Visa Company': emp.visaCompany ?? '',
      'Total Salary': emp.totalSalary ?? emp.baseSalary ?? '',
    }))
    exportToCSV(rows, 'employees')
  }

  const employees: any[] = data?.data ?? []
  const statusCounts = employees.reduce((acc: Record<string, number>, emp: any) => {
    acc[emp.status] = (acc[emp.status] ?? 0) + 1; return acc
  }, {})

  return (
    <div className="min-h-screen bg-slate-900 -m-6 p-6">
      {/* Modals */}
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
      <div className="mb-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Employee Directory</h1>
            <p className="text-slate-400 text-sm mt-1">
              {data?.pagination ? `${data.pagination.total} employees` : 'Workforce management'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700 gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700 gap-2" onClick={handleExport} disabled={!employees.length}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-900/40" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Employee
            </Button>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = statusCounts[key] ?? 0
            const active = status === key
            return (
              <button key={key} onClick={() => { setStatus(active ? '' : key); setPage(1) }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  active ? `${cfg.color} shadow-sm` : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${active ? cfg.dot : 'bg-slate-500'}`} />
                {cfg.label}{count > 0 && <span className="ml-0.5 opacity-70">{count}</span>}
              </button>
            )
          })}
          {status && (
            <button onClick={() => { setStatus(''); setPage(1) }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Search + view toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search employees…"
              className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30" />
            {search && <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <div className="flex bg-slate-800/80 border border-slate-700/60 rounded-xl p-1 gap-1">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5 animate-pulse h-52" />
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-300 font-semibold">No employees found</p>
            <p className="text-slate-500 text-sm mt-1">{search || status ? 'Try adjusting your filters.' : 'Click Add Employee or Import CSV to get started.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {employees.map((emp: any) => (
              <EmployeeCard key={emp._id} emp={emp}
                onEdit={() => setEditEmp(emp)}
                onDelete={() => setDeleteTarget({ id: emp._id, name: emp.name })} />
            ))}
          </div>
        )
      ) : (
        /* ── LIST VIEW — always renders table with headers ── */
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/60 hover:bg-transparent">
                  {COL_HEADERS.map(h => (
                    <TableHead key={h}
                      className="text-[10px] font-bold text-amber-300 uppercase tracking-wider bg-slate-800 whitespace-nowrap text-center py-3 px-3 border-r border-slate-700/40 last:border-0 sticky top-0">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COL_HEADERS.length} className="text-center h-32 text-slate-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      No employees yet. Click <span className="text-blue-400 font-medium">Add Employee</span> or <span className="text-blue-400 font-medium">Import</span> to begin.
                    </TableCell>
                  </TableRow>
                ) : employees.map((emp: any, idx: number) => {
                  const sNo = (page - 1) * 24 + idx + 1
                  const statusCfg = STATUS_CONFIG[emp.status] ?? STATUS_CONFIG['Inactive']
                  return (
                    <TableRow key={emp._id} className="border-slate-700/40 hover:bg-slate-700/30 transition-colors group">
                      <TableCell className="text-center text-slate-500 text-xs font-mono px-3 py-2.5">{sNo}</TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Link href={`/employees/${emp._id}`} className="font-mono text-xs text-blue-400 hover:underline font-semibold">
                          {emp.employeeCode}
                        </Link>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 whitespace-nowrap">
                        <Link href={`/employees/${emp._id}`} className="text-white font-semibold text-sm hover:text-blue-300 transition-colors">
                          {emp.name}
                        </Link>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-slate-300 text-sm whitespace-nowrap">{emp.position || '—'}</TableCell>
                      <TableCell className="px-3 py-2.5 text-slate-300 text-sm whitespace-nowrap">{emp.discipline || '—'}</TableCell>
                      <TableCell className="px-3 py-2.5 text-center">
                        {emp.employeeType ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700 text-slate-300">{emp.employeeType}</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-slate-300 text-xs">{emp.email || '—'}</TableCell>
                      <TableCell className="px-3 py-2.5 text-slate-300 text-sm whitespace-nowrap">{emp.mobileNo || emp.phone || '—'}</TableCell>
                      <TableCell className="px-3 py-2.5 text-center text-sm text-slate-300">{emp.gender || '—'}</TableCell>
                      <TableCell className="px-3 py-2.5 text-center text-sm text-slate-300 whitespace-nowrap">
                        {emp.dob ? format(new Date(emp.dob), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-center text-sm text-slate-300 whitespace-nowrap">
                        {emp.contractJoiningDate ? format(new Date(emp.contractJoiningDate), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.color}`}>
                          <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-center text-sm text-slate-300 whitespace-nowrap">{emp.nationality || '—'}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-slate-300 whitespace-nowrap">{emp.visaCompany || '—'}</TableCell>
                      <TableCell className="px-3 py-2.5 text-right text-sm font-semibold text-slate-200 whitespace-nowrap">
                        {(emp.totalSalary || emp.baseSalary) ? `AED ${(emp.totalSalary || emp.baseSalary).toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditEmp(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget({ id: emp._id, name: emp.name })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
            <Button variant="outline" size="sm" disabled={!data.pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}
              className="border-slate-700 text-slate-300 hover:bg-slate-700">Previous</Button>
            <Button variant="outline" size="sm" disabled={!data.pagination.hasNextPage} onClick={() => setPage(p => p + 1)}
              className="border-slate-700 text-slate-300 hover:bg-slate-700">Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
