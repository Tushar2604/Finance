import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient, { PaginatedResponse, SingleResponse } from '@/lib/api'
import { IAlert } from '@/lib/db/models/Alert'

interface AlertFilters {
  page?: number
  limit?: number
  isRead?: boolean
  isResolved?: boolean
  severity?: string
}

export function useAlerts(filters: AlertFilters) {
  return useQuery({
    queryKey: ['alerts', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (typeof filters.isRead === 'boolean') params.append('isRead', filters.isRead.toString())
      if (typeof filters.isResolved === 'boolean') params.append('isResolved', filters.isResolved.toString())
      if (filters.severity) params.append('severity', filters.severity)

      const { data } = await apiClient.get<any>(`/alerts?${params.toString()}`)
      return data.data
    },
  })
}

export function useResolveAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<SingleResponse<IAlert>>(`/alerts/${id}/resolve`)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}
