import { requireSupabase } from '../../../api/supabase/client.js'

export const integrationsApi = {
  getTelegramIntegration() {
    return requireSupabase().rpc('get_my_telegram_integration')
  },

  createTelegramLinkCode() {
    return requireSupabase().rpc('create_telegram_link_code')
  },

  setTelegramDigestEnabled(enabled) {
    return requireSupabase().rpc('set_telegram_digest_enabled', {
      next_enabled: enabled,
    })
  },

  disconnectTelegram() {
    return requireSupabase().rpc('disconnect_telegram')
  },
}
