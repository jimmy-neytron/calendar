import { computed } from 'vue'
import { createCollectionApi } from '../api/supabase/collections.api.js'
import { APP_CONFIG } from '../config/app.config.js'
import { useLocalStorage } from '../composables/storage/useLocalStorage.js'
import type { MovieMedia, WatchlistMovie } from '../types/movie'
import { calendarStore } from './calendar.store.js'
import { calendarCollectionStore } from './calendarCollection.store.js'
import { workspaceStore } from './workspace.store.js'

const { state: savedMovies } = useLocalStorage(
  `${APP_CONFIG.storageKey}:movie-watchlist`,
  [] as WatchlistMovie[],
)
const api = createCollectionApi('movie_watchlist')

const watchlist = computed(() => savedMovies.value
  .filter((movie) => movie.workspaceId === workspaceStore.activeWorkspaceId.value)
  .sort((first, second) => second.addedAt.localeCompare(first.addedAt)))

function getKey(movie: Pick<MovieMedia, 'id' | 'mediaType'>): string {
  return `${movie.mediaType}:${movie.id}`
}

function isSaved(movie: Pick<MovieMedia, 'id' | 'mediaType'>): boolean {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  return savedMovies.value.some((item) => (
    item.workspaceId === workspaceId && getKey(item) === getKey(movie)
  ))
}

async function add(movie: MovieMedia) {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId) return { ok: false, message: 'Пространство не выбрано' }
  if (isSaved(movie)) return { ok: true, movie: getSaved(movie) }
  const savedMovie: WatchlistMovie = {
    ...movie,
    workspaceId,
    addedAt: new Date().toISOString(),
    plannedEventId: '',
  }
  try {
    const { error } = await api.create(toDatabaseRow(savedMovie))
    if (error) return { ok: false, message: getDatabaseMessage(error) }
    savedMovies.value = [...savedMovies.value, savedMovie]
    return { ok: true, movie: savedMovie }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) }
  }
}

async function remove(movie: Pick<MovieMedia, 'id' | 'mediaType'>) {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId) return { ok: false, message: 'Пространство не выбрано' }
  const saved = getSaved(movie)
  if (!saved) return { ok: true }
  try {
    const { error } = await api.remove(getRecordId(workspaceId, movie))
    if (error) return { ok: false, message: getDatabaseMessage(error) }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) }
  }
  savedMovies.value = savedMovies.value.filter((item) => !(
    item.workspaceId === workspaceId && getKey(item) === getKey(movie)
  ))
  return { ok: true }
}

function getSaved(movie: Pick<MovieMedia, 'id' | 'mediaType'>): WatchlistMovie | undefined {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  return savedMovies.value.find((item) => item.workspaceId === workspaceId && getKey(item) === getKey(movie))
}

function isPlanned(movie: Pick<MovieMedia, 'id' | 'mediaType'>): boolean {
  return Boolean(getSaved(movie)?.plannedEventId)
}

async function toggle(movie: MovieMedia) {
  if (isPlanned(movie)) return { ok: false, saved: true, blocked: true, message: 'Сначала убери фильм из календаря' }
  if (isSaved(movie)) {
    const result = await remove(movie)
    return { ...result, saved: !result.ok, blocked: false }
  }
  const result = await add(movie)
  return { ...result, saved: result.ok, blocked: false }
}

async function planMovie(
  movie: MovieMedia,
  data: { date: string; time: string; calendarId: string; reminder: string },
) {
  if (!isSaved(movie)) {
    const added = await add(movie)
    if (!added.ok) return added
  }
  const collectionsReady = await calendarCollectionStore.ensureWorkspaceCollections()
  if (!collectionsReady?.ok) return { ok: false, message: collectionsReady?.message }

  const startTime = data.time || '20:00'
  const result = await calendarStore.addEventAndWait({
    title: `Посмотреть «${movie.title}»`,
    date: data.date,
    startTime,
    endTime: addMinutes(startTime, movie.mediaType === 'movie' ? 120 : 60),
    calendarId: data.calendarId || calendarCollectionStore.activeCollections.value[0]?.id,
    memberIds: [],
    category: 'personal',
    notes: [
      movie.mediaType === 'movie' ? 'Фильм' : 'Сериал',
      movie.releaseDate?.slice(0, 4),
      movie.overview,
      `TMDB: ${movie.mediaType}/${movie.id}`,
    ].filter(Boolean).join('\n\n'),
    allDay: false,
    repeat: 'none',
    reminder: data.reminder || '1h',
  })

  if (!result.ok) {
    return { ok: false, message: Object.values(result.errors || {})[0] || 'Не удалось создать событие' }
  }

  const saved = getSaved(movie)
  if (saved) {
    const linked = await updateSavedMovie(saved, { plannedEventId: result.event.id })
    if (!linked.ok) {
      await calendarStore.deleteEventAndWait(result.event.id)
      return linked
    }
  }
  return { ok: true, event: result.event }
}

