// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import type { MovieMedia } from '../types/movie'
const api = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn(), create: vi.fn() }))
vi.mock('../api/supabase/collections.api.js', () => ({ createCollectionApi: () => api }))
vi.mock('../config/featureFlags.js', () => ({ isSyncTableEnabled: () => true }))
vi.mock('./workspace.store.js', () => ({ workspaceStore: { activeWorkspaceId: { value: 'workspace' } } }))
vi.mock('./calendar.store.js', () => ({ calendarStore: { events: { value: [] } } }))
vi.mock('./calendarCollection.store.js', () => ({ calendarCollectionStore: {} }))
vi.mock('../composables/history/useActivityLog.js', () => ({ useActivityLog: () => ({ addActivity: vi.fn() }) }))
import { movieWatchlistStore as store } from './movieWatchlist.store'
import { queryClient } from '../query/queryClient.js'
const row = { id: 'workspace:movie:550', workspace_id: 'workspace', tmdb_id: 550, media_type: 'movie', title: 'Фильм', added_at: '2026-01-01', planned_event_id: 'event' }
beforeEach(async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  localStorage.clear()
  queryClient.clear()
  api.list.mockResolvedValue({ data: [row], error: null })
  api.update.mockResolvedValue({ error: null })
  await store.loadWorkspace('workspace')
})
it('moves a legacy saved movie to watched and back while preserving calendar links', async () => {
  const movie = store.watchlist.value[0] as MovieMedia
  expect(store.watched.value).toHaveLength(0)
  expect((await store.setWatched(movie, true)).ok).toBe(true)
  expect(store.watchlist.value).toHaveLength(0)
  expect(store.watched.value).toHaveLength(1)
  expect(store.isPlanned(movie)).toBe(true)
  expect((await store.setWatched(movie, false)).ok).toBe(true)
  expect(store.watchlist.value).toHaveLength(1)
  expect(store.watched.value).toHaveLength(0)
})
it('rolls back status changes when synchronization fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  api.update.mockResolvedValue({ error: { message: 'permission denied' } })
  const movie = store.watchlist.value[0]
  expect((await store.setWatched(movie, true)).ok).toBe(false)
  expect(store.watchlist.value).toHaveLength(1)
  expect(store.watched.value).toHaveLength(0)
})
