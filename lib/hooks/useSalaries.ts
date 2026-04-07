import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient, { PaginatedResponse, SingleResponse } from '@/lib/api'
import { ISalary } from '@/lib/db/models/Salary'

interface SalaryFilters {
  page?: number
  limit?: number
  employeeId?: string
  month?: string
  paymentStatus?: string
}

export function useSalaries(filters: SalaryFilters) {
  return useQuery({
    queryKey: ['salaries', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.employeeId) params.append('employeeId', filters.employeeId)
      if (filters.month) params.append('month', filters.month)
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus)

      const { data } = await apiClient.get<any>(`/salaries?${params.toString()}`)
      return data.data
    },
  })
}

export function useCreateSalary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<ISalary>) => {
      const { data } = await apiClient.post<SingleResponse<ISalary>>('/salaries', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] })
    },
  })
}
