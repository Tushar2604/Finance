import React from 'react'

interface DarkKpiCardProps {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  gradient: string   // e.g. 'from-emerald-700/50 to-emerald-900/30'
  trend?: { value: string; positive: boolean }
}

export function DarkKpiCard({ label, value, sub, icon: Icon, gradient, trend }: DarkKpiCardProps) {
  return (
    <div className={`bg-gradient-to-br ${gradient} border border-white/10 rounded-2xl p-4`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest">{label}</p>
          <p className="text-white text-xl font-bold mt-1 truncate">{value}</p>
          {sub && <p className="text-white/50 text-[10px] mt-0.5">{sub}</p>}
          {trend && (
            <p className={`text-[10px] font-semibold mt-1 ${trend.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center shrink-0 ml-2">
          <Icon className="w-4.5 h-4.5 text-white/80" />
        </div>
      </div>
    </div>
  )
}
