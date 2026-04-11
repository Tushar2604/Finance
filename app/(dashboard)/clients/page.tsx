'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import {
  Building2, Download, Upload, Plus,
  TrendingUp, AlertTriangle,
  Search, X, LayoutGrid, List,
  Globe, Phone, Mail, DollarSign,
  Trash2, Pencil
} from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'
import ClientFormModal from '@/components/clients/ClientFormModal'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { CLIENT_COLUMNS } from '@/constants/tableColumns'
import { ERPTableHeader } from '@/components/shared/ERPTableHeader'
import { cn } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'

function DeleteConfirm({ name, onConfirm, onCancel, loading }: { name: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white border rounded-2xl p-6 max-w-sm w-full shadow-2xl mx-4">
        <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
          <Trash2 className="w-6 h-6 text-rose-600" />
        </div>
        <h3 className="text-slate-900 font-bold text-center text-lg">Delete Client</h3>
        <p className="text-slate-500 text-sm text-center mt-2">
          Are you sure you want to delete <span className="text-slate-800 font-semibold">{name}</span>? This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
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

const IMPORT_COLUMNS = [
  { key: 'name',                    label: 'Client Name',                              required: true },
  { key: 'website',                 label: 'Website' },
  { key: 'industry',                label: 'Industry' },
  { key: 'email',                   label: 'Email' },
  { key: 'phone',                   label: 'Phone' },
  { key: 'address',                 label: 'Address' },
  { key: 'taxNumber',               label: 'Tax Number' },
  { key: 'serviceType',             label: 'Service (Agreement/LPO)' },
  { key: 'signedAgreement',         label: 'Signed Agreement (Yes/No)' },
  { key: 'agreementNo',             label: 'Agreement No.' },
  { key: 'requiredWeeklyHoursDeal', label: 'Required Weekly Hours Deal' },
  { key: 'validLPO',                label: 'Valid LPO (Yes/No)' },
  { key: 'contractDuration',        label: 'Contract Duration' },
  { key: 'discipline',              label: 'Discipline' },
  { key: 'lpoNo',                   label: 'LPO No.' },
  { key: 'monthlyDealAmount',       label: 'Monthly Deal Amount' },
  { key: 'workStation',             label: 'Work Station' },
  { key: 'otHourlyDealAmount',      label: 'OT Hourly Deal Amount' },
  { key: 'invoiceType',             label: 'Invoice (Hourly/Daily)' },
  { key: 'requiredWeeklyHoursSite', label: 'Required Weekly Hours (Site)' },
  { key: 'lpoDate',                 label: 'LPO Date (YYYY-MM-DD)' },
  { key: 'lpoValidity',             label: 'LPO Validity (YYYY-MM-DD)' },
  { key: 'remarks',                 label: 'Remarks' },
]

const TEMPLATE_ROWS = [
  {
    name: 'Acme Corp', website: 'https://acme.com', industry: 'Construction',
    email: 'finance@acme.com', phone: '+971501234567', address: 'Dubai, UAE',
    taxNumber: 'TRN100200300400', serviceType: 'LPO', signedAgreement: 'Yes',
    agreementNo: 'AGR-001', requiredWeeklyHoursDeal: '48', validLPO: 'Yes',
    contractDuration: '12 months', discipline: 'Mechanical', lpoNo: 'LPO-2024-001',
    monthlyDealAmount: '150000', workStation: 'Site A', otHourlyDealAmount: '75',
    invoiceType: 'Hourly', requiredWeeklyHoursSite: '48',
    lpoDate: '2024-01-01', lpoValidity: '2024-12-31', remarks: '',
  },
]


const CLIENT_AVATAR_COLORS = [
  'from-blue-100 to-blue-200 text-blue-700',
  'from-violet-100 to-violet-200 text-violet-700',
  'from-emerald-100 to-emerald-200 text-emerald-700',
  'from-amber-100 to-amber-200 text-amber-700',
  'from-rose-100 to-rose-200 text-rose-700',
  'from-cyan-100 to-cyan-200 text-cyan-700',
]

function getClientColor(name: string) {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return CLIENT_AVATAR_COLORS[Math.abs(h) % CLIENT_AVATAR_COLORS.length]
}
function getInitials(name: string) { return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() }

function useClients(filters: { page: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', filters.page.toString())
      params.append('limit', '20')
      if (filters.search) params.append('search', filters.search)
      if (filters.status) params.append('isActive', filters.status)
      const { data } = await apiClient.get<any>(`/clients?${params}`)
      return data.data
    },
  })
}

