import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import type { MovieMedia, WatchlistMovie } from '../types/movie'
import { calendarStore } from './calendar.store.js'
import { calendarCollectionStore } from './calendarCollection.store.js'
import { workspaceStore } from './workspace.store.js'
import { useActivityLog } from '../composables/history/useActivityLog.js'

const repository = new SyncedCollectionRepository(
  `${APP_CONFIG.storageKey}:movie-watchlist`,
  [] as WatchlistMovie[],
  'movie_watchlist',
  {
    toRow: toDatabaseRow,
    fromRow: fromDatabaseRow,
    getEntityId: (movie: WatchlistMovie) => getRecordId(movie.workspaceId, movie),
  },
)
const savedMovies = repository.items
const { addActivity } = useActivityLog()

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
  const result = await repository.createAndWait(savedMovie)
  if (!result.ok) return { ok: false, message: getDatabaseMessage({ message: result.message }) }
  addActivity('movie:save', `добавил(а) «${savedMovie.title}» в список «Хочу посмотреть»`, {
    tmdbId: savedMovie.id,
    mediaType: savedMovie.mediaType,
  })
  return { ok: true, movie: savedMovie }
}

async function remove(movie: Pick<MovieMedia, 'id' | 'mediaType'>) {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId) return { ok: false, message: 'Пространство не выбрано' }
  const saved = getSaved(movie)
  if (!saved) return { ok: true }
  const result = await repository.deleteAndWait(getRecordId(workspaceId, movie))
  if (!result.ok) return { ok: false, message: getDatabaseMessage({ message: result.message }) }
  addActivity('movie:remove', `убрал(а) «${saved.title}» из списка «Хочу посмотреть»`, {
    tmdbId: saved.id,
    mediaType: saved.mediaType,
  })
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
  addActivity('movie:plan', `запланировал(а) просмотр «${movie.title}» на ${data.date} в ${startTime}`, {
    tmdbId: movie.id,
    mediaType: movie.mediaType,
    eventId: result.event.id,
    date: data.date,
    time: startTime,
  })
  return { ok: true, event: result.event }
}

async function unplanMovie(movie: Pick<MovieMedia, 'id' | 'mediaType'>) {
  const saved = getSaved(movie)
  if (!saved?.plannedEventId) return { ok: true }
  const result = await calendarStore.deleteEventAndWait(saved.plannedEventId)
  if (!result.ok) return { ok: false, message: result.message || 'Не удалось удалить событие' }
  const unlinked = await updateSavedMovie(saved, { plannedEventId: '' })
  if (unlinked.ok) addActivity('movie:unplan', `убрал(а) просмотр «${saved.title}» из календаря`, {
    tmdbId: saved.id,
    mediaType: saved.mediaType,
  })
  return unlinked
}

async function loadWorkspace(workspaceId: string) {
  return repository.loadWorkspace(workspaceId)
}

async function updateSavedMovie(movie: WatchlistMovie, updates: Partial<WatchlistMovie>) {
  const nextMovie = { ...movie, ...updates }
  const result = await repository.updateAndWait(getRecordId(movie.workspaceId, movie), nextMovie)
  return result.ok
    ? { ok: true, movie: nextMovie }
    : { ok: false, message: getDatabaseMessage({ message: result.message }) }
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
