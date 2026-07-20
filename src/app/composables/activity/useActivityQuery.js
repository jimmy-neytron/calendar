import { computed, unref } from 'vue'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { deleteActivity, listActivity } from '../../api/supabase/activity.api.js'
import { queryKeys } from '../../query/queryKeys.js'

/**
 * Серверное состояние журнала активности.
 *
 * Параметры передаются как refs/computed, поэтому смена страницы, workspace или
 * применённых фильтров автоматически выбирает правильную запись Query-кэша.
 */
export function useActivityQuery({ workspaceId, page, pageSize, filters }) {
  const client = useQueryClient()
  const normalizedParams = computed(() => ({
    page: Number(unref(page) || 1),
    pageSize: Number(unref(pageSize) || 15),
    action: unref(filters)?.action || 'all',
    userId: unref(filters)?.userId || 'all',
    query: unref(filters)?.query || '',
  }))
  const queryKey = computed(() => queryKeys.activity.list(unref(workspaceId), normalizedParams.value))

  const query = useQuery({
    queryKey,
    enabled: computed(() => Boolean(unref(workspaceId))),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const result = await listActivity({
        workspaceId: unref(workspaceId),
        ...normalizedParams.value,
      })
      if (result.error) throw result.error
      return {
        entries: (result.data || []).map(mapActivityEntry),
        total: Number(result.count || 0),
      }
    },
  })

  const removeMutation = useMutation({
    mutationFn: (entryIds) => deleteActivity({
      workspaceId: unref(workspaceId),
      entryIds,
    }).then((result) => {
      if (result.error) throw result.error
      return result.data
    }),
    onSuccess: () => client.invalidateQueries({
      queryKey: queryKeys.activity.workspace(unref(workspaceId)),
    }),
  })

  return {
    entries: computed(() => query.data.value?.entries || []),
    total: computed(() => query.data.value?.total || 0),
    loading: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    removeActivity: removeMutation.mutateAsync,
    deleting: removeMutation.isPending,
  }
}

/** Приводит строку Supabase к модели отображения журнала. */
function mapActivityEntry(row) {
  return {
    id: row.id,
    action: row.action,
    text: row.message,
    userId: row.actor_id,
    userName: row.metadata?.userName || 'Пользователь',
    createdAt: row.created_at,
  }
}
