'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import apiClient, { PaginatedResponse } from '@/lib/api'
import { FolderKanban, Search, Plus } from 'lucide-react'

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
  const { data, isLoading, error } = useProjects({ page, search })

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground mt-1">Track all active and completed staffing projects.</p>
        </div>
        <Button className="shadow-md gap-2"><Plus className="h-4 w-4" /> Add Project</Button>
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
            <div className="p-4 text-red-500 bg-red-50 rounded-lg">Failed to load projects. Ensure MongoDB is running and seeded.</div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                        <FolderKanban className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        No projects found. Run <code className="text-xs bg-slate-100 px-1 rounded">npm run seed</code> to add sample data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data?.map((project: any) => (
                      <TableRow key={project._id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <TableCell className="font-semibold">{project.name}</TableCell>
                        <TableCell>{project.clientId?.name ?? project.clientId ?? '—'}</TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
