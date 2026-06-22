import { requireAuthenticatedSupabase, requireSupabase } from './client.js'

export async function listActivity({
  workspaceId,
  page = 1,
  pageSize = 15,
  action = 'all',
  userId = 'all',
  query = '',
}) {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  let request = requireSupabase()
    .from('activity_entries')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (action !== 'all') request = request.like('action', `${action}:%`)
  if (userId !== 'all') request = request.eq('actor_id', userId)
  if (query.trim()) request = request.ilike('message', `%${query.trim()}%`)
  return request
}

export async function deleteActivity({ workspaceId, entryIds = null }) {
  const client = await requireAuthenticatedSupabase()
  return client.rpc('delete_workspace_activity', {
    p_workspace_id: workspaceId,
    p_entry_ids: entryIds?.length ? entryIds : null,
  })
}
