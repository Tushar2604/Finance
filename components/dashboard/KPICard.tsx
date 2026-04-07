import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string
  subValue?: string
  trend: 'up' | 'down' | 'neutral'
  trendValue: number
  icon: React.ElementType
  color: 'blue' | 'red' | 'orange' | 'green'
}

const colorMap = {
  blue: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    trendUp: 'text-green-600',
    trendDown: 'text-red-500',
  },
  red: {
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    trendUp: 'text-red-500',
    trendDown: 'text-green-600',
  },
  orange: {
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    trendUp: 'text-red-500',
    trendDown: 'text-green-600',
  },
  green: {
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    trendUp: 'text-green-600',
    trendDown: 'text-red-500',
  },
}

export function KPICard({ title, value, subValue, trend, trendValue, icon: Icon, color }: KPICardProps) {
  const colors = colorMap[color]
  const trendColor =
    trend === 'neutral'
      ? 'text-muted-foreground'
      : trend === 'up'
      ? colors.trendUp
      : colors.trendDown

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1 tracking-tight">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
            )}
          </div>
          <div className={cn('p-2.5 rounded-xl shrink-0', colors.iconBg)}>
            <Icon className={cn('w-5 h-5', colors.iconColor)} />
          </div>
        </div>

        {/* Trend */}
        <div className={cn('flex items-center gap-1 mt-3 text-sm', trendColor)}>
          {trend === 'up' ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : trend === 'down' ? (
            <TrendingDown className="w-3.5 h-3.5" />
          ) : (
            <Minus className="w-3.5 h-3.5" />
          )}
          <span className="font-medium">
            {trendValue > 0 ? '+' : ''}{trendValue}%
          </span>
          <span className="text-muted-foreground text-xs">vs last month</span>
        </div>
      </CardContent>
    </Card>
  )
}
