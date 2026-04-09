'use client'

import React from 'react'
import { Search, X, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface FilterBarOption { label: string; value: string }

export interface FilterBarProps {
  search?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string

  dateFrom?: string
  dateTo?: string
  onDateFromChange?: (v: string) => void
  onDateToChange?: (v: string) => void

  statusOptions?: FilterBarOption[]
  status?: string
  onStatusChange?: (v: string) => void

  extraSelects?: {
    key: string
    label: string
    value: string
    options: FilterBarOption[]
    onChange: (v: string) => void
  }[]

  onClear?: () => void
  hasActiveFilters?: boolean
}

export default function FilterBar({
  search, onSearchChange, searchPlaceholder = 'Search…',
  dateFrom, dateTo, onDateFromChange, onDateToChange,
  statusOptions, status, onStatusChange,
  extraSelects,
  onClear, hasActiveFilters,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
      {/* Search */}
      {onSearchChange && (
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search ?? ''}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 h-8 text-sm bg-white"
          />
        </div>
      )}

      {/* Date range */}
      {(onDateFromChange || onDateToChange) && (
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={dateFrom ?? ''}
            onChange={e => onDateFromChange?.(e.target.value)}
            className="h-8 text-sm w-36 bg-white"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo ?? ''}
            onChange={e => onDateToChange?.(e.target.value)}
            className="h-8 text-sm w-36 bg-white"
          />
        </div>
      )}

      {/* Status */}
      {statusOptions && onStatusChange && (
        <select
          value={status ?? ''}
          onChange={e => onStatusChange(e.target.value)}
          className="h-8 border border-input rounded-md px-2 text-sm bg-white text-slate-700"
        >
          <option value="">All Statuses</option>
          {statusOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {/* Extra selects */}
      {extraSelects?.map(sel => (
        <select
          key={sel.key}
          value={sel.value}
          onChange={e => sel.onChange(e.target.value)}
          className="h-8 border border-input rounded-md px-2 text-sm bg-white text-slate-700"
        >
          <option value="">{sel.label}</option>
          {sel.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}

      {/* Clear */}
      {hasActiveFilters && onClear && (
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" onClick={onClear}>
          <X className="h-3 w-3" /> Clear
        </Button>
      )}
    </div>
  )
}
