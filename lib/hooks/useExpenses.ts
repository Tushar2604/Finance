import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient, { PaginatedResponse, SingleResponse } from '@/lib/api'
import { IExpense } from '@/lib/db/models/Expense'

interface ExpenseFilters {
  page?: number
  limit?: number
  projectId?: string
  employeeId?: string
  status?: string
}

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.projectId) params.append('projectId', filters.projectId)
      if (filters.employeeId) params.append('employeeId', filters.employeeId)
      if (filters.status) params.append('status', filters.status)

      const { data } = await apiClient.get<any>(`/expenses?${params.toString()}`)
      return data.data
    },
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<IExpense>) => {
      const { data } = await apiClient.post<SingleResponse<IExpense>>('/expenses', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
