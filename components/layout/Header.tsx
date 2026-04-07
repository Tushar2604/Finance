'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, LogOut, User, Settings, ChevronRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  projects: 'Projects',
  employees: 'Employees',
  timesheets: 'Timesheets',
  invoices: 'Invoices',
  salaries: 'Salaries',
  expenses: 'Expenses',
  bank: 'Bank Transactions',
  reconciliation: 'Reconciliation',
  reports: 'Reports',
  'ai-insights': 'AI Insights',
  alerts: 'Alerts',
  settings: 'Settings',
}

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.replace(/^\//, '').split('/')
  const crumbs: { label: string; href: string }[] = []
  let path = ''
  for (const seg of segments) {
    path += `/${seg}`
    crumbs.push({
      label: routeLabels[seg] ?? (seg.length === 24 ? 'Detail' : seg),
      href: path,
    })
  }
  return crumbs
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const crumbs = buildBreadcrumbs(pathname)

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
    router.push('/login')
  }

  const pageTitle = crumbs[crumbs.length - 1]?.label ?? 'Dashboard'

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <React.Fragment key={crumb.href}>
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            <span
              className={
                i === crumbs.length - 1
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground hover:text-foreground cursor-pointer transition-colors'
              }
              onClick={() => i < crumbs.length - 1 && router.push(crumb.href)}
            >
              {crumb.label}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" onClick={() => router.push('/alerts')}>
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 hover:bg-accent rounded-lg px-2 py-1.5 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src="" alt={user?.name ?? ''} />
                <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-foreground leading-tight">
                  {user?.name ?? 'User'}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role ?? 'Admin'}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{user?.name ?? 'User'}</p>
                <p className="text-xs text-muted-foreground font-normal capitalize mt-0.5">
                  {user?.role ?? 'Admin'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
