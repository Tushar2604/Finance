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
import { FileText, Search, Plus } from 'lucide-react'
import { format } from 'date-fns'

function useInvoices(filters: { page: number; search?: string }) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', filters.page.toString())
      params.append('limit', '20')
      if (filters.search) params.append('search', filters.search)
      const { data } = await apiClient.get<any>(`/invoices?${params}`)
      return data.data
    },
  })
}

const statusVariant = (s: string) => {
  if (s === 'Paid') return 'default'
  if (s === 'Overdue') return 'destructive'
  if (s === 'PartiallyPaid') return 'warning' as any
  return 'secondary'
}

export default function InvoicesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading, error } = useInvoices({ page, search })

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground mt-1">Track all client invoices and payment status.</p>
        </div>
        <Button className="shadow-md gap-2"><Plus className="h-4 w-4" /> Create Invoice</Button>
      </div>

      <Card className="shadow-sm border-0 border-t-4 border-t-emerald-500">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Invoice Register</CardTitle>
              <CardDescription>All invoices generated from approved timesheets.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search invoices..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <div className="p-4 text-red-500 bg-red-50 rounded-lg">Failed to load invoices. Ensure MongoDB is running and seeded.</div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>VAT</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        No invoices found. Run <code className="text-xs bg-slate-100 px-1 rounded">npm run seed</code> to add sample data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data?.map((inv: any) => (
                      <TableRow key={inv._id} className="hover:bg-slate-50 transition-colors cursor-pointer text-sm">
                        <TableCell className="font-mono font-semibold text-blue-600">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.clientId?.name ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.issuedDate ? format(new Date(inv.issuedDate), 'MMM dd, yyyy') : '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.dueDate ? format(new Date(inv.dueDate), 'MMM dd, yyyy') : '—'}</TableCell>
                        <TableCell className="font-semibold">${inv.totalAmount?.toLocaleString()}</TableCell>
                        <TableCell className="text-emerald-600">${inv.paidAmount?.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground">${inv.vatAmount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
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
