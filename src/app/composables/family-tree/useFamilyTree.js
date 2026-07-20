import { computed, unref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { familyTreeApi } from '../../api/supabase/familyTree.api.js'

export function useFamilyTree(workspaceId) {
  const client = useQueryClient()
  const queryKey = computed(() => ['family-tree', unref(workspaceId)])
  const query = useQuery({ queryKey, queryFn: () => familyTreeApi.get(unref(workspaceId)), enabled: computed(() => Boolean(unref(workspaceId))) })
  const mutation = useMutation({
    mutationFn: (document) => familyTreeApi.save(unref(workspaceId), document),
    onSuccess: (data) => client.setQueryData(queryKey.value, data),
  })
  return { ...query, save: mutation.mutateAsync, isSaving: mutation.isPending }
}