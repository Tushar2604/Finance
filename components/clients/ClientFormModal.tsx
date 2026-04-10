'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Building2 } from 'lucide-react'
import apiClient from '@/lib/api'

export default function ClientFormModal({ client, onClose, onSuccess }: { client?: any, onClose: () => void, onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '',
    industry: '',
    website: '',
    contractType: 'None',
    rateCard: 0,
    billingType: 'Monthly',
    creditTerms: 30,
    isActive: true,
    email: '',
    phone: '',
    address: '',
    taxNumber: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name || '',
        industry: client.industry || '',
        website: client.website || '',
        contractType: client.contractType || 'None',
        rateCard: client.rateCard || 0,
        billingType: client.billingType || 'Monthly',
        creditTerms: client.creditTerms || 30,
        isActive: client.isActive ?? true,
        email: client.companyDetails?.email || '',
        phone: client.companyDetails?.phone || '',
        address: client.companyDetails?.address || '',
        taxNumber: client.companyDetails?.taxNumber || ''
      })
    }
  }, [client])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        industry: form.industry,
        website: form.website,
        contractType: form.contractType,
        rateCard: form.rateCard,
        billingType: form.billingType,
        creditTerms: form.creditTerms,
        isActive: form.isActive,
        companyDetails: {
          email: form.email,
          phone: form.phone,
          address: form.address,
          taxNumber: form.taxNumber
        }
      }
      if (client?._id) {
        await apiClient.put(`/clients/${client._id}`, payload)
      } else {
        await apiClient.post('/clients', payload)
      }
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save client')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-800 text-lg">{client ? 'Edit Client' : 'Add Client'}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {error && <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Client Name *</label>
              <Input required className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Corp" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Industry</label>
              <Input className="mt-1" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="Technology" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</label>
              <Input type="email" className="mt-1" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@acme.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone</label>
              <Input className="mt-1" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 890" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Address</label>
              <Input className="mt-1" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Business Blvd" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Website</label>
              <Input className="mt-1" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://acme.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tax Number (TRN)</label>
              <Input className="mt-1" value={form.taxNumber} onChange={e => setForm(f => ({ ...f, taxNumber: e.target.value }))} placeholder="TRN123456789" />
            </div>

            <div className="col-span-2 border-t pt-4 mt-2">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Billing & Contract</h3>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Contract Type</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={form.contractType} onChange={e => setForm(f => ({ ...f, contractType: e.target.value }))}>
                <option>None</option>
                <option>Retainer</option>
                <option>LPO</option>
                <option>Project-based</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Billing Type</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={form.billingType} onChange={e => setForm(f => ({ ...f, billingType: e.target.value }))}>
                <option>Monthly</option>
                <option>Weekly</option>
                <option>Milestone</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Rate Card (AED/hr)</label>
              <Input type="number" className="mt-1" value={form.rateCard} onChange={e => setForm(f => ({ ...f, rateCard: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Credit Terms (Days)</label>
              <Input type="number" className="mt-1" value={form.creditTerms} onChange={e => setForm(f => ({ ...f, creditTerms: Number(e.target.value) }))} />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active Client</label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            {loading ? 'Saving...' : 'Save Client'}
          </Button>
        </div>
      </form>
    </div>
  )
}
