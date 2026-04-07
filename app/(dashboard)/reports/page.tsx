'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DownloadCloud, PieChart, TrendingUp, Filter } from 'lucide-react'

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(false)

  const handleDownloadVAT = () => {
    setDownloading(true)
    setTimeout(() => setDownloading(false), 2000) // Mock download
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground mt-1">Export financial reports, VAT logs, and profitability sheets.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* VAT Report */}
        <Card className="hover:shadow-md transition-all group">
          <CardHeader className="pb-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <PieChart className="h-6 w-6 text-emerald-600" />
            </div>
            <CardTitle>UAE VAT Report</CardTitle>
            <CardDescription>Consolidated input and output VAT (5%) for FTA submission.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button className="w-full" onClick={handleDownloadVAT} disabled={downloading}>
               {downloading ? "Generating..." : <><DownloadCloud className="mr-2 h-4 w-4" /> Download CSV</>}
             </Button>
          </CardContent>
        </Card>

        {/* Profitability Report */}
        <Card className="hover:shadow-md transition-all group">
          <CardHeader className="pb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Project Profitability</CardTitle>
            <CardDescription>Detailed margin analysis per project and employee.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button className="w-full" variant="outline">
               <DownloadCloud className="mr-2 h-4 w-4" /> Export XLSX
             </Button>
          </CardContent>
        </Card>

        {/* Reconciliation Report */}
        <Card className="hover:shadow-md transition-all group">
          <CardHeader className="pb-4">
            <div className="w-12 h-12 rounded-lg bg-rose-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Filter className="h-6 w-6 text-rose-600" />
            </div>
            <CardTitle>Reconciliation Ledger</CardTitle>
            <CardDescription>Unmatched entries, partial payments, and ledger gaps.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button className="w-full" variant="outline">
               <DownloadCloud className="mr-2 h-4 w-4" /> Export PDF
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
