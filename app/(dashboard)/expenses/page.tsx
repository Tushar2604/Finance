'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useExpenses } from '@/lib/hooks/useExpenses'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { exportToCSV } from '@/lib/export'
import ImportModal from '@/components/ImportModal'
import Link from 'next/link'

const IMPORT_COLUMNS = [
  { key: 'description', label: 'Description', required: true },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'date', label: 'Date (YYYY-MM-DD)' },
  { key: 'paidTo', label: 'Paid To' },
  { key: 'paymentMode', label: 'Payment Mode' },
  { key: 'status', label: 'Status' },
  { key: 'bankReference', label: 'Bank Reference' },
]

const TEMPLATE_ROWS = [
  { description: 'SaaS Licenses', category: 'Software', amount: '1500', date: '2024-11-15', paidTo: 'Microsoft', paymentMode: 'Bank', status: 'Approved', bankReference: 'EXP-2024-11-0' },
]

export default function ExpensesPage() {
  const [page, setPage] = useState(1)
  const [importOpen, setImportOpen] = useState(false)
  const { data, isLoading, error, refetch } = useExpenses({ page, limit: 10 })

  const handleExport = () => {
    const rows = (data?.data ?? []).map((e: any) => ({
      description: e.description,
      category: e.category,
      amount: e.amount,
      date: e.date ? format(new Date(e.date), 'yyyy-MM-dd') : '',
      paidTo: e.paidTo ?? '',
      paymentMode: e.paymentMode ?? '',
      status: e.status,
      bankReference: e.bankReference ?? '',
    }))
    exportToCSV(rows, 'expenses')
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="Expenses"
        apiEndpoint="/expenses/import"
        columns={IMPORT_COLUMNS}
        templateRows={TEMPLATE_ROWS}
        onSuccess={() => refetch()}
      />

      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Expenses</h2>
          <p className="text-muted-foreground mt-1">Track and approve employee-submitted expenses.</p>
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

      <Card className="shadow-sm border-0 border-t-4 border-t-amber-500">
        <CardHeader>
          <CardTitle>Expense Claims</CardTitle>
          <CardDescription>Recent claims across all projects and categories.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-4 text-red-500">Failed to load expenses</div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Paid To</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No expenses found.</TableCell>
                      </TableRow>
                    ) : (
                      data?.data.map((expense: any) => (
                        <TableRow key={expense._id} className="cursor-pointer hover:bg-slate-50 transition-colors">
                          <TableCell className="text-muted-foreground">{format(new Date(expense.date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                          <TableCell className="max-w-[200px] truncate" title={expense.description}>
                            <Link href={`/expenses/${expense._id}`} className="font-semibold text-blue-600 hover:underline">
                              {expense.description}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{expense.paidTo ?? '—'}</TableCell>
                          <TableCell className="font-semibold text-slate-800">AED {expense.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={expense.status === 'Approved' ? 'default' : expense.status === 'Rejected' ? 'destructive' : 'secondary'}>
                              {expense.status}
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