async function unplanMovie(movie: Pick<MovieMedia, 'id' | 'mediaType'>) {
  const saved = getSaved(movie)
  if (!saved?.plannedEventId) return { ok: true }
  const result = await calendarStore.deleteEventAndWait(saved.plannedEventId)
  if (!result.ok) return { ok: false, message: result.message || 'Не удалось удалить событие' }
  return updateSavedMovie(saved, { plannedEventId: '' })
}

async function loadWorkspace(workspaceId: string) {
  if (!workspaceId) return []
  const localMovies = savedMovies.value.filter((movie) => movie.workspaceId === workspaceId)
  try {
    const { data, error } = await api.list(workspaceId)
    if (error) return null
    const remoteMovies = (data || []).map(fromDatabaseRow)
    const remoteKeys = new Set(remoteMovies.map(getKey))
    const localOnly = localMovies.filter((movie) => !remoteKeys.has(getKey(movie)))
    if (localOnly.length) {
      const migrated = await api.upsert(localOnly.map(toDatabaseRow))
      if (migrated.error) return null
    }
    const mergedMovies = [...remoteMovies, ...localOnly]
    const otherWorkspaces = savedMovies.value.filter((movie) => movie.workspaceId !== workspaceId)
    savedMovies.value = [...otherWorkspaces, ...mergedMovies]
    return mergedMovies
  } catch {
    return null
  }
}

async function updateSavedMovie(movie: WatchlistMovie, updates: Partial<WatchlistMovie>) {
  const nextMovie = { ...movie, ...updates }
  try {
    const { error } = await api.update(
      getRecordId(movie.workspaceId, movie),
      toDatabaseRow(nextMovie),
    )
    if (error) return { ok: false, message: getDatabaseMessage(error) }
    savedMovies.value = savedMovies.value.map((item) => (
      item.workspaceId === movie.workspaceId && getKey(item) === getKey(movie) ? nextMovie : item
    ))
    return { ok: true, movie: nextMovie }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) }
  }
}

function getRecordId(workspaceId: string, movie: Pick<MovieMedia, 'id' | 'mediaType'>): string {
  return `${workspaceId}:${movie.mediaType}:${movie.id}`
}

function toDatabaseRow(movie: WatchlistMovie) {
  return {
    id: getRecordId(movie.workspaceId, movie),
    workspace_id: movie.workspaceId,
    tmdb_id: movie.id,
    media_type: movie.mediaType,
    title: movie.title,
    original_title: movie.originalTitle,
    overview: movie.overview,
    poster_path: movie.posterPath,
    backdrop_path: movie.backdropPath,
    release_date: movie.releaseDate || null,
    vote_average: movie.voteAverage,
    vote_count: movie.voteCount,
    popularity: movie.popularity,
    genre_ids: movie.genreIds,
    planned_event_id: movie.plannedEventId || null,
    added_at: movie.addedAt,
    updated_at: new Date().toISOString(),
  }
}

function fromDatabaseRow(row: Record<string, unknown>): WatchlistMovie {
  return {
    id: Number(row.tmdb_id),
    mediaType: row.media_type === 'tv' ? 'tv' : 'movie',
    title: String(row.title || ''),
    originalTitle: String(row.original_title || ''),
    overview: String(row.overview || ''),
    posterPath: String(row.poster_path || ''),
    backdropPath: String(row.backdrop_path || ''),
    releaseDate: String(row.release_date || ''),
    voteAverage: Number(row.vote_average || 0),
    voteCount: Number(row.vote_count || 0),
    popularity: Number(row.popularity || 0),
    genreIds: Array.isArray(row.genre_ids) ? row.genre_ids.map(Number) : [],
    workspaceId: String(row.workspace_id || ''),
    addedAt: String(row.added_at || new Date().toISOString()),
    plannedEventId: String(row.planned_event_id || ''),
  }
}

function getDatabaseMessage(error: { code?: string; message?: string }): string {
  if (error.code === '42P01') return 'Таблица фильмов ещё не создана в Supabase. Выполни миграцию movie_watchlist.'
  return error.message || 'Не удалось синхронизировать список фильмов'
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Не удалось синхронизировать список фильмов'
}

function addMinutes(time: string, minutes: number): string {
  const [hour, minute] = time.split(':').map(Number)
  const total = Math.min(23 * 60 + 59, hour * 60 + minute + minutes)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export const movieWatchlistStore = {
  watchlist,
  isSaved,
  isPlanned,
  add,
  remove,
  toggle,
  planMovie,
  unplanMovie,
  loadWorkspace,
}
