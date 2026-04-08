import { useQuery } from '@tanstack/react-query'
import apiClient, { SingleResponse } from '@/lib/api'

export interface MonthlySnapshot {
  month: string
  label: string
  revenue: number
  salary: number
  expenses: number
  profit: number
  profitPct: number
}

export interface DashboardMetrics {
  totalRevenue: number
  totalCosts: number
  netProfit: number
  profitMargin: number
  currentMonth: string
  currentRevenue: number
  currentSalary: number
  currentExpenses: number
  currentProfit: number
  currentProfitPct: number
  outstandingAmount: number
  outstandingCount: number
  overdueAmount: number
  overdueCount: number
  activeEmployees: number
  totalEmployees: number
  monthlySnapshots: MonthlySnapshot[]
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<SingleResponse<DashboardMetrics>>('/dashboard')
      return data.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
