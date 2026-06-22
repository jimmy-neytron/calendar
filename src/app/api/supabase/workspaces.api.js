import { requireSupabase } from './client.js'

export const workspacesApi = {
  list() {
    return requireSupabase().rpc('get_my_workspaces')
  },

  ensure(defaultName = 'Моё пространство') {
    return requireSupabase().rpc('ensure_my_workspace', { default_name: defaultName })
  },

  create(name) {
    return requireSupabase().rpc('create_workspace', { workspace_name: name })
  },

  getBackendStatus() {
    return requireSupabase().rpc('get_backend_status')
  },

  update(id, updates) {
    return requireSupabase().from('workspaces').update(updates).eq('id', id).select('id').single()
  },

  remove(id) {
    return requireSupabase().rpc('delete_workspace', { p_workspace_id: id })
  },

  listInvites(workspaceId) {
    return requireSupabase().from('workspace_invites').select('*').eq('workspace_id', workspaceId)
  },

  createInvite(payload) {
    return requireSupabase().from('workspace_invites').insert(payload).select().single()
  },

  acceptInvite(code) {
    return requireSupabase().rpc('accept_workspace_invite', { invite_code: code })
  },

  updateMemberRole(workspaceId, userId, role) {
    return requireSupabase()
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
  },

  removeMember(workspaceId, userId) {
    return requireSupabase()
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
  },
}
