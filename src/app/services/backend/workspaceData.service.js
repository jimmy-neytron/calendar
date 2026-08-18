import { birthdayStore } from '../../stores/birthday.store.js'
import { calendarCollectionStore } from '../../stores/calendarCollection.store.js'
import { calendarStore } from '../../stores/calendar.store.js'
import { ideaStore } from '../../stores/idea.store.js'
import { noteStore } from '../../stores/note.store.js'
import { sportStore } from '../../stores/sport.store.js'
import { notificationStore } from '../../stores/notification.store.js'
import { movieWatchlistStore } from '../../stores/movieWatchlist.store'
import { purchaseWishlistStore } from '../../stores/purchaseWishlist.store'
import { personalParametersStore } from '../../stores/personalParameters.store'
import { wardrobeStore } from '../../stores/wardrobe.store'
import { useActivityLog } from '../../composables/history/useActivityLog.js'
import { authStore } from '../../stores/auth.store.js'
import { timeTrackingStore } from '../../stores/timeTracking.store'
import { budgetStore } from '../../stores/budget.store.js'
import { loadWorkspaceFeatures } from '../../composables/preferences/useBudgetSettings.js'
import { readExtraSectionsSetting } from '../../composables/preferences/useExtraSectionsSettings.js'
import { readSubscriptionFeature } from '../../composables/preferences/useSubscriptionSettings.js'
import { queryClient } from '../../query/queryClient.js'
import { queryKeys } from '../../query/queryKeys.js'

/**
 * Загружает все серверные данные выбранного workspace.
 * TanStack Query дедуплицирует параллельные вызовы из router/layout и хранит
 * успешный результат до явной инвалидации workspace.
 */
export async function loadWorkspaceData(workspaceId, { force = false } = {}) {
  if (!workspaceId) return { ok: false, message: 'Пространство не выбрано' }
  const queryKey = queryKeys.workspace.data(workspaceId, authStore.currentUserId.value)

  if (force) {
    await queryClient.invalidateQueries({ queryKey, exact: true })
  }

  try {
    return await queryClient.fetchQuery({
      queryKey,
      staleTime: force ? 0 : Infinity,
      queryFn: async () => {
        const result = await fetchWorkspaceData(workspaceId)
        if (!result.ok) throw new Error(result.message)
        return result
      },
    })
  } catch (error) {
    return {
      ok: false,
      message: error?.message || 'Не удалось загрузить данные пространства',
    }
  }
}

async function fetchWorkspaceData(workspaceId) {
  await loadWorkspaceFeatures(workspaceId)
  const collections = await calendarCollectionStore.loadWorkspace(workspaceId)
  if (collections === null) return { ok: false, message: 'Не удалось загрузить календари' }
  await calendarCollectionStore.ensureWorkspaceCollections()

  const results = await Promise.all([
    calendarStore.loadWorkspace(workspaceId),
    ideaStore.loadWorkspace(workspaceId),
    noteStore.loadWorkspace(workspaceId),
    birthdayStore.loadWorkspace(workspaceId),
    notificationStore.loadWorkspace(workspaceId),
  ])
  if (readSubscriptionFeature('activity')) {
    results.push(await useActivityLog().loadWorkspace(workspaceId))
  }
  if (readExtraSectionsSetting()) {
    results.push(...await Promise.all([
      sportStore.loadWorkspace(workspaceId),
      movieWatchlistStore.loadWorkspace(workspaceId),
      purchaseWishlistStore.loadWorkspace(workspaceId),
      personalParametersStore.loadWorkspace(workspaceId),
      wardrobeStore.loadWorkspace(workspaceId),
      timeTrackingStore.loadWorkspace(workspaceId),
    ]))
  }

  budgetStore.setSelectedMonth(getCurrentMonth())
  const budgetResult = await budgetStore.loadWorkspace(workspaceId)

  return results.some((result) => result === null) || budgetResult === null
    ? { ok: false, message: 'Часть данных не загрузилась из Supabase' }
    : { ok: true }
}

function getCurrentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Помечает снимок workspace устаревшим. Следующий переход повторно запросит данные.
 */
export function invalidateWorkspaceData(workspaceId = '') {
  const queryKey = workspaceId
    ? queryKeys.workspace.data(workspaceId, authStore.currentUserId.value).slice(0, 2)
    : queryKeys.workspace.root
  return queryClient.invalidateQueries({ queryKey })
}
