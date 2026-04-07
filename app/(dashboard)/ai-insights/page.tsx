'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, TrendingUp, AlertTriangle, MessageSquare } from 'lucide-react'

export default function AIInsightsPage() {
  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center">
            <Sparkles className="mr-2 h-6 w-6 text-violet-600" />
            AI Finance Insights
          </h2>
          <p className="text-muted-foreground mt-1">LLM-powered analysis on margin leakage, cost anomalies, and profitability.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-t-4 border-t-violet-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
             <CardTitle className="flex flex-row items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-violet-500" />
                Anomaly Detection
             </CardTitle>
             <CardDescription>AI pattern matching to catch irregular expenses or salary drops.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                <div className="p-4 bg-slate-50 border rounded-lg">
                   <p className="text-sm font-medium">Spike in 'Software' expenses</p>
                   <p className="text-xs text-muted-foreground mt-1">We detected a 45% increase in Software expenses for Project Alpha. Review AWS overage logic.</p>
                </div>
                <div className="p-4 bg-slate-50 border rounded-lg">
                   <p className="text-sm font-medium">Duplicate Salary Payments</p>
                   <p className="text-xs text-muted-foreground mt-1">Employee #1042 was paid twice matching bank references. Found via fuzzy matching Bank statements and Pay runs.</p>
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-indigo-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
             <CardTitle className="flex flex-row items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-indigo-500" />
                Profitability Optimizer
             </CardTitle>
             <CardDescription>Predictive forecasting based on timesheet burn rate.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4 text-sm leading-relaxed">
                <p>Based on the current utilization rate of <strong>82%</strong>, the overall profit margin is trending towards <strong>18%</strong> by the end of Q3. </p>
                <p>Recommended actions to improve margin:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Increase charge-out rate for Senior Engineers by 5%.</li>
                  <li>Reassign 2 benched employees to Project Beta.</li>
                </ul>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-none text-white shadow-xl">
         <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
               <h3 className="text-xl font-bold mb-2 flex items-center">
                 <MessageSquare className="mr-2 h-5 w-5" /> Chat with your Financial Data
               </h3>
               <p className="text-slate-300 max-w-xl">
                 Ask questions in plain English like <i>"Which project has the lowest margin?"</i> or <i>"Show me outstanding invoices above $10k"</i>.
               </p>
            </div>
            <Button variant="secondary" size="lg" className="whitespace-nowrap">
               Open AI Chat
            </Button>
         </CardContent>
      </Card>
    </div>
  )
}
