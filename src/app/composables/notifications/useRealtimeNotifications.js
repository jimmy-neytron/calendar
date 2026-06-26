import { supabase } from '../../api/supabase/client.js'
import { authStore } from '../../stores/auth.store.js'
import { notificationStore } from '../../stores/notification.store.js'

let channel = null

export function useRealtimeNotifications() {
  async function start() {
    const userId = authStore.currentUserId.value
    if (!supabase || !userId || channel) return

    channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, ({ new: row }) => {
        notificationStore.ingestRemoteRow(row)
      })
      .subscribe()
  }

  async function stop() {
    if (!channel || !supabase) return
    await supabase.removeChannel(channel)
    channel = null
  }

  return { start, stop }
}
