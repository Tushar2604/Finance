'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react'

export default function ReconciliationPage() {
  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reconciliation Engine</h2>
          <p className="text-muted-foreground mt-1">Cross-match Bank statements against System Ledgers.</p>
        </div>
        <Button className="font-semibold shadow-md gap-2" size="lg">
           <RefreshCw className="h-4 w-4" /> Run Reconciliation
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
         <Card className="shadow-sm">
            <CardHeader className="bg-slate-50 border-b pb-4">
               <CardTitle className="text-lg">Invoices ↔ Bank</CardTitle>
               <CardDescription>Matching Credits to sent Invoices.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 text-center space-y-4">
               <div className="flex justify-center gap-6">
                 <div>
                   <div className="text-3xl font-bold text-emerald-600">89%</div>
                   <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Matched</div>
                 </div>
                 <div>
                   <div className="text-3xl font-bold text-slate-800">11%</div>
                   <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Unmatched</div>
                 </div>
               </div>
               <Button variant="outline" className="w-full">View Conflicts</Button>
            </CardContent>
         </Card>

         <Card className="shadow-sm">
            <CardHeader className="bg-slate-50 border-b pb-4">
               <CardTitle className="text-lg">Salaries ↔ Bank</CardTitle>
               <CardDescription>Matching Debits to Pay runs.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 text-center space-y-4">
               <div className="flex justify-center gap-6">
                 <div>
                   <div className="text-3xl font-bold text-emerald-600">100%</div>
                   <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Matched</div>
                 </div>
                 <div>
                   <div className="text-3xl font-bold text-slate-800">0%</div>
                   <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Unmatched</div>
                 </div>
               </div>
               <Button variant="outline" className="w-full">View Conflicts</Button>
            </CardContent>
         </Card>

         <Card className="shadow-sm">
            <CardHeader className="bg-slate-50 border-b pb-4">
               <CardTitle className="text-lg">Expenses ↔ Bank</CardTitle>
               <CardDescription>Matching Debits to Approved Claims.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 text-center space-y-4">
               <div className="flex justify-center gap-6">
                 <div>
                   <div className="text-3xl font-bold text-emerald-600">94%</div>
                   <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Matched</div>
                 </div>
                 <div>
                   <div className="text-3xl font-bold text-rose-500">6%</div>
                   <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Unmatched</div>
                 </div>
               </div>
               <Button variant="outline" className="w-full">View Conflicts</Button>
            </CardContent>
         </Card>
      </div>
    </div>
  )
}
