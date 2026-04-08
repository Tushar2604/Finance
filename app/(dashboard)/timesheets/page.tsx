'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import Link from 'next/link'
import { Clock, Plus, Download, Upload } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'

const IMPORT_COLUMNS = [
  { key: 'email', label: 'Employee Email', required: true },
  { key: 'month', label: 'Month (YYYY-MM)', required: true },
  { key: 'client', label: 'Client Name' },
  { key: 'workingDays', label: 'Working Days' },
  { key: 'hours', label: 'Hours' },
  { key: 'overtimeHours', label: 'Overtime Hours' },
  { key: 'status', label: 'Status' },
  { key: 'notes', label: 'Notes' },
]

const TEMPLATE_ROWS = [
  { email: 'emp1@bimstaff.ae', month: '2024-11', client: 'Acme Corp', workingDays: '22', hours: '176', overtimeHours: '0', status: 'Approved', notes: '' },
]

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
  const [importOpen, setImportOpen] = useState(false)
  const { data, isLoading, error, refetch } = useTimesheets({ page })

  const handleExport = () => {
    const rows = (data?.data ?? []).map((ts: any) => ({
      email: ts.employeeId?.email ?? '',
      month: ts.month,
      client: ts.clientId?.name ?? '',
      workingDays: ts.workingDays ?? '',
      hours: ts.hours ?? '',
      overtimeHours: ts.overtimeHours ?? '',
      status: ts.status,
      notes: ts.notes ?? '',
    }))
    exportToCSV(rows, 'timesheets')
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="Timesheets"
        apiEndpoint="/timesheets/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Timesheets</h2>
          <p className="text-muted-foreground mt-1">The source of truth for billing and payroll.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!data?.data?.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button className="shadow-md gap-2"><Plus className="h-4 w-4" /> Log Timesheet</Button>
        </div>
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
            <div className="p-4 text-red-500 bg-red-50 rounded-lg">Failed to load timesheets.</div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                          <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No timesheets found. Import a CSV or run <code className="text-xs bg-slate-100 px-1 rounded">npm run seed</code>.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.data?.map((ts: any) => (
                        <TableRow key={ts._id} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            <Link href={`/timesheets/${ts._id}`} className="font-semibold text-blue-600 hover:underline">
                              {ts.employeeId?.name ?? '—'}
                            </Link>
                          </TableCell>
                          <TableCell>{ts.projectId?.name ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{ts.month}</TableCell>
                          <TableCell className="font-medium">{ts.hours}h</TableCell>
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
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} records
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
