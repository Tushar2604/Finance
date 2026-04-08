'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { FolderKanban, Search, Plus, Download, Upload } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'

const IMPORT_COLUMNS = [
  { key: 'name', label: 'Project Name', required: true },
  { key: 'client', label: 'Client Name' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status' },
  { key: 'budget', label: 'Budget' },
  { key: 'startDate', label: 'Start Date (YYYY-MM-DD)' },
  { key: 'endDate', label: 'End Date (YYYY-MM-DD)' },
]

const TEMPLATE_ROWS = [
  { name: 'Strategic Initiative Phase 1', client: 'Acme Corp', description: 'Project execution', status: 'Active', budget: '500000', startDate: '2024-01-01', endDate: '' },
]

function useProjects(filters: { page: number; search?: string }) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', filters.page.toString())
      params.append('limit', '20')
      if (filters.search) params.append('search', filters.search)
      const { data } = await apiClient.get<any>(`/projects?${params}`)
      return data.data
    },
  })
}

export default function ProjectsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const { data, isLoading, error, refetch } = useProjects({ page, search })

  const handleExport = () => {
    const rows = (data?.data ?? []).map((p: any) => ({
      name: p.name,
      client: p.clientId?.name ?? '',
      description: p.description ?? '',
      status: p.status,
      budget: p.budget ?? '',
      startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
      endDate: p.endDate ? new Date(p.endDate).toISOString().split('T')[0] : '',
    }))
    exportToCSV(rows, 'projects')
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="Projects"
        apiEndpoint="/projects/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground mt-1">Track all active and completed staffing projects.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!data?.data?.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button className="shadow-md gap-2"><Plus className="h-4 w-4" /> Add Project</Button>
        </div>
      </div>

      <Card className="shadow-sm border-0 border-t-4 border-t-violet-500">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Project Register</CardTitle>
              <CardDescription>All projects across all clients.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search projects..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-4 text-red-500 bg-red-50 rounded-lg">Failed to load projects.</div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                          <FolderKanban className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No projects found. Import a CSV or run <code className="text-xs bg-slate-100 px-1 rounded">npm run seed</code>.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.data?.map((project: any) => (
                        <TableRow key={project._id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                          <TableCell className="font-semibold">{project.name}</TableCell>
                          <TableCell className="text-muted-foreground">{project.clientId?.name ?? '—'}</TableCell>
                          <TableCell className="font-medium">{project.budget ? `AED ${Number(project.budget).toLocaleString()}` : '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}</TableCell>
                          <TableCell>
                            <Badge variant={project.status === 'Active' ? 'default' : project.status === 'Completed' ? 'secondary' : 'outline'}>
                              {project.status}
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
                    Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} projects
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
