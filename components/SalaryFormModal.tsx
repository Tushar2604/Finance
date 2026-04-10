'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Banknote } from 'lucide-react'
import apiClient from '@/lib/api'

export default function SalaryFormModal({ salary, onClose, onSuccess }: { salary?: any, onClose: () => void, onSuccess: () => void }) {
  const [form, setForm] = useState({
    employeeId: '',
    month: '',
    baseSalary: 0,
    accommodationAllowance: 0,
    transportAllowance: 0,
    foodAllowance: 0,
    overtimePay: 0,
    deductions: 0,
    status: 'Pending'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (salary) {
      setForm({
        employeeId: salary.employeeId?._id || salary.employeeId || '',
        month: salary.month || '',
        baseSalary: salary.baseSalary || 0,
        accommodationAllowance: salary.allowances?.housing || salary.accommodationAllowance || 0,
        transportAllowance: salary.allowances?.transport || salary.transportAllowance || 0,
        foodAllowance: salary.allowances?.food || salary.foodAllowance || 0,
        overtimePay: salary.overtimePay || 0,
        deductions: salary.deductions?.total || salary.deductions || 0,
        status: salary.status || 'Pending'
      })
    }
  }, [salary])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        allowances: {
          housing: form.accommodationAllowance,
          transport: form.transportAllowance,
          food: form.foodAllowance
        },
        deductions: {
          total: form.deductions
        }
      }
      
      if (salary?._id) {
        await apiClient.put(`/salaries/${salary._id}`, payload)
      } else {
        await apiClient.post('/salaries', payload)
      }
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save salary record')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b bg-emerald-50/50">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-800 text-lg">{salary ? 'Edit Salary' : 'Add Salary'}</h2>
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
              <Input required className="mt-1" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} placeholder="e.g. 64b3c9a..." disabled={!!salary} />
              {!salary && <p className="text-[10px] text-slate-500 mt-1">Must be the system Mongo ID of the employee.</p>}
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Month / Year *</label>
              <Input required type="month" className="mt-1" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
            </div>
            
            <div className="col-span-2 border-t pt-2 mt-2">
              <h3 className="text-sm font-bold text-slate-800 mb-2">Compensation Items</h3>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Base Salary</label>
              <Input type="number" className="mt-1" value={form.baseSalary} onChange={e => setForm(f => ({ ...f, baseSalary: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Overtime Pay</label>
              <Input type="number" className="mt-1" value={form.overtimePay} onChange={e => setForm(f => ({ ...f, overtimePay: Number(e.target.value) }))} />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Housing Allowance</label>
              <Input type="number" className="mt-1" value={form.accommodationAllowance} onChange={e => setForm(f => ({ ...f, accommodationAllowance: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Transport Allowance</label>
              <Input type="number" className="mt-1" value={form.transportAllowance} onChange={e => setForm(f => ({ ...f, transportAllowance: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Food Allowance</label>
              <Input type="number" className="mt-1" value={form.foodAllowance} onChange={e => setForm(f => ({ ...f, foodAllowance: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Deductions</label>
              <Input type="number" className="mt-1 bg-red-50" value={form.deductions} onChange={e => setForm(f => ({ ...f, deductions: Number(e.target.value) }))} />
            </div>

            <div className="col-span-2 mt-2 border-t pt-4">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Payment Status</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            {loading ? 'Saving...' : 'Save Salary'}
          </Button>
        </div>
      </form>
    </div>
  )
}
