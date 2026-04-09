import React from 'react'

interface DarkCardProps {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  accent?: string  // tailwind border-top color e.g. 'border-t-blue-500'
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function DarkCard({ title, subtitle, action, accent, children, className = '', noPadding }: DarkCardProps) {
  return (
    <div className={`bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden ${accent ? `border-t-2 ${accent}` : ''} ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/60">
          <div>
            {title && <h3 className="text-white font-semibold text-sm">{title}</h3>}
            {subtitle && <p className="text-slate-500 text-[10px] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  )
}
