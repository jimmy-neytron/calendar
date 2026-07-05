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

  getUserDetail(userId) {
    return requireSupabase().rpc('admin_get_user_detail', {
      target_user_id: userId,
    })
  },

  setUserModalOverride(userId, modalId) {
    return requireSupabase().rpc('admin_set_user_modal_override', {
      target_user_id: userId,
      next_modal_id: modalId || null,
    })
  },

  listLeads() {
    return requireSupabase().rpc('admin_list_landing_leads')
  },

  countUnreadLeads() {
    return requireSupabase().rpc('admin_unread_landing_leads_count')
  },

  getOverviewMetrics() {
    return requireSupabase().rpc('admin_get_overview_metrics')
  },

  listModals() {
    return requireSupabase().rpc('admin_list_modals')
  },

  saveModal(modal) {
    return requireSupabase().rpc('admin_save_modal', {
      modal_id: modal.id || null,
      next_title: modal.title,
      next_content_html: modal.contentHtml,
      next_buttons: modal.buttons || [],
      next_is_active: modal.isActive || false,
      next_display_mode: modal.displayMode || 'always',
      next_modal_type: modal.modalType || 'notice',
      next_is_blocking: modal.isBlocking || false,
      next_audience: modal.audience || { mode: 'all', userIds: [], emails: [], roles: [], tiers: [] },
    })
  },

  setModalActive(modalId, isActive) {
    return requireSupabase().rpc('admin_set_modal_active', {
      modal_id: modalId,
      next_is_active: isActive,
    })
  },

  deleteModal(modalId) {
    return requireSupabase().rpc('admin_delete_modal', { modal_id: modalId })
  },

  getActiveModal() {
    return requireSupabase().rpc('get_active_admin_modal')
  },

  markLeadViewed(leadId) {
    return requireSupabase().rpc('admin_mark_landing_lead_viewed', { lead_id: leadId })
  },
}
