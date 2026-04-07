'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAlerts, useResolveAlert } from '@/lib/hooks/useAlerts'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function AlertsPage() {
  const { data, isLoading } = useAlerts({ isResolved: false, limit: 50 })
  const resolveMutation = useResolveAlert()

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'Critical': return <AlertCircle className="h-5 w-5 text-rose-600" />
      case 'High': return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case 'Medium': return <Info className="h-5 w-5 text-blue-500" />
      default: return <Info className="h-5 w-5 text-slate-500" />
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Alerts</h2>
          <p className="text-muted-foreground mt-1">AI-detected anomalies and rule-based system errors.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : data.data.length === 0 ? (
          <Card className="border-dashed shadow-none bg-slate-50">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
              <p className="text-sm text-slate-500 mt-1">No active alerts require your attention at this time.</p>
            </CardContent>
          </Card>
        ) : (
          data.data.map((alert: any) => (
            <Card key={alert._id} className="overflow-hidden border-l-4 group transition-all duration-300 hover:shadow-md" style={{
              borderLeftColor: alert.severity === 'Critical' ? '#e11d48' : alert.severity === 'High' ? '#f59e0b' : alert.severity === 'Medium' ? '#3b82f6' : '#94a3b8'
            }}>
              <CardContent className="p-0">
                <div className="flex items-start p-5">
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(alert.severity)}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-semibold text-slate-900">{alert.title}</h4>
                      <span className="text-xs text-slate-500">{format(new Date(alert.createdAt), 'MMM dd, hh:mm a')}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 mr-8">{alert.message}</p>
                    <div className="mt-3 flex items-center space-x-3">
                      <Badge variant="outline">{alert.type}</Badge>
                      {alert.entityType && <Badge variant="secondary">{alert.entityType}</Badge>}
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveMutation.mutate(alert._id)}
                      disabled={resolveMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
