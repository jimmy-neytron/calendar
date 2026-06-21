import { computed } from 'vue'
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

function add(movie: MovieMedia): void {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId || isSaved(movie)) return
  savedMovies.value.push({
    ...movie,
    workspaceId,
    addedAt: new Date().toISOString(),
    plannedEventId: '',
  })
}

function remove(movie: Pick<MovieMedia, 'id' | 'mediaType'>): void {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  savedMovies.value = savedMovies.value.filter((item) => !(
    item.workspaceId === workspaceId && getKey(item) === getKey(movie)
  ))
}

function getSaved(movie: Pick<MovieMedia, 'id' | 'mediaType'>): WatchlistMovie | undefined {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  return savedMovies.value.find((item) => item.workspaceId === workspaceId && getKey(item) === getKey(movie))
}

function isPlanned(movie: Pick<MovieMedia, 'id' | 'mediaType'>): boolean {
  return Boolean(getSaved(movie)?.plannedEventId)
}

function toggle(movie: MovieMedia): { saved: boolean; blocked: boolean } {
  if (isPlanned(movie)) return { saved: true, blocked: true }
  if (isSaved(movie)) {
    remove(movie)
    return { saved: false, blocked: false }
  }
  add(movie)
  return { saved: true, blocked: false }
}

async function planMovie(
  movie: MovieMedia,
  data: { date: string; time: string; calendarId: string; reminder: string },
) {
  if (!isSaved(movie)) add(movie)
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
  if (saved) saved.plannedEventId = result.event.id
  return { ok: true, event: result.event }
}

async function unplanMovie(movie: Pick<MovieMedia, 'id' | 'mediaType'>) {
  const saved = getSaved(movie)
  if (!saved?.plannedEventId) return { ok: true }
  const result = await calendarStore.deleteEventAndWait(saved.plannedEventId)
  if (!result.ok) return { ok: false, message: result.message || 'Не удалось удалить событие' }
  saved.plannedEventId = ''
  return { ok: true }
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
}
