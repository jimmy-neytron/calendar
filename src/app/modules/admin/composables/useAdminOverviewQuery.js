import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { adminApi } from '../api/admin.api.js'
import { queryKeys } from '../../../query/queryKeys.js'

/** Агрегированные серверные метрики административной панели. */
export function useAdminOverviewQuery() {
  const query = useQuery({
    queryKey: queryKeys.admin.overview(),
    queryFn: async () => {
      const { data, error } = await adminApi.getOverviewMetrics()
      if (error) throw error
      return mapMetrics(Array.isArray(data) ? data[0] : data)
    },
  })
  return {
    metrics: query.data,
    isLoading: query.isPending,
    errorMessage: computed(() => query.error.value?.message || ''),
    refetch: query.refetch,
  }
}

function mapMetrics(row) {
  return {
    totalUsers: Number(row?.total_users || 0),
    activeUsers: Number(row?.active_users || 0),
    blockedUsers: Number(row?.blocked_users || 0),
    adminUsers: Number(row?.admin_users || 0),
    totalEvents: Number(row?.total_events || 0),
    totalLeads: Number(row?.total_leads || 0),
    unreadLeads: Number(row?.unread_leads || 0),
    viewedLeads: Number(row?.viewed_leads || 0),
  }
}
