'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboard } from '@/lib/hooks/useDashboard'
import { Activity, CreditCard, DollarSign, Users } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard()

  const chartData = [
    { name: 'Month 1', total: data?.monthlyRevenue[0] || 0 },
    { name: 'Month 2', total: data?.monthlyRevenue[1] || 0 },
    { name: 'Month 3', total: data?.monthlyRevenue[2] || 0 },
    { name: 'Month 4', total: data?.monthlyRevenue[3] || 0 },
    { name: 'Month 5', total: data?.monthlyRevenue[4] || 0 },
    { name: 'Month 6', total: data?.monthlyRevenue[5] || 0 },
  ]

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">
          Financial Overview
        </h2>
        <p className="text-muted-foreground mt-1">
          Monitor your key performance indicators and revenue streams.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          Failed to load dashboard data.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <div className="p-2 bg-emerald-100 rounded-full group-hover:scale-110 transition-transform">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${data?.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">+20.1% from last month</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <div className="p-2 bg-blue-100 rounded-full group-hover:scale-110 transition-transform">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${data?.netProfit.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Margin: {data?.profitMargin.toFixed(2)}%
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                <div className="p-2 bg-amber-100 rounded-full group-hover:scale-110 transition-transform">
                  <Users className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.activeEmployees}</div>
                <p className="text-xs text-muted-foreground mt-1">Across multiple projects</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Invoices</CardTitle>
                <div className="p-2 bg-rose-100 rounded-full group-hover:scale-110 transition-transform">
                  <CreditCard className="h-4 w-4 text-rose-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.outstandingInvoices}</div>
                <p className="text-xs text-muted-foreground mt-1">Requires follow-up</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 lg:col-span-7 hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis
                        dataKey="name"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="total" fill="currentColor" className="fill-blue-600 dark:fill-blue-400" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
