import { requireSupabase } from './client.js'

export interface SidebarPreferencesRow {
  user_id: string
  visible_section_ids: string[]
  section_order: string[]
  mobile_favorite_ids: string[]
}

export const sidebarPreferencesApi = {
  get(userId: string) {
    return requireSupabase()
      .from('user_sidebar_preferences')
      .select('user_id, visible_section_ids, section_order, mobile_favorite_ids')
      .eq('user_id', userId)
      .maybeSingle()
  },

  upsert(preferences: SidebarPreferencesRow) {
    return requireSupabase()
      .from('user_sidebar_preferences')
      .upsert({ ...preferences, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select('user_id, visible_section_ids, section_order, mobile_favorite_ids')
      .single()
  },
}
