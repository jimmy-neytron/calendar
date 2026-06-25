import { birthdayStore } from '../../stores/birthday.store.js'
import { calendarCollectionStore } from '../../stores/calendarCollection.store.js'
import { calendarStore } from '../../stores/calendar.store.js'
import { ideaStore } from '../../stores/idea.store.js'
import { sportStore } from '../../stores/sport.store.js'
import { notificationStore } from '../../stores/notification.store.js'
import { movieWatchlistStore } from '../../stores/movieWatchlist.store'
import { useActivityLog } from '../../composables/history/useActivityLog.js'
import { authStore } from '../../stores/auth.store.js'
import { timeTrackingStore } from '../../stores/timeTracking.store'

let loadedDataKey = ''
let loadingDataKey = ''
let loadingPromise = null

export async function loadWorkspaceData(workspaceId, { force = false } = {}) {
  if (!workspaceId) return { ok: false, message: 'Пространство не выбрано' }
  const dataKey = `${authStore.currentUserId.value || 'guest'}:${workspaceId}`
  if (!force && loadedDataKey === dataKey) return { ok: true, cached: true }
  if (!force && loadingDataKey === dataKey && loadingPromise) return loadingPromise

  loadingDataKey = dataKey
  loadingPromise = fetchWorkspaceData(workspaceId)
  const result = await loadingPromise
  if (result.ok) loadedDataKey = dataKey
  loadingDataKey = ''
  loadingPromise = null
  return result
}

async function fetchWorkspaceData(workspaceId) {
  const collections = await calendarCollectionStore.loadWorkspace(workspaceId)
  if (collections === null) return { ok: false, message: 'Не удалось загрузить календари' }
  await calendarCollectionStore.ensureWorkspaceCollections()
  const results = await Promise.all([
    calendarStore.loadWorkspace(workspaceId),
    ideaStore.loadWorkspace(workspaceId),
    birthdayStore.loadWorkspace(workspaceId),
    sportStore.loadWorkspace(workspaceId),
    notificationStore.loadWorkspace(workspaceId),
    movieWatchlistStore.loadWorkspace(workspaceId),
    useActivityLog().loadWorkspace(workspaceId),
    timeTrackingStore.loadWorkspace(workspaceId),
  ])
  return results.some((result) => result === null)
    ? { ok: false, message: 'Часть данных не загрузилась из Supabase' }
    : { ok: true }
}

export function invalidateWorkspaceData(workspaceId = '') {
  if (!workspaceId || loadedDataKey.endsWith(`:${workspaceId}`)) loadedDataKey = ''
}
