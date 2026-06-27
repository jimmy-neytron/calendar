import { requireAuthenticatedSupabase } from './client.js'

const DEFAULT_FEATURES = {
    budget_enabled: false,
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

        return {
            data: {
                workspace_id: workspaceId,
                ...DEFAULT_FEATURES,
            },
            error: null,
        }
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