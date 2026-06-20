import { createCollectionApi } from '../../api/supabase/collections.api.js'
import { toDatabaseRow } from '../../api/supabase/entityMapper.js'
import { APP_CONFIG } from '../../config/app.config.js'
import { authStore } from '../../stores/auth.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'
import { loadWorkspaceData } from './workspaceData.service.js'

const entities = [
  { suffix: 'calendar-collections', table: 'calendar_collections' },
  { suffix: 'events', table: 'events' },
  { suffix: 'ideas', table: 'ideas' },
  { suffix: 'birthdays', table: 'birthdays' },
  { suffix: 'sport-exercises', table: 'sport_exercises' },
  { suffix: 'sport-completions', table: 'sport_completions' },
]

function readCollection(suffix) {
  try {
    const value = JSON.parse(localStorage.getItem(`${APP_CONFIG.storageKey}:${suffix}`) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function normalizeItem(item, suffix, workspaceId, userId) {
  const normalized = { ...item, workspaceId }
  if (suffix === 'events') {
    normalized.memberIds = []
    normalized.responsibleId = ''
    normalized.attendeeResponses = {}
    normalized.comments = (item.comments || []).map((comment) => ({ ...comment, userId }))
    normalized.createdBy = userId
  }
  if (suffix === 'ideas') normalized.authorId = userId
  if (suffix === 'sport-completions') normalized.userId = userId
  return normalized
}

export async function migrateLocalDataToSupabase() {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  const userId = authStore.currentUserId.value
  if (!workspaceId || !userId) return { ok: false, message: 'Сначала выбери пространство' }

  const marker = `${APP_CONFIG.storageKey}:supabase-migrated:${userId}:${workspaceId}`
  const counts = {}

  for (const entity of entities) {
    const items = readCollection(entity.suffix)
      .filter((item) => item.workspaceId === 'space-family' || item.workspaceId === workspaceId)
      .map((item) => normalizeItem(item, entity.suffix, workspaceId, userId))
    counts[entity.suffix] = items.length
    if (!items.length) continue

    const { error } = await createCollectionApi(entity.table).upsert(items.map(toDatabaseRow))
    if (error) return { ok: false, message: `${entity.suffix}: ${error.message}`, counts }
  }

  localStorage.setItem(marker, new Date().toISOString())
  await loadWorkspaceData(workspaceId)
  return {
    ok: true,
    counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
  }
}
