import { computed, unref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { familyTreeApi } from '../../api/supabase/familyTree.api.js'
import { queryKeys } from '../../query/queryKeys.js'

/** Серверное состояние JSON-документа семейного дерева. */
export function useFamilyTree(workspaceId) {
  const client = useQueryClient()
  const queryKey = computed(() => queryKeys.familyTree(unref(workspaceId)))
  const query = useQuery({
    queryKey,
    queryFn: () => familyTreeApi.get(unref(workspaceId)),
    enabled: computed(() => Boolean(unref(workspaceId))),
  })

  const mutation = useMutation({
    mutationFn: ({ targetWorkspaceId, document }) => (
      familyTreeApi.save(targetWorkspaceId, document)
    ),
    onSuccess: (data, variables) => {
      client.setQueryData(queryKeys.familyTree(variables.targetWorkspaceId), data)
    },
  })

  return {
    ...query,
    save: (document) => mutation.mutateAsync({
      targetWorkspaceId: unref(workspaceId),
      document,
    }),
    isSaving: mutation.isPending,
  }
}