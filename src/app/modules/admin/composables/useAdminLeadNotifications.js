import { computed, ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { adminApi } from '../api/admin.api.js'
import { authStore } from '../../../stores/auth.store.js'
import { queryKeys } from '../../../query/queryKeys.js'

/**
 * Счётчик непросмотренных заявок администратора.
 *
 * Query объединяет запросы от layout, sidebar и admin-страниц в один кэш.
 * Polling включается только пока он нужен хотя бы активному сценарию.
 */
export function useAdminLeadNotifications() {
  const client = useQueryClient()
  const pollingEnabled = ref(false)
  const queryKey = queryKeys.admin.unreadLeads()
  const query = useQuery({
    queryKey,
    enabled: computed(() => authStore.isAdmin.value && pollingEnabled.value),
    refetchInterval: computed(() => pollingEnabled.value ? 45_000 : false),
    queryFn: async () => {
      const { data, error } = await adminApi.countUnreadLeads()
      if (error) throw error
      return Math.max(0, Number(data || 0))
    },
  })

  const unreadLeadCount = computed(() => Number(query.data.value || 0))

  async function loadUnreadLeadCount() {
    if (!authStore.isAdmin.value) return
    return query.refetch()
  }

  function setUnreadLeadCount(value) {
    client.setQueryData(queryKey, Math.max(0, Number(value || 0)))
  }

  function startUnreadLeadPolling() {
    if (!authStore.isAdmin.value) return
    pollingEnabled.value = true
  }

  function stopUnreadLeadPolling() {
    pollingEnabled.value = false
  }

  return {
    unreadLeadCount,
    unreadLeadCountLoading: query.isFetching,
    loadUnreadLeadCount,
    setUnreadLeadCount,
    startUnreadLeadPolling,
    stopUnreadLeadPolling,
  }
}
