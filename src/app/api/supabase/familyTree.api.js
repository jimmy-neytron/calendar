import { requireAuthenticatedSupabase } from './client.js'

export const EMPTY_FAMILY_TREE = { version: 1, people: [], relationships: [], positions: {} }

export const familyTreeApi = {
  async get(workspaceId) {
    const client = await requireAuthenticatedSupabase()
    const { data, error } = await client.from('family_trees').select('document, updated_at').eq('workspace_id', workspaceId).maybeSingle()
    if (error) throw error
    return data ? { ...structuredClone(EMPTY_FAMILY_TREE), ...data.document, updatedAt: data.updated_at } : structuredClone(EMPTY_FAMILY_TREE)
  },
  async save(workspaceId, document) {
    const client = await requireAuthenticatedSupabase()
    const userId = (await client.auth.getUser()).data.user?.id
    const { data, error } = await client.from('family_trees').upsert({ workspace_id: workspaceId, document, updated_by: userId }).select('document, updated_at').single()
    if (error) throw error
    return { ...data.document, updatedAt: data.updated_at }
  },
}