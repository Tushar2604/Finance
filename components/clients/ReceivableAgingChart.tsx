'use client'

import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

interface AgingBucket {
  label: string
  amount: number
  count: number
  color: string
}

interface ReceivableAgingChartProps {
  buckets: AgingBucket[]
  total: number
  currency?: string
}

export function ReceivableAgingChart({ buckets, total, currency = 'AED' }: ReceivableAgingChartProps) {
  const chartData = buckets.map(b => ({ name: b.label.split(' ')[0], amount: b.amount }))

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData} barGap={4}>
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} width={40} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }}
            formatter={(v: number) => [`${currency} ${v.toLocaleString()}`, 'Outstanding']}
          />
          <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={buckets[i]?.color ?? '#64748b'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Stacked progress bar */}
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden flex gap-0.5">
        {buckets.map((b, i) => (
          total > 0 && b.amount > 0 ? (
            <div
              key={i}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(b.amount / total) * 100}%`, backgroundColor: b.color }}
              title={`${b.label}: ${currency} ${b.amount.toLocaleString()}`}
            />
          ) : null
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {buckets.map(b => (
          <div key={b.label} className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
            <span>{b.label}: <strong className="text-slate-200">{currency} {(b.amount/1000).toFixed(1)}K</strong></span>
          </div>
        ))}
      </div>
    </div>
  )
}