function useClientStats() {
  return useQuery({
    queryKey: ['client-stats'],
    queryFn: async () => {
      // Pull quick counts from dashboard
      const { data } = await apiClient.get<any>('/dashboard')
      return data.data
    },
    staleTime: 60_000,
  })
}

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{label}</p>
          <p className="text-slate-900 text-2xl font-bold mt-1 tracking-tight">{value}</p>
          {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5 text-current" />
        </div>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { data, isLoading, refetch } = useClients({ page, search, status })
  const { data: stats } = useClientStats()
  const router = useRouter()
  const qc = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/clients/${id}`),
    onSuccess: () => {
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['client-stats'] })
    }
  })

  const handleExport = () => {
    const rows = (data?.data ?? []).map((c: any) => ({
      'Client Code': c.clientCode ?? '',
      'Client Name': c.name ?? '',
      'Website': c.website ?? '',
      'Industry': c.industry ?? '',
      'Email': c.companyDetails?.email ?? '',
      'Phone': c.companyDetails?.phone ?? '',
      'Address': c.companyDetails?.address ?? '',
      'Tax Number': c.companyDetails?.taxNumber ?? '',
      'Service (Agreement/LPO)': c.serviceType ?? '',
      'Signed Agreement': c.signedAgreement ? 'Yes' : 'No',
      'Agreement No.': c.agreementNo ?? '',
      'Weekly Hours Deal': c.requiredWeeklyHoursDeal ?? '',
      'Valid LPO': c.validLPO ? 'Yes' : 'No',
      'Contract Duration': c.contractDuration ?? '',
      'Discipline': c.discipline ?? '',
      'LPO No.': c.lpoNo ?? '',
      'Monthly Deal Amount': c.monthlyDealAmount ?? '',
      'Work Station': c.workStation ?? '',
      'OT Hourly Deal Amount': c.otHourlyDealAmount ?? '',
      'Invoice Type': c.invoiceType ?? '',
      'Weekly Hours (Site)': c.requiredWeeklyHoursSite ?? '',
      'LPO Date': c.lpoDate ? new Date(c.lpoDate).toLocaleDateString('en-GB') : '',
      'LPO Validity': c.lpoValidity ? new Date(c.lpoValidity).toLocaleDateString('en-GB') : '',
      'Remarks': c.remarks ?? '',
    }))
    exportToCSV(rows, 'clients')
  }

  const mappedData = useMemo(() => {
    return (data?.data ?? []).map((c: any) => ({
      ...c,
      // flatten companyDetails for table column accessors
      email:                  c.companyDetails?.email   ?? '',
      phone:                  c.companyDetails?.phone   ?? '',
      address:                c.companyDetails?.address ?? '',
      taxNumber:              c.companyDetails?.taxNumber ?? '',
      signedAgreement:        c.signedAgreement ? 'Yes' : 'No',
      validLPO:               c.validLPO ? 'Yes' : 'No',
      lpoDate:                c.lpoDate   ? new Date(c.lpoDate).toLocaleDateString('en-GB')   : '',
      lpoValidity:            c.lpoValidity ? new Date(c.lpoValidity).toLocaleDateString('en-GB') : '',
    }))
  }, [data?.data])

  const table = useReactTable({
    data: mappedData,
    columns: useMemo(() => [
      ...CLIENT_COLUMNS,
      {
        id: 'actions',
        header: '',
        cell: ({ row }: any) => {
          const client = row.original
          return (
            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => { setEditTarget(client); setFormOpen(true) }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeleteTarget({ id: client._id, name: client.name })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        }
      }
    ], []),
    getCoreRowModel: getCoreRowModel(),
  })

  const totalClients = data?.pagination?.total ?? 0
  const activeClients = (data?.data ?? []).filter((c: any) => c.isActive).length

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      {formOpen && (
        <ClientFormModal
          client={editTarget}
          onClose={() => { setFormOpen(false); setEditTarget(null) }}
          onSuccess={() => { setFormOpen(false); setEditTarget(null); qc.invalidateQueries({ queryKey: ['clients'] }) }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
        />
      )}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="Clients"
        apiEndpoint="/clients/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <Building2 className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Client Hub</h1>
            </div>
            <p className="text-slate-500 text-sm ml-12">Full business lifecycle from LPO to profit — in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={!data?.data?.length}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md" onClick={() => { setEditTarget(null); setFormOpen(true) }}>
              <Plus className="h-4 w-4" /> Add Client
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Building2}   label="Total Clients"    value={String(totalClients || '—')} sub={`${activeClients} active`}        color="bg-blue-100 text-blue-600" />
        <KpiCard icon={DollarSign}  label="Total Revenue"    value={stats?.totalRevenue ? `AED ${(stats.totalRevenue/1000).toFixed(0)}K` : '—'} sub="All invoiced"   color="bg-emerald-100 text-emerald-600" />
        <KpiCard icon={AlertTriangle} label="Outstanding"    value={stats?.outstandingAmount ? `AED ${(stats.outstandingAmount/1000).toFixed(0)}K` : '—'} sub={`${stats?.outstandingCount ?? 0} invoices`} color="bg-amber-100 text-amber-600" />
        <KpiCard icon={TrendingUp}  label="Net Profit %"     value={stats?.profitPct ? `${stats.profitPct.toFixed(1)}%` : '—'} sub="Current month"  color="bg-violet-100 text-violet-600" />
      </div>

      <div>
          {/* Search + filter row */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search clients…"
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {['', 'true', 'false'].map(s => (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setPage(1) }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    status === s
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {s === '' ? 'All' : s === 'true' ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>
            <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 gap-1 ml-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 mb-3" />
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-800 font-semibold">No clients found</p>
              <p className="text-slate-500 text-sm mt-1">
                {search || status ? 'Try adjusting your filters.' : 'Import a CSV or run npm run seed.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.data?.map((client: any) => {
                const avatarColor = getClientColor(client.name)
                const initials = getInitials(client.name)
                return (
                  <Link key={client._id} href={`/clients/${client._id}`} className="block group">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                      {/* Status + Industry and Actions */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            client.isActive
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {client.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {client.industry && (
                            <span className="text-[10px] text-slate-500 font-medium">{client.industry}</span>
                          )}
                        </div>
                        <div className="flex gap-1" onClick={e => e.preventDefault()}>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditTarget(client); setFormOpen(true) }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget({ id: client._id, name: client.name }) }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Logo/Avatar + Name */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center shrink-0`}>
                          <span className="font-bold text-sm tracking-wide">{initials}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-slate-900 font-bold text-sm leading-tight group-hover:text-blue-600 transition-colors truncate">
                            {client.name}
                          </h3>
                          <p className="text-slate-500 text-xs mt-0.5 truncate">{client.contractType ?? 'No contract'}</p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-1.5">
                        {client.companyDetails?.email && (
                          <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{client.companyDetails.email}</span>
                          </div>
                        )}
                        {client.companyDetails?.phone && (
                          <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span>{client.companyDetails.phone}</span>
                          </div>
                        )}
                        {client.website && (
                          <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <Globe className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{client.website.replace(/^https?:\/\//, '')}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-500">Rate Card</p>
                          <p className="text-sm font-bold text-slate-800">
                            {client.rateCard ? `AED ${client.rateCard}/hr` : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500">Credit Terms</p>
                          <p className="text-xs text-slate-700 font-medium">
                            {client.creditTerms ? `${client.creditTerms} days` : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            /* List view */
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm min-w-max">
                  <ERPTableHeader table={table} isLoading={isLoading} />
                  {!isLoading && (
                    <tbody className="bg-white">
                      {table.getRowModel().rows.length === 0 ? (
                        <tr>
                          <td colSpan={CLIENT_COLUMNS.length} className="text-center h-32 text-slate-500 py-10">
                            <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            No clients found.
                          </td>
                        </tr>
                      ) : (
                        table.getRowModel().rows.map(row => (
                          <tr
                            key={row.id}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors h-10 cursor-pointer"
                            onClick={() => router.push(`/clients/${row.original._id}`)}
                          >
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
                Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} clients
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!data.pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800">
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={!data.pagination.hasNextPage} onClick={() => setPage(p => p + 1)}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800">
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}
