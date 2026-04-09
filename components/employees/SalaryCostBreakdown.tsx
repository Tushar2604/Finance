'use client'

import React from 'react'
import { DarkCard } from '@/components/shared/DarkCard'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

interface SalaryCostBreakdownProps {
  baseSalary: number
  currency?: string
}

export function SalaryCostBreakdown({ baseSalary, currency = 'AED' }: SalaryCostBreakdownProps) {
  const items = [
    { label: 'Base Salary',         amount: baseSalary,         color: '#3b82f6' },
    { label: 'End of Service Prov', amount: baseSalary * 0.083, color: '#6366f1' },
    { label: 'Annual Leave Prov',   amount: baseSalary * 0.077, color: '#8b5cf6' },
    { label: 'Medical Insurance',   amount: 400,                color: '#a78bfa' },
    { label: 'Visa / PRO',          amount: 250,                color: '#c4b5fd' },
    { label: 'Overhead (8%)',       amount: baseSalary * 0.08,  color: '#ddd6fe' },
  ]
  const total = items.reduce((s, i) => s + i.amount, 0)
  const chartData = items.map(i => ({ name: i.label.split(' ')[0], value: Math.round(i.amount) }))

  return (
    <DarkCard title="Full Employment Cost Breakdown" subtitle="Monthly cost-to-company">
      <div className="space-y-4">
        {/* Bar chart */}
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 0 }}>
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(1)}K`} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} width={55} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(v: number) => [`${currency} ${v.toLocaleString()}`, '']}
            />
            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={items[i].color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Detail rows */}
        <div className="space-y-1.5">
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-slate-400 text-xs flex-1">{item.label}</span>
              <span className="text-slate-300 text-xs font-mono">
                {currency} {Math.round(item.amount).toLocaleString()}
              </span>
              <span className="text-slate-600 text-[10px] w-10 text-right">
                {((item.amount / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 pt-2 border-t border-slate-700 mt-2">
            <span className="w-2.5 h-2.5" />
            <span className="text-white text-xs flex-1 font-bold">Total Monthly CTC</span>
            <span className="text-white text-xs font-bold font-mono">
              {currency} {Math.round(total).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </DarkCard>
  )
}
