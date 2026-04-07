import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'

// ─── Classnames ──────────────────────────────────────────────────────────────

/**
 * Merge Tailwind CSS classes safely, resolving conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ─── Currency ────────────────────────────────────────────────────────────────

/**
 * Format a number as currency.
 * Defaults to AED (UAE Dirham).
 */
export function formatCurrency(
  amount: number,
  currency: string = 'AED',
  locale: string = 'en-AE'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a number with thousands separators, no currency symbol.
 */
export function formatNumber(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/**
 * Format a date to a human-readable string.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'dd MMM yyyy')
  } catch {
    return '—'
  }
}

/**
 * Format a date to short form.
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'MM/dd/yyyy')
  } catch {
    return '—'
  }
}

/**
 * Format a month string (YYYY-MM) to a readable label.
 */
export function formatMonth(month: string): string {
  try {
    return format(parseISO(`${month}-01`), 'MMMM yyyy')
  } catch {
    return month
  }
}

/**
 * Get the start and end Date objects for a YYYY-MM month string.
 */
export function getMonthRange(month: string): { start: Date; end: Date } {
  const date = parseISO(`${month}-01`)
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  }
}

/**
 * Get the current month in YYYY-MM format.
 */
export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

// ─── Invoice Number ──────────────────────────────────────────────────────────

/**
 * Generate a unique invoice number in the format INV-YYYY-XXXXX.
 * Uses the current year and a random 5-digit number.
 */
export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(10000 + Math.random() * 90000) // 5 digits
  return `INV-${year}-${random}`
}

// ─── VAT ─────────────────────────────────────────────────────────────────────

/**
 * Calculate VAT and total amount.
 * UAE standard VAT rate is 5%.
 */
export function calculateVAT(
  amount: number,
  rate: number = 0.05
): { vatAmount: number; totalWithVAT: number } {
  const vatAmount = parseFloat((amount * rate).toFixed(2))
  const totalWithVAT = parseFloat((amount + vatAmount).toFixed(2))
  return { vatAmount, totalWithVAT }
}

// ─── Pagination ──────────────────────────────────────────────────────────────

/**
 * Compute skip/limit values for Mongoose queries.
 */
export function paginate(
  page: number = 1,
  limit: number = 20
): { skip: number; limit: number } {
  const safePage = Math.max(1, Math.floor(page))
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)))
  return {
    skip: (safePage - 1) * safeLimit,
    limit: safeLimit,
  }
}

/**
 * Build pagination metadata for API responses.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
} {
  const totalPages = Math.ceil(total / limit)
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
  message?: string
}

export interface ApiError {
  success: false
  error: string
  details?: Record<string, string[]>
}

export function apiSuccess<T>(data: T, message?: string): ApiSuccess<T> {
  return { success: true, data, ...(message ? { message } : {}) }
}

export function apiError(error: string, details?: Record<string, string[]>): ApiError {
  return { success: false, error, ...(details ? { details } : {}) }
}

// ─── String Helpers ──────────────────────────────────────────────────────────

/**
 * Truncate a string to a maximum length, appending ellipsis if needed.
 */
export function truncate(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength - 3)}...`
}

/**
 * Capitalise the first letter of each word.
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Generate a slug from a string.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// ─── Number Helpers ──────────────────────────────────────────────────────────

/**
 * Safely parse a float, returning 0 for invalid values.
 */
export function safeParseFloat(value: unknown): number {
  const parsed = parseFloat(String(value))
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Round to a specified number of decimal places.
 */
export function roundTo(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * Calculate percentage change between two values.
 */
export function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return roundTo(((current - previous) / Math.abs(previous)) * 100, 1)
}

// ─── Employee Code Generator ─────────────────────────────────────────────────

/**
 * Generate an employee code from name and a sequence number.
 * Format: BIM-EMP-XXXXX
 */
export function generateEmployeeCode(sequence: number): string {
  const paddedSeq = String(sequence).padStart(5, '0')
  return `BIM-EMP-${paddedSeq}`
}
