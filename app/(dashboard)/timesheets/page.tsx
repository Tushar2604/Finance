'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import apiClient, { PaginatedResponse } from '@/lib/api'
import { Clock, Plus } from 'lucide-react'
import { format } from 'date-fns'

function useTimesheets(filters: { page: number }) {
  return useQuery({
    queryKey: ['timesheets', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', filters.page.toString())
      params.append('limit', '20')
      const { data } = await apiClient.get<any>(`/timesheets?${params}`)
      return data.data
    },
  })
}

export default function TimesheetsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useTimesheets({ page })

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Timesheets</h2>
          <p className="text-muted-foreground mt-1">The source of truth for billing and payroll.</p>
        </div>
        <Button className="shadow-md gap-2"><Plus className="h-4 w-4" /> Log Timesheet</Button>
      </div>

      <Card className="shadow-sm border-0 border-t-4 border-t-teal-500">
        <CardHeader>
          <CardTitle>Timesheet Records</CardTitle>
          <CardDescription>Employee hours logged across all projects.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-4 text-red-500 bg-red-50 rounded-lg">Failed to load timesheets. Ensure MongoDB is running and seeded.</div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        No timesheets found. Run <code className="text-xs bg-slate-100 px-1 rounded">npm run seed</code> to add sample data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data?.map((ts: any) => (
                      <TableRow key={ts._id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <TableCell className="font-semibold">
                          {ts.employeeId?.firstName} {ts.employeeId?.lastName}
                        </TableCell>
                        <TableCell>{ts.projectId?.name ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {ts.periodStart ? format(new Date(ts.periodStart), 'MMM dd') : '—'} — {ts.periodEnd ? format(new Date(ts.periodEnd), 'MMM dd, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="font-medium">{ts.totalHours}h</TableCell>
                        <TableCell>${ts.billableAmount?.toLocaleString() ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={ts.status === 'Approved' ? 'default' : ts.status === 'Rejected' ? 'destructive' : 'secondary'}>
                            {ts.status}
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
