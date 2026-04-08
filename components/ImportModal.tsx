'use client'

/**
 * ImportModal — Universal CSV import component.
 *
 * Props:
 *  open        - controlled open state
 *  onClose     - called when modal should close
 *  entityLabel - human-readable name ("Clients", "Employees" …)
 *  apiEndpoint - e.g. "/api/clients/import"
 *  columns     - ordered column definitions with display name and CSV key
 *  onSuccess   - callback after a successful import (e.g. refetch data)
 *  templateRows - optional example rows for the downloadable template
 */

import React, { useRef, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UploadCloud, Download, CheckCircle2, AlertTriangle, X, FileText, Loader2 } from 'lucide-react'
import apiClient from '@/lib/api'
import { exportToCSV } from '@/lib/export'

export interface ImportColumn {
  key: string       // CSV header key (must match exactly what API expects)
  label: string     // display label for UI
  required?: boolean
}

interface ImportResult {
  inserted: number
  updated: number
  skipped: number
}

interface ImportModalProps {
  open: boolean
  onClose: () => void
  entityLabel: string
  apiEndpoint: string
  columns: ImportColumn[]
  onSuccess?: () => void
  templateRows?: Record<string, string>[]
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  // Parse headers (strip BOM, trim, lowercase for matching)
  const rawHeaders = lines[0].split(',').map(h => h.replace(/^\uFEFF/, '').trim())

  return lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    rawHeaders.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  }).filter(row => Object.values(row).some(v => v !== ''))
}

export default function ImportModal({
  open, onClose, entityLabel, apiEndpoint, columns, onSuccess, templateRows,
}: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const reset = () => {
    setRows([])
    setFileName('')
    setResult(null)
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const loadFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file')
      return
    }
    setFileName(file.name)
    setResult(null)
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setError('No valid rows found in file. Check that the CSV has a header row and data rows.')
      } else {
        setRows(parsed)
      }
    }
    reader.readAsText(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }, [])

  const handleImport = async () => {
    if (!rows.length) return
    setImporting(true)
    setError(null)
    try {
      const { data } = await apiClient.post<any>(apiEndpoint, { rows })
      if (data.success) {
        setResult(data.data)
        setRows([])
        setFileName('')
        onSuccess?.()
      } else {
        setError(data.message ?? 'Import failed')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Import failed. Please check your data and try again.')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = templateRows && templateRows.length > 0
      ? templateRows
      : [Object.fromEntries(columns.map(c => [c.key, c.required ? `example_${c.key}` : '']))]
    exportToCSV(template as Record<string, unknown>[], `${entityLabel.toLowerCase().replace(/\s/g, '_')}_template`)
  }

  const PREVIEW_LIMIT = 5

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UploadCloud className="h-5 w-5 text-blue-600" />
            Import {entityLabel}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk-import {entityLabel.toLowerCase()}. Existing records are updated, new ones are added — no duplicates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Template download */}
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <p className="text-sm font-medium text-blue-800">Need a template?</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Required columns: {columns.filter(c => c.required).map(c => c.label).join(', ')}
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" /> Download Template
            </Button>
          </div>

          {/* Column reference */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">CSV Column Reference</p>
            <div className="flex flex-wrap gap-1.5">
              {columns.map(col => (
                <span key={col.key} className={`text-xs px-2 py-1 rounded-md font-mono ${col.required ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-600'}`}>
                  {col.key}{col.required && <span className="ml-0.5 text-red-500">*</span>}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">* required field</p>
          </div>

          {/* Drop zone */}
          {!rows.length && !result && (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <UploadCloud className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-700">Drop your CSV here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">Only .csv files are supported</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <Badge variant="secondary">{rows.length} rows</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={reset} className="h-7 w-7 p-0 text-slate-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="rounded-md border overflow-auto max-h-56">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      {columns.map(col => (
                        <TableHead key={col.key} className="text-xs whitespace-nowrap">
                          {col.label}{col.required && <span className="text-red-400 ml-0.5">*</span>}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, PREVIEW_LIMIT).map((row, i) => (
                      <TableRow key={i}>
                        {columns.map(col => (
                          <TableCell key={col.key} className="text-xs py-1.5 max-w-[120px] truncate" title={row[col.key]}>
                            {row[col.key] || <span className="text-slate-300">—</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > PREVIEW_LIMIT && (
                <p className="text-xs text-muted-foreground mt-1.5 text-right">
                  Showing {PREVIEW_LIMIT} of {rows.length} rows. All rows will be imported.
                </p>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={reset}>Cancel</Button>
                <Button onClick={handleImport} disabled={importing} className="gap-2">
                  {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</> : <><UploadCloud className="h-4 w-4" /> Import {rows.length} Rows</>}
                </Button>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Import Successful!</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'New Records', value: result.inserted, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  { label: 'Updated', value: result.updated, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { label: 'Skipped', value: result.skipped, color: 'bg-slate-50 text-slate-600 border-slate-200' },
                ].map(stat => (
                  <div key={stat.label} className={`border rounded-lg p-4 text-center ${stat.color}`}>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs font-medium mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-1">
                <p className="text-xs text-muted-foreground">Skipped rows had missing required fields.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={reset}>Import More</Button>
                  <Button onClick={handleClose}>Done</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
