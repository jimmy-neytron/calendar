import { requireSupabase } from './client.js'

export function createCollectionApi(table) {
  return {
    list(workspaceId) {
      return requireSupabase().from(table).select('*').eq('workspace_id', workspaceId)
    },
    create(payload) {
      return requireSupabase().from(table).insert(payload)
    },
    update(id, payload) {
      return requireSupabase().from(table).update(payload).eq('id', id)
    },
    remove(id) {
      return requireSupabase().from(table).delete().eq('id', id)
    },
    upsert(items) {
      return requireSupabase().from(table).upsert(items, { onConflict: 'id' })
    },
  }
}
