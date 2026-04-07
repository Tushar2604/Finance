'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useBankTransactions, useUploadBankStatement } from '@/lib/hooks/useBank'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { UploadCloud, FileText, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'

export default function BankPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useBankTransactions({ page, limit: 15 })
  const uploadMutation = useUploadBankStatement()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('batchName', `Upload_${format(new Date(), 'yyyyMMdd_HHmm')}`)

    await uploadMutation.mutateAsync(formData)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bank Statements</h2>
          <p className="text-muted-foreground mt-1">Upload and review bank transactions for reconciliation.</p>
        </div>
        <div>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploadMutation.isPending}
            className="shadow-md hover:shadow-lg transition-all"
          >
            {uploadMutation.isPending ? (
               <span className="animate-pulse">Uploading...</span>
            ) : (
               <>
                 <UploadCloud className="mr-2 h-4 w-4" /> Upload CSV
               </>
            )}
          </Button>
        </div>
      </div>

      {uploadMutation.isSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center space-x-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>Successfully uploaded and parsed <strong>{uploadMutation.data?.count}</strong> transactions!</span>
        </div>
      )}

      <Card className="shadow-sm border-0 border-t-4 border-t-blue-500">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>All ingested transactions from statements.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
             <div className="p-4 text-red-500">Failed to load bank transactions</div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Debit</TableHead>
                    <TableHead>Credit</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Match Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-48 text-muted-foreground flex flex-col items-center justify-center">
                        <FileText className="h-10 w-10 text-slate-300 mb-2" />
                        No transactions found. Upload a statement to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data.map((tx: any) => (
                      <TableRow key={tx._id} className="cursor-pointer hover:bg-slate-50 transition-colors text-sm">
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(tx.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={tx.description}>{tx.description}</TableCell>
                        <TableCell className="text-muted-foreground">{tx.reference || '-'}</TableCell>
                        <TableCell className="text-rose-600 font-medium">
                          {tx.debit > 0 ? `$${tx.debit.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-emerald-600 font-medium">
                          {tx.credit > 0 ? `$${tx.credit.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="font-semibold">${tx.balance.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={tx.matchStatus === 'Matched' ? 'default' : tx.matchStatus === 'Partial' ? 'secondary' : 'outline'}>
                            {tx.matchStatus}
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
