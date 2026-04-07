'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useSalaries } from '@/lib/hooks/useSalaries'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'

export default function SalariesPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useSalaries({ page, limit: 10 })

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Salaries & Payroll</h2>
          <p className="text-muted-foreground mt-1">Manage employee salaries and WPS transfers.</p>
        </div>
      </div>

      <Card className="shadow-sm border-0 border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>Salary Records</CardTitle>
          <CardDescription>All generated salary records based on timesheets.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
             <div className="p-4 text-red-500">Failed to load salaries</div>
          ) : (
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
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No salaries found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data.map((salary: any) => (
                      <TableRow key={salary._id} className="cursor-pointer hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium">
                          {salary.employeeId?.firstName} {salary.employeeId?.lastName}
                        </TableCell>
                        <TableCell>{salary.month}</TableCell>
                        <TableCell>${salary.baseSalary?.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-emerald-600">
                          ${salary.netSalary?.toLocaleString()}
                        </TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
