'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  ShieldCheck,
  Bell,
  Settings,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  Check,
  Plus,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

// Demo companies — in production this would come from an API / user context
const COMPANIES = [
  { id: 'bim-uae', name: 'BIM Staffing UAE', country: 'UAE' },
  { id: 'bim-ksa', name: 'BIM Staffing KSA', country: 'KSA' },
  { id: 'bim-qat', name: 'BIM Qatar Office', country: 'Qatar' },
]

interface NavLink {
  type: 'link'
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

type NavFlatChild = { type?: 'link'; label: string; href: string }
type NavSubgroupChild = { type: 'subgroup'; label: string; basePath: string; children: { label: string; href: string }[] }
type NavChild = NavFlatChild | NavSubgroupChild

interface NavGroup {
  type: 'group'
  label: string
  icon: React.ElementType
  basePath: string
  children: NavChild[]
}

type NavItem = NavLink | NavGroup

const navItems: NavItem[] = [
  { type: 'link', label: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    type: 'group',
    label: 'Clients',
    icon: Building2,
    basePath: '/clients',
    children: [
      { label: 'All Clients', href: '/clients' },
      {
        type: 'subgroup',
        label: 'Type of Agreement',
        basePath: '/clients/agreement',
        children: [
          { label: 'LPO', href: '/clients/lpo' },
          { label: 'Contract', href: '/clients/contract' },
        ],
      },
      { label: 'Payment History', href: '/clients/payments' },
    ],
  },
  { type: 'link', label: 'Projects', href: '/projects', icon: FolderKanban },
  { type: 'link', label: 'Employees', href: '/employees', icon: Users },
  { type: 'link', label: 'Deployments', href: '/deployments', icon: UserCheck },
  { type: 'link', label: 'Timesheets', href: '/timesheets', icon: Clock },
  {
    type: 'group',
    label: 'Invoices',
    icon: FileText,
    basePath: '/invoices',
    children: [
      { label: 'Client Invoice', href: '/invoices/client' },
      { label: 'Employee Invoice', href: '/invoices/employee' },
      { label: 'VAT', href: '/invoices/vat' },
      { label: 'Payment Tracking', href: '/invoices/payment-tracking' },
    ],
  },
  { type: 'link', label: 'Salaries', href: '/salaries', icon: Wallet },
  { type: 'link', label: 'Expenses', href: '/expenses', icon: Receipt },
  { type: 'link', label: 'Bank', href: '/bank', icon: Landmark },
  {
    type: 'group',
    label: 'Reconciliation',
    icon: GitMerge,
    basePath: '/reconciliation',
    children: [
      { label: 'Bank Ledger',             href: '/reconciliation/bank-ledger'    },
      { label: 'System Records',          href: '/reconciliation/system-records'  },
      { label: 'AI Suggested Matches',    href: '/reconciliation/ai-suggested'    },
      { label: 'Side-by-Side Workbench',  href: '/reconciliation/workbench'       },
    ],
  },
  { type: 'link', label: 'Reports', href: '/reports', icon: BarChart3 },
  { type: 'link', label: 'AI Insights', href: '/ai-insights', icon: Brain },
  { type: 'link', label: 'Payment Audit', href: '/payment-audit', icon: ShieldCheck },
  { type: 'link', label: 'Alerts', href: '/alerts', icon: Bell, badge: 3 },
  { type: 'link', label: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [companyOpen, setCompanyOpen] = useState(false)
  const [activeCompany, setActiveCompany] = useState(COMPANIES[0])

  // Track open state for top-level groups and nested subgroups by their basePath key
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [openSubgroups, setOpenSubgroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (basePath: string) =>
    setOpenGroups(prev => ({ ...prev, [basePath]: !prev[basePath] }))

  const toggleSubgroup = (basePath: string) =>
    setOpenSubgroups(prev => ({ ...prev, [basePath]: !prev[basePath] }))

  // Auto-expand groups and subgroups based on current route
  useEffect(() => {
    navItems.forEach(item => {
      if (item.type === 'group' && pathname.startsWith(item.basePath)) {
        setOpenGroups(prev => ({ ...prev, [item.basePath]: true }))
        // Also auto-expand any matching subgroup (check child hrefs, not just basePath)
        item.children.forEach(child => {
          if (child.type === 'subgroup') {
            const hasActiveChild = child.children.some(leaf => pathname === leaf.href || pathname.startsWith(leaf.href + '/'))
            if (hasActiveChild) {
              setOpenSubgroups(prev => ({ ...prev, [child.basePath]: true }))
            }
          }
        })
      }
    })
  }, [pathname])
  const companyRef = useRef<HTMLDivElement>(null)

  const [user, setUser] = useState<{ name: string; role: string } | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bim_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {
      // ignore parse errors
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setCompanyOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

      {/* Company Switcher */}
      {!collapsed && (
        <div ref={companyRef} className="px-3 pt-3 pb-2 border-b border-slate-700/50 shrink-0 relative">
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold mb-1.5 px-1">Company</p>
          <button
            onClick={() => setCompanyOpen((o) => !o)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-left"
          >
            <div className="w-6 h-6 rounded-md bg-blue-600/30 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{activeCompany.name}</p>
              <p className="text-slate-400 text-[10px]">{activeCompany.country}</p>
            </div>
            <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform', companyOpen && 'rotate-180')} />
          </button>

          {/* Dropdown */}
          {companyOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-1">
                {COMPANIES.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => { setActiveCompany(company); setCompanyOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="w-5 h-5 rounded bg-slate-600 flex items-center justify-center shrink-0">
                      <Building2 className="w-3 h-3 text-slate-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{company.name}</p>
                      <p className="text-slate-400 text-[10px]">{company.country}</p>
                    </div>
                    {company.id === activeCompany.id && (
                      <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-700 p-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-700 transition-colors text-slate-400 hover:text-white text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  Add Company
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed company indicator */}
      {collapsed && (
        <div className="flex justify-center py-2 border-b border-slate-700/50">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center" title={activeCompany.name}>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-hide">
        {navItems.map((item) => {
          if (item.type === 'group') {
            const isGroupActive = pathname.startsWith(item.basePath)
            const Icon = item.icon
            const isOpen = !!openGroups[item.basePath]

            return (
              <div key={item.basePath}>
                {/* Group parent button */}
                <button
                  onClick={() => toggleGroup(item.basePath)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative',
                    isGroupActive
                      ? 'bg-blue-600/20 text-blue-300'
                      : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', isGroupActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white')} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate text-left">{item.label}</span>
                      <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-200', isGroupActive ? 'text-blue-400' : 'text-slate-500', isOpen && 'rotate-180')} />
                    </>
                  )}
                </button>

                {/* Children panel */}
                {!collapsed && (
                  <div className={cn('overflow-hidden transition-all duration-200 ease-in-out', isOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0')}>
                    <div className="ml-3 mt-0.5 border-l border-slate-700/60 pl-3 space-y-0.5 pb-1">
                      {item.children.map((child) => {
                        // Nested subgroup (e.g. "Type of Agreement")
                        if (child.type === 'subgroup') {
                          const isSubActive = pathname.startsWith(child.basePath)
                          const isSubOpen = !!openSubgroups[child.basePath]
                          return (
                            <div key={child.basePath}>
                              <button
                                onClick={() => toggleSubgroup(child.basePath)}
                                className={cn(
                                  'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-all duration-150',
                                  isSubActive ? 'text-blue-300' : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
                                )}
                              >
                                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isSubActive ? 'bg-blue-400' : 'bg-slate-600')} />
                                <span className="flex-1 text-left">{child.label}</span>
                                <ChevronDown className={cn('w-3 h-3 shrink-0 transition-transform duration-200', isSubOpen && 'rotate-180')} />
                              </button>
                              {/* Subgroup children */}
                              <div className={cn('overflow-hidden transition-all duration-200 ease-in-out', isSubOpen ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0')}>
                                <div className="ml-3 border-l border-slate-700/40 pl-3 space-y-0.5 pb-1 pt-0.5">
                                  {child.children.map((leaf) => {
                                    const isLeafActive = pathname === leaf.href
                                    return (
                                      <Link
                                        key={leaf.href}
                                        href={leaf.href}
                                        className={cn(
                                          'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                                          isLeafActive ? 'bg-blue-600/90 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
                                        )}
                                      >
                                        <span className={cn('w-1 h-1 rounded-full shrink-0', isLeafActive ? 'bg-white' : 'bg-slate-600')} />
                                        {leaf.label}
                                      </Link>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )
                        }

                        // Flat link child
                        const isChildActive = pathname === child.href
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-all duration-150',
                              isChildActive ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
                            )}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isChildActive ? 'bg-white' : 'bg-slate-600')} />
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          }

          // Regular link
          const isActive =
            item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/')
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
