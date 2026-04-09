'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X, User, Briefcase, Banknote, FileText, MapPin } from 'lucide-react'
import apiClient from '@/lib/api'

interface EmployeeFormModalProps {
  onClose: () => void
  onSuccess: () => void
}

const SECTIONS = [
  { id: 'general',   label: 'General Info',     icon: User },
  { id: 'position',  label: 'Position & Deal',  icon: Briefcase },
  { id: 'location',  label: 'Location & Visa',  icon: MapPin },
  { id: 'bank',      label: 'Bank Details',     icon: Banknote },
  { id: 'documents', label: 'Documents',        icon: FileText },
]

const EMPTY_FORM = {
  // General
  name: '', email: '', phone: '', nationality: '', status: 'Active',
  joiningDate: '', endDate: '',
  // Position
  position: '', department: '', baseSalary: '', paymentMode: 'Bank',
  enableWeeklyTimesheet: 'No', description: '',
  // Location
  countryOfService: '', cityOfService: '', staffingType: 'Permanent',
  mobilizationAddress: '', mobilizationMap: '',
  // Bank
  bankName: '', accountNumber: '', iban: '',
  // Documents (URLs / filenames — real upload needs storage)
  signedPOFile: '', internalWorkAgreementFile: '',
}

type FormState = typeof EMPTY_FORM

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export default function EmployeeFormModal({ onClose, onSuccess }: EmployeeFormModalProps) {
  const [activeSection, setActiveSection] = useState('general')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof FormState) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.position || !form.baseSalary) {
      setError('Name, Email, Position, and Base Salary are required.'); return
    }
    setSaving(true); setError('')
    try {
      await apiClient.post('/employees', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        nationality: form.nationality,
        status: form.status,
        joiningDate: form.joiningDate || undefined,
        position: form.position,
        baseSalary: Number(form.baseSalary),
        paymentMode: form.paymentMode,
        bankDetails: { bankName: form.bankName, accountNumber: form.accountNumber, iban: form.iban },
      })
      onSuccess()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err?.response?.data?.error ?? 'Failed to save employee')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <User className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Add New Employee</h2>
              <p className="text-xs text-muted-foreground">Fill all sections then click Save</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b shrink-0 overflow-x-auto">
          {SECTIONS.map(s => {
            const Icon = s.icon
            const active = activeSection === s.id
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'border-amber-500 text-amber-700 bg-amber-50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── General Info ─────────────────────────────────── */}
          {activeSection === 'general' && (
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full Name" required>
                  <Input value={form.name} onChange={e => set('name')(e.target.value)} placeholder="John Smith" />
                </Field>
                <Field label="Email Address" required>
                  <Input type="email" value={form.email} onChange={e => set('email')(e.target.value)} placeholder="john@company.ae" />
                </Field>
                <Field label="Phone">
                  <Input value={form.phone} onChange={e => set('phone')(e.target.value)} placeholder="+971 50 123 4567" />
                </Field>
                <Field label="Nationality">
                  <Input value={form.nationality} onChange={e => set('nationality')(e.target.value)} placeholder="Indian" />
                </Field>
                <Field label="Joining Date">
                  <Input type="date" value={form.joiningDate} onChange={e => set('joiningDate')(e.target.value)} />
                </Field>
                <Field label="Contract End Date">
                  <Input type="date" value={form.endDate} onChange={e => set('endDate')(e.target.value)} />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={set('status')} options={['Active', 'Inactive', 'On Leave', 'Terminated']} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Position & Deal ──────────────────────────────── */}
          {activeSection === 'position' && (
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest">Position Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Position / Job Title" required>
                  <Input value={form.position} onChange={e => set('position')(e.target.value)} placeholder="Senior Software Engineer" />
                </Field>
                <Field label="Department">
                  <Input value={form.department} onChange={e => set('department')(e.target.value)} placeholder="IT" />
                </Field>
                <Field label="Enable Weekly Timesheet">
                  <Select value={form.enableWeeklyTimesheet} onChange={set('enableWeeklyTimesheet')} options={['No', 'Yes']} />
                </Field>
                <Field label="Payment Mode">
                  <Select value={form.paymentMode} onChange={set('paymentMode')} options={['Bank', 'Cash', 'Cheque', 'WPS']} />
                </Field>
              </div>

              <div className="h-px bg-slate-100" />
              <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest">Deal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Base Salary (AED)" required>
                  <Input type="number" value={form.baseSalary} onChange={e => set('baseSalary')(e.target.value)} placeholder="15000" />
                </Field>
                <div />
                {form.baseSalary && (
                  <>
                    <div className="bg-slate-50 border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">VAT Applicable %</p>
                      <p className="font-semibold text-sm">0% (Employee salaries exempt)</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Net Monthly Pay</p>
                      <p className="font-bold text-emerald-700">AED {Number(form.baseSalary).toLocaleString()}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="h-px bg-slate-100" />
              <Field label="Description / Notes">
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm resize-none h-20"
                  value={form.description}
                  onChange={e => set('description')(e.target.value)}
                  placeholder="Role overview, responsibilities, special conditions…"
                />
              </Field>
            </div>
          )}

          {/* ── Location & Visa ──────────────────────────────── */}
          {activeSection === 'location' && (
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest">General Information (As per P.O)</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Country of Rendering Service" required>
                  <Input value={form.countryOfService} onChange={e => set('countryOfService')(e.target.value)} placeholder="UAE" />
                </Field>
                <Field label="City of Rendering Service" required>
                  <Input value={form.cityOfService} onChange={e => set('cityOfService')(e.target.value)} placeholder="Dubai" />
                </Field>
                <Field label="Staffing Type" required>
                  <Select value={form.staffingType} onChange={set('staffingType')} options={['Permanent', 'Contract', 'Freelance', 'Secondment']} />
                </Field>
                <Field label="Mobilization Address in Detail">
                  <Input value={form.mobilizationAddress} onChange={e => set('mobilizationAddress')(e.target.value)} placeholder="Office 1204, Tower A, Business Bay" />
                </Field>
                <Field label="Mobilization Location Map (URL)">
                  <Input value={form.mobilizationMap} onChange={e => set('mobilizationMap')(e.target.value)} placeholder="https://maps.google.com/…" />
                </Field>
              </div>
            </div>
          )}

          {/* ── Bank Details ─────────────────────────────────── */}
          {activeSection === 'bank' && (
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest">Bank Account Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Bank Name">
                  <Input value={form.bankName} onChange={e => set('bankName')(e.target.value)} placeholder="Emirates NBD" />
                </Field>
                <Field label="Account Number">
                  <Input value={form.accountNumber} onChange={e => set('accountNumber')(e.target.value)} placeholder="0001234567" />
                </Field>
                <Field label="IBAN">
                  <Input value={form.iban} onChange={e => set('iban')(e.target.value.toUpperCase())} placeholder="AE070331234567890123456" className="font-mono" />
                </Field>
                <Field label="Payment Mode">
                  <Select value={form.paymentMode} onChange={set('paymentMode')} options={['Bank', 'WPS', 'Cash', 'Cheque']} />
                </Field>
              </div>
              {form.iban && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <Badge variant="outline" className="text-blue-700 border-blue-300 font-mono text-xs">{form.iban}</Badge>
                  <span className="text-xs text-blue-600">IBAN entered</span>
                </div>
              )}
            </div>
          )}

          {/* ── Documents ────────────────────────────────────── */}
          {activeSection === 'documents' && (
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest">Document Attachments</h3>
              <p className="text-xs text-muted-foreground">Upload links or identifiers for documents stored in your file system / DMS.</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Signed P.O">
                  <div className="flex gap-2">
                    <Input value={form.signedPOFile} onChange={e => set('signedPOFile')(e.target.value)} placeholder="File path or URL" className="flex-1" />
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center px-3 py-2 text-xs border rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 whitespace-nowrap">
                        Choose File
                      </span>
                    </label>
                  </div>
                </Field>
                <Field label="Internal Work Agreement">
                  <div className="flex gap-2">
                    <Input value={form.internalWorkAgreementFile} onChange={e => set('internalWorkAgreementFile')(e.target.value)} placeholder="File path or URL" className="flex-1" />
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center px-3 py-2 text-xs border rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 whitespace-nowrap">
                        Choose File
                      </span>
                    </label>
                  </div>
                </Field>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
                <strong>It is MANDATORY to upload a signed LPO</strong> and Internal Work Agreement before employee mobilisation.
              </div>
            </div>
          )}

          {/* Section nav hint */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            <button
              onClick={() => {
                const idx = SECTIONS.findIndex(s => s.id === activeSection)
                if (idx > 0) setActiveSection(SECTIONS[idx - 1].id)
              }}
              className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-30"
              disabled={activeSection === SECTIONS[0].id}
            >
              ← Previous section
            </button>
            <button
              onClick={() => {
                const idx = SECTIONS.findIndex(s => s.id === activeSection)
                if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id)
              }}
              className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-30"
              disabled={activeSection === SECTIONS[SECTIONS.length - 1].id}
            >
              Next section →
            </button>
          </div>
        </div>

        {/* Footer */}
        {error && (
          <div className="mx-6 mb-0 mt-1 px-4 py-2 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">{error}</div>
        )}
        <div className="flex justify-between items-center px-6 py-4 border-t shrink-0 bg-slate-50 rounded-b-2xl">
          <div className="flex gap-1">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-2 h-2 rounded-full transition-colors ${activeSection === s.id ? 'bg-amber-500' : 'bg-slate-300'}`}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {saving ? 'Saving…' : 'Save Employee'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
