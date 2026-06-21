import { requireAuthenticatedSupabase } from './client.js'

export function createCollectionApi(table) {
  return {
    async list(workspaceId) {
      const client = await requireAuthenticatedSupabase()
      return client.from(table).select('*').eq('workspace_id', workspaceId)
    },
    async create(payload) {
      const client = await requireAuthenticatedSupabase()
      return client.from(table).insert(payload)
    },
    async update(id, payload) {
      const client = await requireAuthenticatedSupabase()
      return client.from(table).update(payload).eq('id', id)
    },
    async remove(id) {
      const client = await requireAuthenticatedSupabase()
      return client.from(table).delete().eq('id', id)
    },
    async upsert(items) {
      const client = await requireAuthenticatedSupabase()
      return client.from(table).upsert(items, { onConflict: 'id' })
    },
  }
}
