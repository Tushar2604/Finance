import { useQuery } from '@tanstack/react-query'
import apiClient, { SingleResponse } from '@/lib/api'

export interface DashboardMetrics {
  totalRevenue: number
  totalCosts: number
  netProfit: number
  profitMargin: number
  activeEmployees: number
  outstandingInvoices: number
  monthlyRevenue: number[]
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<SingleResponse<DashboardMetrics>>('/dashboard')
      return data.data
    },
    staleTime: 5 * 60 * 1000, // 5 mins
  })
}
