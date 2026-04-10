import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient, { SingleResponse } from '@/lib/api'

interface BankFilters {
  page?: number
  limit?: number
  matchStatus?: string
  transactionType?: string
  description?: string
  dateFrom?: string
  dateTo?: string
}

export function useBankTransactions(filters: BankFilters) {
  return useQuery({
    queryKey: ['bank-transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.matchStatus) params.append('matchStatus', filters.matchStatus)
      if (filters.transactionType) params.append('transactionType', filters.transactionType)
      if (filters.description) params.append('description', filters.description)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)

      const { data } = await apiClient.get<any>(`/bank?${params.toString()}`)
      return data.data
    },
  })
}

export function useUploadBankStatement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await apiClient.post<SingleResponse<{ batchId: string; count: number }>>('/bank/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
