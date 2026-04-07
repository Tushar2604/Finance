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
import { Users, Search, Plus, Download } from 'lucide-react'
import { exportToCSV } from '@/lib/export'

function useEmployees(filters: { page: number; search?: string }) {
  return useQuery({
    queryKey: ['employees', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', filters.page.toString())
      params.append('limit', '20')
      if (filters.search) params.append('search', filters.search)
      const { data } = await apiClient.get<any>(`/employees?${params}`)
      return data.data
    },
  })
}

export default function EmployeesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading, error } = useEmployees({ page, search })

  const handleExport = () => {
    const rows = (data?.data ?? []).map((emp: any) => ({
      'Employee Code': emp.employeeCode,
      'Name': emp.name,
      'Email': emp.email,
      'Position': emp.position ?? '—',
      'Base Salary (AED)': emp.baseSalary,
      'Status': emp.status,
      'Nationality': emp.nationality ?? '—',
      'Joining Date': emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '—',
      'Assigned Client': (emp.assignedClientId as any)?.name ?? '—',
      'Assigned Project': (emp.assignedProjectId as any)?.name ?? '—',
    }))
    exportToCSV(rows, 'employees')
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground mt-1">Manage your workforce and their assignments.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!data?.data?.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button className="shadow-md gap-2"><Plus className="h-4 w-4" /> Add Employee</Button>
        </div>
      </div>

      <Card className="shadow-sm border-0 border-t-4 border-t-amber-500">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>Click an employee name to view their full profile.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search employees..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-4 text-red-500 bg-red-50 rounded-lg">Failed to load employees. Ensure MongoDB is running and seeded.</div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Employee Code</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Assigned Client</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No employees found. Run <code className="text-xs bg-slate-100 px-1 rounded">npm run seed</code> to add sample data.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.data?.map((emp: any) => (
                        <TableRow key={emp._id} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            <Link
                              href={`/employees/${emp._id}`}
                              className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {emp.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">{emp.employeeCode}</TableCell>
                          <TableCell>{emp.position ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{(emp.assignedClientId as any)?.name ?? 'Internal'}</TableCell>
                          <TableCell className="font-medium">AED {emp.baseSalary?.toLocaleString() ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant={emp.status === 'Active' ? 'default' : emp.status === 'On-Leave' ? 'secondary' : 'outline'}>
                              {emp.status}
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
                    Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} employees
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
