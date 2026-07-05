import { requireSupabase } from './client.js'

export const adminApi = {
  listUsers() {
    return requireSupabase().rpc('admin_list_profiles')
  },

  updateUser(userId, updates) {
    return requireSupabase().rpc('admin_update_profile', {
      target_user_id: userId,
      next_subscription_tier: updates.subscriptionTier ?? null,
      next_is_active: updates.isActive ?? null,
      next_role: updates.role ?? null,
    })
  },
}
