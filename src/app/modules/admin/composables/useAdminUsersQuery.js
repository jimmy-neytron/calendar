import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { adminApi } from '../api/admin.api.js'
import { queryKeys } from '../../../query/queryKeys.js'
import { normalizeSubscriptionTier } from '../../../utils/constants/subscriptionConstants.js'

/** Серверное состояние списка пользователей административной панели. */
export function useAdminUsersQuery() {
  const client = useQueryClient()
  const queryKey = queryKeys.admin.users()
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await adminApi.listUsers()
      if (error) throw error
      return (data || []).map(mapAdminUser)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ userId, updates }) => {
      const { data, error } = await adminApi.updateUser(userId, updates)
      if (error) throw error
      return mapAdminUser(data)
    },
    onSuccess: (updated) => {
      client.setQueryData(queryKey, (users = []) => users.map(
        (user) => user.id === updated.id ? updated : user
      ))
    },
  })

  return {
    users: computed(() => query.data.value || []),
    isLoading: query.isPending,
    errorMessage: computed(() => query.error.value?.message || ''),
    refetch: query.refetch,
    savingUserId: computed(() => updateMutation.isPending.value
      ? updateMutation.variables.value?.userId || ''
      : ''),
    updateUser: (userId, updates) => updateMutation.mutateAsync({ userId, updates }),
  }
}

/** Приводит RPC-ответ к единой клиентской модели пользователя. */
export function mapAdminUser(row) {
  const name = row.name || row.email?.split('@')[0] || 'Пользователь'
  return {
    id: row.id,
    email: row.email || '',
    name,
    avatar: row.avatar || name.slice(0, 1).toUpperCase(),
    color: row.color || '#60a5fa',
    subscriptionTier: normalizeSubscriptionTier(row.subscription_tier),
    workspaceLimit: Number(row.workspace_limit || 0),
    role: row.role || 'user',
    isActive: row.is_active !== false,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  }
}
