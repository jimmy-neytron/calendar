import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { releaseNotesApi } from '../../api/supabase/releaseNotes.api.js'
import { queryKeys } from '../../query/queryKeys.js'

/** Возвращает опубликованную историю релизов из общего Query-кэша. */
export function useReleaseNotesQuery() {
  const query = useQuery({
    queryKey: queryKeys.releaseNotes(),
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await releaseNotesApi.list()
      if (error) throw error
      return data || []
    },
  })

  return {
    releases: computed(() => query.data.value || []),
    loading: query.isPending,
    error: computed(() => query.error.value ? 'Не удалось загрузить историю обновлений' : ''),
    refetch: query.refetch,
  }
}
