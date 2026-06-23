import { requireAuthenticatedSupabase, requireSupabase } from './client.js'
import { readActivityLogSetting } from '../../composables/preferences/useActivityLogSettings.js'

export async function listActivity({
  workspaceId,
  page = 1,
  pageSize = 15,
  action = 'all',
  userId = 'all',
  query = '',
}) {
  if (!readActivityLogSetting()) return { data: [], count: 0, error: null }
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
  if (!readActivityLogSetting()) return { data: 0, error: null }
  const client = await requireAuthenticatedSupabase()
  return client.rpc('delete_workspace_activity', {
    p_workspace_id: workspaceId,
    p_entry_ids: entryIds?.length ? entryIds : null,
  })
}
