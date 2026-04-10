'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft, Mail, Phone, Globe, Calendar, Building2, FolderKanban,
  TrendingUp, TrendingDown, DollarSign, Clock, CreditCard,
  Briefcase, MapPin, FileText, ShieldCheck, Banknote, Activity,
  CheckCircle2, AlertTriangle, BarChart3, Trash2, Pencil
} from 'lucide-react'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

// ─── Hooks ─────────────────────────────────────────────────────────────────────

function useEmployeeProfile(id: string) {
  return useQuery({
    queryKey: ['employee-profile', id],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/employees/${id}/profile`)
      return data.data
    },
    enabled: !!id,
  })
}

import EmployeeFormModal from '@/components/EmployeeFormModal'
import { useMutation, useQueryClient } from '@tanstack/react-query'

function DeleteConfirm({ name, onConfirm, onCancel, loading }: { name: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl mx-4">
        <div className="w-12 h-12 bg-rose-500/15 rounded-xl flex items-center justify-center mb-4 mx-auto">
          <Trash2 className="w-6 h-6 text-rose-400" />
        </div>
        <h3 className="text-white font-bold text-center text-lg">Delete Employee</h3>
        <p className="text-slate-400 text-sm text-center mt-2">
          Are you sure you want to delete <span className="text-white font-semibold">{name}</span>? This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; dot: string }> = {
  'Active':     { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  'On-Leave':   { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',       dot: 'bg-amber-400'   },
  'Terminated': { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',          dot: 'bg-rose-400'    },
  'Inactive':   { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',       dot: 'bg-slate-400'   },
}

const AVATAR_COLORS = [
  'from-blue-600 to-blue-800', 'from-violet-600 to-violet-800',
  'from-emerald-600 to-emerald-800', 'from-amber-600 to-amber-800',
]
function getAvatarColor(name: string) {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',    label: 'Overview',     icon: Briefcase  },
  { id: 'costing',     label: 'Cost & Margin', icon: BarChart3  },
  { id: 'timesheets',  label: 'Timesheets',   icon: Clock      },
  { id: 'deployment',  label: 'Deployment',   icon: MapPin     },
  { id: 'documents',   label: 'Documents',    icon: FileText   },
  { id: 'bank',        label: 'Bank',         icon: Banknote   },
]

function InfoRow({ label, value, mono, highlight }: {
  label: string; value: string; mono?: boolean; highlight?: 'green' | 'red' | 'amber'
}) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-700/40 last:border-0">
      <dt className="text-slate-400 text-xs">{label}</dt>
      <dd className={[
        'text-sm font-medium',
        mono ? 'font-mono text-xs text-slate-300' : 'text-slate-200',
        highlight === 'green' ? 'text-emerald-400' : '',
        highlight === 'red' ? 'text-rose-400' : '',
        highlight === 'amber' ? 'text-amber-400' : '',
      ].join(' ')}>
        {value}
      </dd>
    </div>
  )
}

function DarkCard({ title, children, accent }: { title?: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className={`bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden ${accent ? `border-t-2 ${accent}` : ''}`}>
      {title && (
        <div className="px-5 py-3.5 border-b border-slate-700/60">
          <h3 className="text-white font-semibold text-sm">{title}</h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

function KpiBox({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <div className={`bg-gradient-to-br ${color} border border-white/10 rounded-2xl p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest">{label}</p>
          <p className="text-white text-xl font-bold mt-1">{value}</p>
          {sub && <p className="text-white/50 text-[10px] mt-0.5">{sub}</p>}
        </div>
        <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-white/80" />
        </div>
      </div>
    </div>
  )
}

// ─── Cost Breakdown Chart ───────────────────────────────────────────────────────

function CostingTab({ profile }: { profile: any }) {
  const emp = profile.employee
  const salary = emp.baseSalary ?? 0
  const revenue = profile.totalRevenueGenerated ?? 0
  const salaryCost = profile.totalSalaryPaid ?? 0
  const profit = profile.profitContribution ?? 0
  const margin = revenue > 0 ? ((profit / revenue) * 100) : 0

  // Build monthly breakdown from timesheets
  const monthlyData = (profile.recentTimesheets ?? []).slice(0, 6).reverse().map((ts: any) => ({
    month: ts.month,
    salary: salary,
    revenue: revenue / Math.max((profile.recentTimesheets ?? []).length, 1),
    margin: margin,
  }))

  const costComponents = [
    { label: 'Base Salary',        amount: salary,         pct: 100,  color: '#3b82f6' },
    { label: 'Employer Benefits',  amount: salary * 0.12,  pct: 12,   color: '#6366f1' },
    { label: 'Overhead Allocation',amount: salary * 0.08,  pct: 8,    color: '#8b5cf6' },
    { label: 'Visa / PRO Cost',    amount: 500,            pct: Math.round(500/salary*100), color: '#a78bfa' },
  ]

  return (
    <div className="space-y-4">
      {/* Margin Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-emerald-400/70 text-[10px] uppercase tracking-wider font-semibold">Revenue</p>
          <p className="text-emerald-300 text-xl font-bold mt-1">AED {revenue.toLocaleString()}</p>
          <p className="text-emerald-500/60 text-[10px] mt-0.5">from client billing</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
          <p className="text-blue-400/70 text-[10px] uppercase tracking-wider font-semibold">Total Cost</p>
          <p className="text-blue-300 text-xl font-bold mt-1">AED {salaryCost.toLocaleString()}</p>
          <p className="text-blue-500/60 text-[10px] mt-0.5">salary paid out</p>
        </div>
        <div className={`${profit >= 0 ? 'bg-emerald-900/20 border-emerald-500/20' : 'bg-rose-900/20 border-rose-500/20'} border rounded-xl p-4`}>
          <p className={`${profit >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'} text-[10px] uppercase tracking-wider font-semibold`}>Net Margin</p>
          <p className={`${profit >= 0 ? 'text-emerald-300' : 'text-rose-300'} text-xl font-bold mt-1`}>{margin.toFixed(1)}%</p>
          <p className={`${profit >= 0 ? 'text-emerald-500/60' : 'text-rose-500/60'} text-[10px] mt-0.5`}>
            {profit >= 0 ? 'profitable' : 'loss-making'}
          </p>
        </div>
      </div>

      {/* Margin Progress */}
      <DarkCard title="Margin Analysis">
        <div className="space-y-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Margin target: 25%</span>
            <span className={margin >= 25 ? 'text-emerald-400' : margin >= 10 ? 'text-amber-400' : 'text-rose-400'}>
              {margin.toFixed(1)}% actual
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${margin >= 25 ? 'bg-emerald-500' : margin >= 10 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(100, Math.max(0, margin))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0%</span>
            <span className="text-amber-500">▲ 25% target</span>
            <span>100%</span>
          </div>
        </div>
      </DarkCard>

      {/* Cost Structure */}
      <DarkCard title="Cost Breakdown">
        <div className="space-y-3">
          {costComponents.map(c => (
            <div key={c.label} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-slate-400 text-xs flex-1">{c.label}</span>
              <span className="text-slate-300 text-xs font-mono">AED {c.amount.toLocaleString()}</span>
              <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden shrink-0">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.pct)}%`, backgroundColor: c.color }} />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-700 mt-2">
            <div className="w-2.5 h-2.5" />
            <span className="text-white text-xs flex-1 font-semibold">Total Monthly Cost</span>
            <span className="text-white text-xs font-bold">AED {(salary * 1.20 + 500).toLocaleString()}</span>
          </div>
        </div>
      </DarkCard>

      {/* Revenue vs Salary Chart */}
      {monthlyData.length > 0 && (
        <DarkCard title="Revenue vs Salary (Last 6 Months)">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={monthlyData} barGap={4}>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} width={50} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="salary" name="Salary" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DarkCard>
      )}
    </div>
  )
}

// ─── Deployment Tab ────────────────────────────────────────────────────────────

function DeploymentTab({ profile }: { profile: any }) {
  const emp = profile.employee
  const projects = profile.projectHistory ?? []
  const currentClient = (emp.assignedClientId as any)?.name
  const currentProject = (emp.assignedProjectId as any)?.name

  return (
    <div className="space-y-4">
      {/* Current Deployment */}
      <DarkCard title="Current Deployment" accent="border-t-blue-500">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1">Assigned Client</p>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-white font-semibold text-sm">{currentClient ?? 'Internal'}</span>
            </div>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1">Assigned Project</p>
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-violet-400" />
              <span className="text-white font-semibold text-sm">{currentProject ?? '—'}</span>
            </div>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1">Utilization Rate</p>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold text-xl">{profile.utilizationRate}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1.5 w-32">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${profile.utilizationRate}%` }} />
            </div>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1">Tenure</p>
            <span className="text-slate-300 font-semibold">{profile.tenure} months</span>
          </div>
        </div>
      </DarkCard>

      {/* Project Timeline */}
      <DarkCard title="Project History Timeline">
        {projects.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No project assignments found</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-700" />
            <div className="space-y-4">
              {projects.map((proj: any, i: number) => (
                <div key={proj._id ?? i} className="flex items-start gap-4 pl-9 relative">
                  <div className={`absolute left-2 mt-0.5 w-3 h-3 rounded-full border-2 shrink-0 ${
                    proj.status === 'Active'
                      ? 'bg-emerald-400 border-emerald-300'
                      : 'bg-slate-600 border-slate-500'
                  }`} />
                  <div className="flex-1 bg-slate-700/40 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-semibold text-sm">{proj.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        proj.status === 'Active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}>{proj.status}</span>
                    </div>
                    <div className="flex gap-3 mt-1.5 text-[10px] text-slate-500">
                      <span>{proj.startDate ? format(new Date(proj.startDate), 'MMM yyyy') : '—'}</span>
                      <span>→</span>
                      <span>{proj.endDate ? format(new Date(proj.endDate), 'MMM yyyy') : 'Present'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DarkCard>
    </div>
  )
}

// ─── Documents Tab ─────────────────────────────────────────────────────────────

function DocumentsTab({ emp }: { emp: any }) {
  const docs = [
    { label: 'Emirates ID',          status: 'Verified',  expiry: '2025-12-01', icon: ShieldCheck },
    { label: 'Passport',             status: 'Verified',  expiry: '2026-06-15', icon: FileText    },
    { label: 'Work Visa',            status: 'Active',    expiry: '2025-08-20', icon: Globe       },
    { label: 'Labour Card',          status: 'Active',    expiry: '2025-08-20', icon: Briefcase   },
    { label: 'WPS Registration',     status: 'Enrolled',  expiry: null,         icon: CheckCircle2 },
    { label: 'Signed P.O',          status: 'Uploaded',  expiry: null,         icon: FileText    },
    { label: 'Work Agreement',       status: 'Pending',   expiry: null,         icon: FileText    },
    { label: 'Health Insurance',     status: 'Active',    expiry: '2025-12-31', icon: ShieldCheck },
  ]

  const STATUS_COLOR: Record<string, string> = {
    Verified:  'text-emerald-400 bg-emerald-500/15 border-emerald-500/25',
    Active:    'text-blue-400 bg-blue-500/15 border-blue-500/25',
    Enrolled:  'text-violet-400 bg-violet-500/15 border-violet-500/25',
    Uploaded:  'text-cyan-400 bg-cyan-500/15 border-cyan-500/25',
    Pending:   'text-amber-400 bg-amber-500/15 border-amber-500/25',
    Expired:   'text-rose-400 bg-rose-500/15 border-rose-500/25',
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {docs.map(doc => {
          const Icon = doc.icon
          const isExpiringSoon = doc.expiry && new Date(doc.expiry) < new Date(Date.now() + 90 * 86400000)
          return (
            <div key={doc.label} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 bg-slate-700/60 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white text-sm font-semibold">{doc.label}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[doc.status] ?? STATUS_COLOR['Pending']}`}>
                    {doc.status}
                  </span>
                </div>
                {doc.expiry && (
                  <p className={`text-[10px] mt-1 ${isExpiringSoon ? 'text-amber-400' : 'text-slate-500'}`}>
                    {isExpiringSoon ? '⚠ ' : ''}Expires {format(new Date(doc.expiry), 'dd MMM yyyy')}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-amber-900/20 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-300 text-sm font-semibold">Compliance Note</p>
          <p className="text-amber-400/70 text-xs mt-0.5">Ensure all documents are renewed before expiry. Work permit renewals must be initiated 60 days in advance per UAE Labour Law.</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteConf, setDeleteConf] = useState(false)

  const { data: profile, isLoading, error } = useEmployeeProfile(id)

  const deleteMutation = useMutation({
    mutationFn: async () => await apiClient.delete(`/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      router.push('/employees')
    }
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 -m-6 p-6 space-y-4">
        <Skeleton className="h-8 w-32 bg-slate-700" />
        <Skeleton className="h-40 w-full rounded-2xl bg-slate-700" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl bg-slate-700" />)}
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-900 -m-6 p-6 space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="bg-rose-900/20 border border-rose-500/20 rounded-xl p-6 text-rose-400">
          Employee profile not found.
        </div>
      </div>
    )
  }

  const emp = profile.employee
  const isProfitable = profile.profitContribution >= 0
  const statusCfg = STATUS_CONFIG[emp.status] ?? STATUS_CONFIG['Inactive']
  const avatarColor = getAvatarColor(emp.name)
  const initials = getInitials(emp.name)

  return (
    <div className="min-h-screen bg-slate-900 -m-6 p-6 space-y-4">
      {editOpen && (
        <EmployeeFormModal
          employee={emp}
          onClose={() => setEditOpen(false)}
          onSuccess={() => { setEditOpen(false); qc.invalidateQueries({ queryKey: ['employee-profile', id] }) }}
        />
      )}
      {deleteConf && (
        <DeleteConfirm
          name={emp.name}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setDeleteConf(false)}
          loading={deleteMutation.isPending}
        />
      )}

      {/* Header controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Employees
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="w-3.5 h-3.5" /> Edit Profile
          </Button>
          <Button variant="outline" size="sm" className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 gap-2" onClick={() => setDeleteConf(true)}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* ── Profile Hero ─────────────────────────────────────── */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600" />
        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center shrink-0 shadow-xl`}>
              <span className="text-white font-bold text-xl">{initials}</span>
            </div>

            {/* Name block */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-white tracking-tight">{emp.name}</h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                  {emp.status}
                </span>
              </div>
              <p className="text-blue-400 text-sm font-medium mt-0.5">{emp.position}</p>

              <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-400">
                {emp.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-500" /> {emp.email}
                  </span>
                )}
                {emp.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-500" /> {emp.phone}
                  </span>
                )}
                {emp.nationality && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-slate-500" /> {emp.nationality}
                  </span>
                )}
                {emp.joiningDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    Joined {format(new Date(emp.joiningDate), 'MMM yyyy')}
                  </span>
                )}
              </div>
            </div>

            {/* Right meta */}
            <div className="shrink-0 text-right space-y-1.5">
              <div className="font-mono text-xs bg-slate-700/60 border border-slate-600/40 px-2.5 py-1 rounded-lg text-slate-300">
                {emp.employeeCode}
              </div>
              {(emp.assignedClientId as any)?.name && (
                <div className="flex items-center justify-end gap-1.5 text-slate-400 text-xs">
                  <Building2 className="h-3 w-3" />
                  <span>{(emp.assignedClientId as any).name}</span>
                </div>
              )}
              {(emp.assignedProjectId as any)?.name && (
                <div className="flex items-center justify-end gap-1.5 text-slate-400 text-xs">
                  <FolderKanban className="h-3 w-3" />
                  <span>{(emp.assignedProjectId as any).name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiBox
          label="Revenue Generated"
          value={`AED ${(profile.totalRevenueGenerated ?? 0).toLocaleString()}`}
          sub={`${profile.tenure} months tenure`}
          icon={DollarSign}
          color="from-emerald-700/50 to-emerald-900/30"
        />
        <KpiBox
          label="Salary Paid"
          value={`AED ${(profile.totalSalaryPaid ?? 0).toLocaleString()}`}
          sub="Cumulative net payout"
          icon={CreditCard}
          color="from-blue-700/50 to-blue-900/30"
        />
        <KpiBox
          label="Profit Contribution"
          value={`AED ${Math.abs(profile.profitContribution ?? 0).toLocaleString()}`}
          sub={isProfitable ? 'Positive margin' : 'Negative margin'}
          icon={isProfitable ? TrendingUp : TrendingDown}
          color={isProfitable ? 'from-indigo-700/50 to-indigo-900/30' : 'from-rose-700/50 to-rose-900/30'}
        />
        <KpiBox
          label="Utilization"
          value={`${profile.utilizationRate ?? 0}%`}
          sub="Approved billed months"
          icon={Activity}
          color="from-amber-700/50 to-amber-900/30"
        />
      </div>

      {/* ── Tab Navigation ───────────────────────────────────── */}
      <div className="flex bg-slate-800/60 border border-slate-700/60 rounded-xl p-1 gap-0.5 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ──────────────────────────────────────── */}

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          <DarkCard title="Personal Details" accent="border-t-blue-500">
            <dl className="space-y-0.5">
              <InfoRow label="Full Name" value={emp.name} />
              <InfoRow label="Employee Code" value={emp.employeeCode} mono />
              <InfoRow label="Position" value={emp.position} />
              <InfoRow label="Email" value={emp.email} />
              <InfoRow label="Phone" value={emp.phone || '—'} />
              <InfoRow label="Nationality" value={emp.nationality || '—'} />
              <InfoRow label="Joining Date" value={emp.joiningDate ? format(new Date(emp.joiningDate), 'dd MMM yyyy') : '—'} />
              <InfoRow label="Tenure" value={`${profile.tenure} months`} />
              <InfoRow label="Status" value={emp.status} />
            </dl>
          </DarkCard>

          <DarkCard title="Compensation & Performance" accent="border-t-emerald-500">
            <dl className="space-y-0.5">
              <InfoRow label="Base Salary" value={`AED ${emp.baseSalary?.toLocaleString()}`} />
              <InfoRow label="Payment Mode" value={emp.paymentMode ?? '—'} />
              <InfoRow label="Total Salary Paid" value={`AED ${profile.totalSalaryPaid?.toLocaleString()}`} />
              <InfoRow label="Revenue Generated" value={`AED ${profile.totalRevenueGenerated?.toLocaleString()}`} />
              <InfoRow
                label="Profit Contribution"
                value={`AED ${Math.abs(profile.profitContribution ?? 0).toLocaleString()}`}
                highlight={isProfitable ? 'green' : 'red'}
              />
              <InfoRow label="Utilization Rate" value={`${profile.utilizationRate}%`} highlight="amber" />
              <InfoRow label="Assigned Client" value={(emp.assignedClientId as any)?.name ?? 'Internal'} />
              <InfoRow label="Assigned Project" value={(emp.assignedProjectId as any)?.name ?? '—'} />
            </dl>
          </DarkCard>
        </div>
      )}

      {/* Costing */}
      {activeTab === 'costing' && <CostingTab profile={profile} />}

      {/* Timesheets */}
      {activeTab === 'timesheets' && (
        <DarkCard title="Recent Timesheets (Last 12 months)">
          {(profile.recentTimesheets ?? []).length === 0 ? (
            <div className="text-center py-10">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No timesheet records found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {profile.recentTimesheets.map((ts: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-colors">
                  <div>
                    <p className="text-white font-semibold text-sm">{ts.month}</p>
                    <p className="text-slate-500 text-xs">{ts.hours}h logged</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    ts.status === 'Approved'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                      : ts.status === 'Rejected'
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                  }`}>
                    {ts.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DarkCard>
      )}

      {/* Deployment */}
      {activeTab === 'deployment' && <DeploymentTab profile={profile} />}

      {/* Documents */}
      {activeTab === 'documents' && <DocumentsTab emp={emp} />}

      {/* Bank */}
      {activeTab === 'bank' && (
        <DarkCard title="Bank Account Details" accent="border-t-slate-500">
          <dl className="space-y-0.5">
            <InfoRow label="Bank Name" value={emp.bankDetails?.bankName || '—'} />
            <InfoRow label="Account Number" value={emp.bankDetails?.accountNumber || '—'} mono />
            <InfoRow label="IBAN" value={emp.bankDetails?.iban || '—'} mono />
            <InfoRow label="Payment Mode" value={emp.paymentMode ?? '—'} />
          </dl>
          {emp.bankDetails?.iban && (
            <div className="mt-4 bg-blue-900/20 border border-blue-500/20 rounded-xl p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <p className="text-blue-300 text-xs">
                IBAN verified: <span className="font-mono font-bold">{emp.bankDetails.iban}</span>
              </p>
            </div>
          )}
        </DarkCard>
      )}
    </div>
  )
}
