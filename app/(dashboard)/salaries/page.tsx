'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useSalaries } from '@/lib/hooks/useSalaries'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, Upload } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'

const IMPORT_COLUMNS = [
  { key: 'email', label: 'Employee Email', required: true },
  { key: 'month', label: 'Month (YYYY-MM)', required: true },
  { key: 'baseSalary', label: 'Base Salary', required: true },
  { key: 'overtime', label: 'Overtime' },
  { key: 'deductions', label: 'Deductions' },
  { key: 'netSalary', label: 'Net Salary' },
  { key: 'paymentStatus', label: 'Payment Status' },
  { key: 'paymentMode', label: 'Payment Mode' },
  { key: 'paymentDate', label: 'Payment Date' },
  { key: 'bankReference', label: 'Bank Reference' },
]

const TEMPLATE_ROWS = [
  { email: 'emp1@bimstaff.ae', month: '2024-11', baseSalary: '15000', overtime: '500', deductions: '0', netSalary: '15500', paymentStatus: 'Paid', paymentMode: 'WPS', paymentDate: '2024-11-28', bankReference: 'SAL-2024-11-BIM-EMP-00001' },
]

export default function SalariesPage() {
  const [page, setPage] = useState(1)
  const [importOpen, setImportOpen] = useState(false)
  const { data, isLoading, error, refetch } = useSalaries({ page, limit: 10 })

  const handleExport = () => {
    const rows = (data?.data ?? []).map((s: any) => ({
      email: s.employeeId?.email ?? '',
      month: s.month,
      baseSalary: s.baseSalary,
      overtime: s.overtime ?? 0,
      deductions: s.deductions ?? 0,
      netSalary: s.netSalary,
      paymentStatus: s.paymentStatus,
      paymentMode: s.paymentMode,
      paymentDate: s.paymentDate ? new Date(s.paymentDate).toISOString().split('T')[0] : '',
      bankReference: s.bankReference ?? '',
    }))
    exportToCSV(rows, 'salaries')
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="Salaries"
        apiEndpoint="/salaries/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Salaries & Payroll</h2>
          <p className="text-muted-foreground mt-1">Manage employee salaries and WPS transfers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!data?.data?.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-0 border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>Salary Records</CardTitle>
          <CardDescription>All generated salary records based on timesheets.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-4 text-red-500">Failed to load salaries</div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Mode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No salaries found.</TableCell>
                      </TableRow>
                    ) : (
                      data?.data.map((salary: any) => (
                        <TableRow key={salary._id} className="cursor-pointer hover:bg-slate-50 transition-colors">
                          <TableCell className="font-medium">{salary.employeeId?.name ?? '—'}</TableCell>
                          <TableCell>{salary.month}</TableCell>
                          <TableCell>AED {salary.baseSalary?.toLocaleString()}</TableCell>
                          <TableCell className="font-semibold text-emerald-600">AED {salary.netSalary?.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={salary.paymentStatus === 'Paid' ? 'default' : salary.paymentStatus === 'Failed' ? 'destructive' : 'secondary'}>
                              {salary.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>{salary.paymentMode}</TableCell>
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
