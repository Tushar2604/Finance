import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'

const BASE_URL =
  (typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000') + '/api'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// ─── Request interceptor: inject Authorization header ─────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('bim_token')
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`
      }
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

// ─── Response interceptor: handle 401 ────────────────────────────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bim_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ─── Typed helpers ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface SingleResponse<T> {
  success: true
  data: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  details?: Record<string, string[]>
}

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined
    return data?.error ?? error.message ?? 'An unexpected error occurred'
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}

export default apiClient
