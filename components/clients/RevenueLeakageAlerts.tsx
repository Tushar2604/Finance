'use client'

import React from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'

export interface LeakageCheck {
  label: string
  pass: boolean
  severity: 'error' | 'warning' | 'ok'
  message: string
  action?: string
}

interface RevenueLeakageAlertsProps {
  checks: LeakageCheck[]
}

const SEVERITY_STYLES = {
  ok:      { bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'text-emerald-400', msg: 'text-emerald-400/70', Icon: CheckCircle2  },
  warning: { bg: 'bg-amber-500/10 border-amber-500/20',     label: 'text-amber-400',   msg: 'text-amber-400/70',   Icon: AlertTriangle  },
  error:   { bg: 'bg-rose-500/10 border-rose-500/20',       label: 'text-rose-400',    msg: 'text-rose-400/70',    Icon: AlertCircle    },
}

export function RevenueLeakageAlerts({ checks }: RevenueLeakageAlertsProps) {
  const issues = checks.filter(c => !c.pass)
  const passing = checks.filter(c => c.pass)

  return (
    <div className="space-y-2">
      {issues.length === 0 && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-emerald-400 text-sm font-semibold">All revenue controls passing — no leakage detected</p>
        </div>
      )}
      {checks.map((check, i) => {
        const s = SEVERITY_STYLES[check.severity]
        return (
          <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${s.bg}`}>
            <s.Icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.label}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold ${s.label}`}>{check.label}</p>
              <p className={`text-xs mt-0.5 ${s.msg}`}>{check.message}</p>
              {check.action && !check.pass && (
                <p className="text-xs mt-1 text-slate-400 italic">→ {check.action}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
