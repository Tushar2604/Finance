'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useExpenses } from '@/lib/hooks/useExpenses'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'

export default function ExpensesPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useExpenses({ page, limit: 10 })

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Expenses</h2>
          <p className="text-muted-foreground mt-1">Track and approve employee-submitted expenses.</p>
        </div>
      </div>

      <Card className="shadow-sm border-0 border-t-4 border-t-amber-500">
        <CardHeader>
          <CardTitle>Expense Claims</CardTitle>
          <CardDescription>Recent claims across all projects and categories.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
             <div className="p-4 text-red-500">Failed to load expenses</div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No expenses found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data.map((expense: any) => (
                      <TableRow key={expense._id} className="cursor-pointer hover:bg-slate-50 transition-colors">
                        <TableCell>{format(new Date(expense.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="font-medium">
                          {expense.employeeId?.firstName} {expense.employeeId?.lastName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={expense.description}>{expense.description}</TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          ${expense.amount.toLocaleString()}
                        </TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
