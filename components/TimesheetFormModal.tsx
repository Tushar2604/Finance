'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Clock } from 'lucide-react'
import apiClient from '@/lib/api'

export default function TimesheetFormModal({ timesheet, onClose, onSuccess }: { timesheet?: any, onClose: () => void, onSuccess: () => void }) {
  // Simplistic timesheet form
  const [form, setForm] = useState({
    employeeId: '',
    month: '',
    totalRequiredHours: 0,
    normalServedHours: 0,
    totalOTHours: 0,
    totalServedHours: 0,
    totalServedDays: 0,
    totalLeave: 0,
    status: 'Pending'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (timesheet) {
      setForm({
        employeeId: timesheet.employeeId?._id || timesheet.employeeId || '',
        month: timesheet.month || '',
        totalRequiredHours: timesheet.totalRequiredHours || 0,
        normalServedHours: timesheet.normalServedHours || timesheet.hours || 0,
        totalOTHours: timesheet.totalOTHours || timesheet.overtimeHours || 0,
        totalServedHours: timesheet.totalServedHours || 0,
        totalServedDays: timesheet.totalServedDays || timesheet.workingDays || 0,
        totalLeave: timesheet.totalLeave || 0,
        status: timesheet.hrApprovalStatus || timesheet.status || 'Pending'
      })
    }
  }, [timesheet])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (timesheet?._id) {
        await apiClient.put(`/timesheets/${timesheet._id}`, form)
      } else {
        await apiClient.post('/timesheets', form)
      }
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save timesheet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" />
            <h2 className="font-bold text-slate-800 text-lg">{timesheet ? 'Edit Timesheet' : 'Log Timesheet'}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {error && <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Employee ID (Mongo ID) *</label>
              <Input required className="mt-1" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} placeholder="e.g. 64b3c9a..." disabled={!!timesheet} />
              {!timesheet && <p className="text-[10px] text-slate-500 mt-1">Must be the system Mongo ID of the employee for a manual log.</p>}
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Month / Year *</label>
              <Input required type="month" className="mt-1" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Required Hours</label>
              <Input type="number" className="mt-1" value={form.totalRequiredHours} onChange={e => setForm(f => ({ ...f, totalRequiredHours: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Normal Served Hrs</label>
              <Input type="number" className="mt-1" value={form.normalServedHours} onChange={e => setForm(f => ({ ...f, normalServedHours: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Overtime (OT) Hrs</label>
              <Input type="number" className="mt-1" value={form.totalOTHours} onChange={e => setForm(f => ({ ...f, totalOTHours: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Served Hrs</label>
              <Input type="number" className="mt-1" value={form.totalServedHours} onChange={e => setForm(f => ({ ...f, totalServedHours: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Served Days</label>
              <Input type="number" className="mt-1" value={form.totalServedDays} onChange={e => setForm(f => ({ ...f, totalServedDays: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Leave</label>
              <Input type="number" className="mt-1" value={form.totalLeave} onChange={e => setForm(f => ({ ...f, totalLeave: Number(e.target.value) }))} />
            </div>
            
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">HR Status</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="Pending">Pending</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
            {loading ? 'Saving...' : 'Save Timesheet'}
          </Button>
        </div>
      </form>
    </div>
  )
}
