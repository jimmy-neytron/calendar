import { requireAuthenticatedSupabase } from './client.js'

const DEFAULT_FEATURES = {
  budget_enabled: true,
}

export const workspaceFeaturesApi = {
  async get(workspaceId) {
    const client = await requireAuthenticatedSupabase()
    const result = await client
      .from('workspace_features')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (result.error) return result
    if (result.data) return result
    return this.upsert(workspaceId, DEFAULT_FEATURES)
  },

  async upsert(workspaceId, features) {
    const client = await requireAuthenticatedSupabase()
    return client
      .from('workspace_features')
      .upsert({
        workspace_id: workspaceId,
        ...features,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' })
      .select('*')
      .single()
  },
}
