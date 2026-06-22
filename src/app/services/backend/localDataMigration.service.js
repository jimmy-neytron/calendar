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
  { suffix: 'movie-watchlist', table: 'movie_watchlist' },
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
  if (suffix === 'sport-exercises') {
    normalized.id = withUserSuffix(item.id, userId)
    normalized.userId = userId
  }
  if (suffix === 'sport-completions') {
    normalized.id = withUserSuffix(item.id, userId)
    normalized.exerciseId = withUserSuffix(item.exerciseId, userId)
    normalized.userId = userId
  }
  return normalized
}

function withUserSuffix(id, userId) {
  const value = String(id || '')
  const suffix = `:${userId}`
  return value.endsWith(suffix) ? value : `${value}${suffix}`
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

    const rows = entity.suffix === 'movie-watchlist'
      ? items.map(toMovieWatchlistRow)
      : items.map(toDatabaseRow)
    const { error } = await createCollectionApi(entity.table).upsert(rows)
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

function toMovieWatchlistRow(movie) {
  return {
    id: `${movie.workspaceId}:${movie.mediaType}:${movie.id}`,
    workspace_id: movie.workspaceId,
    tmdb_id: movie.id,
    media_type: movie.mediaType,
    title: movie.title,
    original_title: movie.originalTitle || '',
    overview: movie.overview || '',
    poster_path: movie.posterPath || '',
    backdrop_path: movie.backdropPath || '',
    release_date: movie.releaseDate || null,
    vote_average: Number(movie.voteAverage || 0),
    vote_count: Number(movie.voteCount || 0),
    popularity: Number(movie.popularity || 0),
    genre_ids: movie.genreIds || [],
    planned_event_id: movie.plannedEventId || null,
    added_at: movie.addedAt || new Date().toISOString(),
  }
}
