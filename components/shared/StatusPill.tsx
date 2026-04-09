import React from 'react'

type Variant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple'

const VARIANTS: Record<Variant, { bg: string; text: string; border: string; dot: string }> = {
  success: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  warning: { bg: 'bg-amber-500/20',   text: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-400'   },
  error:   { bg: 'bg-rose-500/20',    text: 'text-rose-400',    border: 'border-rose-500/30',    dot: 'bg-rose-400'    },
  info:    { bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    },
  neutral: { bg: 'bg-slate-500/20',   text: 'text-slate-400',   border: 'border-slate-500/30',   dot: 'bg-slate-400'   },
  purple:  { bg: 'bg-violet-500/20',  text: 'text-violet-400',  border: 'border-violet-500/30',  dot: 'bg-violet-400'  },
}

interface StatusPillProps {
  label: string
  variant: Variant
  showDot?: boolean
  size?: 'xs' | 'sm'
}

export function StatusPill({ label, variant, showDot = true, size = 'xs' }: StatusPillProps) {
  const v = VARIANTS[variant]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold border ${v.bg} ${v.text} ${v.border} ${size === 'xs' ? 'text-[10px]' : 'text-xs'}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${v.dot}`} />}
      {label}
    </span>
  )
}
