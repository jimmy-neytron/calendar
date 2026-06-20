import { birthdayStore } from '../../stores/birthday.store.js'
import { calendarCollectionStore } from '../../stores/calendarCollection.store.js'
import { calendarStore } from '../../stores/calendar.store.js'
import { ideaStore } from '../../stores/idea.store.js'
import { sportStore } from '../../stores/sport.store.js'
import { notificationStore } from '../../stores/notification.store.js'
import { useActivityLog } from '../../composables/history/useActivityLog.js'

export async function loadWorkspaceData(workspaceId) {
  if (!workspaceId) return { ok: false, message: 'Пространство не выбрано' }
  const collections = await calendarCollectionStore.loadWorkspace(workspaceId)
  if (collections === null) return { ok: false, message: 'Не удалось загрузить календари' }
  await calendarCollectionStore.ensureWorkspaceCollections()
  const results = await Promise.all([
    calendarStore.loadWorkspace(workspaceId),
    ideaStore.loadWorkspace(workspaceId),
    birthdayStore.loadWorkspace(workspaceId),
    sportStore.loadWorkspace(workspaceId),
    notificationStore.loadWorkspace(workspaceId),
    useActivityLog().loadWorkspace(workspaceId),
  ])
  return results.some((result) => result === null)
    ? { ok: false, message: 'Часть данных не загрузилась из Supabase' }
    : { ok: true }
}
