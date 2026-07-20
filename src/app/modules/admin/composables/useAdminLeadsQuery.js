import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { adminApi } from '../api/admin.api.js'
import { queryKeys } from '../../../query/queryKeys.js'

/** Список заявок лендинга и мутация отметки о просмотре. */
export function useAdminLeadsQuery() {
  const client = useQueryClient()
  const queryKey = queryKeys.admin.leads()
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await adminApi.listLeads()
      if (error) throw error
      return (data || []).map(mapLead)
    },
  })
  const mutation = useMutation({
    mutationFn: async (leadId) => {
      const { data, error } = await adminApi.markLeadViewed(leadId)
      if (error) throw error
      return mapLead(data)
    },
    onSuccess: (updated) => client.setQueryData(queryKey, (leads = []) => leads.map(
      (lead) => lead.id === updated.id ? updated : lead
    )),
  })

  return {
    leads: computed(() => query.data.value || []),
    isLoading: query.isPending,
    errorMessage: computed(() => query.error.value?.message || ''),
    savingLeadId: computed(() => mutation.isPending.value ? mutation.variables.value || '' : ''),
    markViewed: mutation.mutateAsync,
    refetch: query.refetch,
  }
}

function mapLead(row) {
  return {
    id: row.id,
    formName: row.form_name || 'landing',
    name: row.name || '',
    contact: row.contact || '',
    message: row.message || '',
    source: row.source || 'landing',
    userAgent: row.user_agent || '',
    createdAt: row.created_at || '',
    viewedAt: row.viewed_at || '',
  }
}
