import React from 'react'

interface ConfidenceBadgeProps {
  score: number // 0–100
  showLabel?: boolean
}

export function ConfidenceBadge({ score, showLabel = true }: ConfidenceBadgeProps) {
  const level =
    score >= 90 ? { label: 'High',   bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', bar: 'bg-emerald-500' } :
    score >= 70 ? { label: 'Medium', bg: 'bg-amber-500/20',   text: 'text-amber-400',   border: 'border-amber-500/30',   bar: 'bg-amber-500'   } :
                  { label: 'Low',    bg: 'bg-rose-500/20',    text: 'text-rose-400',    border: 'border-rose-500/30',    bar: 'bg-rose-500'    }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${level.bg} ${level.text} ${level.border}`}>
      <div className="w-10 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${level.bar}`} style={{ width: `${score}%` }} />
      </div>
      {showLabel && <span>{score}%</span>}
      {showLabel && <span className="opacity-60">{level.label}</span>}
    </div>
  )
}
