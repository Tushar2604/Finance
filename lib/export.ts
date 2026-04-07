/**
 * CSV export utility — works in any browser environment.
 * Call exportToCSV(rows, filename) with an array of plain objects.
 */
export function exportToCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows || rows.length === 0) return

  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return ''
    const str = String(v).replace(/"/g, '""')
    return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str
  }

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
