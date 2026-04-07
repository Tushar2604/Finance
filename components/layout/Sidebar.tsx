'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Users,
  Clock,
  FileText,
  Wallet,
  Receipt,
  Landmark,
  GitMerge,
  BarChart3,
  Brain,
  Bell,
  Settings,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Building2 },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Employees', href: '/employees', icon: Users },
  { label: 'Timesheets', href: '/timesheets', icon: Clock },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Salaries', href: '/salaries', icon: Wallet },
  { label: 'Expenses', href: '/expenses', icon: Receipt },
  { label: 'Bank', href: '/bank', icon: Landmark },
  { label: 'Reconciliation', href: '/reconciliation', icon: GitMerge },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'AI Insights', href: '/ai-insights', icon: Brain },
  { label: 'Alerts', href: '/alerts', icon: Bell, badge: 3 },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Get user from localStorage (deferred to client-side to avoid hydration mismatch)
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bim_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {
      // ignore parse errors
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('bim_token')
    localStorage.removeItem('bim_user')
    document.cookie = 'bim_token=; path=/; max-age=0'
    window.location.href = '/login'
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700/50 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-md">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-sm leading-tight block">BIM Finance</span>
              <span className="text-slate-400 text-xs">v2.0</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto shadow-md">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors',
            collapsed && 'hidden'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Collapsed expand button */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="absolute -right-3 top-20 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 transition-colors z-50"
        >
          <ChevronRight className="w-3 h-3 text-white" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 scrollbar-hide">
        {navItems.map((item) => {
          const isActive =
            (item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/'))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative',
                isActive
                  ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0',
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                )}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 min-w-[20px] px-1.5 text-xs flex items-center justify-center"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
              {collapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-700/50 p-3 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600/30 rounded-full flex items-center justify-center shrink-0">
              <span className="text-blue-300 text-sm font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name ?? 'User'}</p>
              <Badge
                variant="secondary"
                className="mt-0.5 text-xs h-4 bg-slate-700 text-slate-300 border-0 px-1.5"
              >
                {user?.role ?? 'Admin'}
              </Badge>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-md transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  )
}
