'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Building2, Search, Plus, Download, Upload } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'

const IMPORT_COLUMNS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'website', label: 'Website' },
  { key: 'industry', label: 'Industry' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'taxNumber', label: 'Tax Number' },
  { key: 'contractType', label: 'Contract Type' },
  { key: 'rateCard', label: 'Rate Card' },
  { key: 'billingType', label: 'Billing Type' },
  { key: 'creditTerms', label: 'Credit Terms' },
  { key: 'isActive', label: 'Is Active' },
]

const TEMPLATE_ROWS = [
  { name: 'Acme Corp', website: 'https://acme.com', industry: 'FinTech', email: 'finance@acme.com', phone: '+971501234567', address: 'Dubai, UAE', taxNumber: 'TRN100200300400', contractType: 'LPO', rateCard: '250', billingType: 'Monthly', creditTerms: '30', isActive: 'true' },
]

function useClients(filters: { page: number; search?: string }) {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', filters.page.toString())
      params.append('limit', '20')
      if (filters.search) params.append('search', filters.search)
      const { data } = await apiClient.get<any>(`/clients?${params}`)
      return data.data
    },
  })
}

export default function ClientsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const { data, isLoading, error, refetch } = useClients({ page, search })

  const handleExport = () => {
    const rows = (data?.data ?? []).map((c: any) => ({
      name: c.name,
      website: c.website ?? '',
      industry: c.industry ?? '',
      email: c.companyDetails?.email ?? '',
      phone: c.companyDetails?.phone ?? '',
      address: c.companyDetails?.address ?? '',
      taxNumber: c.companyDetails?.taxNumber ?? '',
      contractType: c.contractType ?? '',
      rateCard: c.rateCard ?? '',
      billingType: c.billingType ?? '',
      creditTerms: c.creditTerms ?? '',
      isActive: c.isActive ? 'true' : 'false',
    }))
    exportToCSV(rows, 'clients')
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="Clients"
        apiEndpoint="/clients/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground mt-1">Manage your client portfolio and contracts.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!data?.data?.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button className="shadow-md gap-2"><Plus className="h-4 w-4" /> Add Client</Button>
        </div>
      </div>

      <Card className="shadow-sm border-0 border-t-4 border-t-blue-500">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Client Directory</CardTitle>
              <CardDescription>Click a client name to view their full profile.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search clients..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-4 text-red-500 bg-red-50 rounded-lg">Failed to load clients.</div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rate (AED/hr)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                          <Building2 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No clients found. Import a CSV or run <code className="text-xs bg-slate-100 px-1 rounded">npm run seed</code>.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.data?.map((client: any) => (
                        <TableRow key={client._id} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            <Link href={`/clients/${client._id}`} className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                              {client.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{client.industry || '—'}</TableCell>
                          <TableCell><Badge variant="outline">{client.contractType ?? '—'}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{client.companyDetails?.email ?? '—'}</TableCell>
                          <TableCell className="font-medium">{client.rateCard ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant={client.isActive ? 'default' : 'secondary'}>
                              {client.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} clients
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
