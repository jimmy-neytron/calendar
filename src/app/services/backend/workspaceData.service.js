import { calendarCollectionStore } from '../../stores/calendarCollection.store.js'
import { calendarStore } from '../../stores/calendar.store.js'
import { notificationStore } from '../../stores/notification.store.js'
import { authStore } from '../../stores/auth.store.js'
import { loadWorkspaceFeatures } from '../../composables/preferences/useBudgetSettings.js'
import { queryClient } from '../../query/queryClient.js'
import { queryKeys } from '../../query/queryKeys.js'
import { resolveWorkspaceDataSections, WORKSPACE_DATA_SECTIONS } from './workspaceDataRoutes.js'

const sectionLoaders = {
  [WORKSPACE_DATA_SECTIONS.ACTIVITY]: async (workspaceId) => {
    const { useActivityLog } = await import('../../composables/history/useActivityLog.js')
    return useActivityLog().loadWorkspace(workspaceId)
  },
  [WORKSPACE_DATA_SECTIONS.BIRTHDAYS]: async (workspaceId) => {
    const { birthdayStore } = await import('../../stores/birthday.store.js')
    return birthdayStore.loadWorkspace(workspaceId)
  },
  [WORKSPACE_DATA_SECTIONS.BUDGET]: async (workspaceId) => {
    const { budgetStore } = await import('../../stores/budget.store.js')
    budgetStore.setSelectedMonth(getCurrentMonth())
    return budgetStore.loadWorkspace(workspaceId)
  },
  [WORKSPACE_DATA_SECTIONS.CHALLENGES]: async (workspaceId) => {
    const { challengeStore } = await import('../../stores/challenge.store.js')
    return challengeStore.loadWorkspace(workspaceId)
  },
  [WORKSPACE_DATA_SECTIONS.COUPONS]: async (workspaceId) => {
    const { couponStore } = await import('../../stores/coupon.store')
    return couponStore.loadWorkspace(workspaceId)
  },
  [WORKSPACE_DATA_SECTIONS.IDEAS]: async (workspaceId) => {
    const { ideaStore } = await import('../../stores/idea.store.js')
    return ideaStore.loadWorkspace(workspaceId)
  },
  [WORKSPACE_DATA_SECTIONS.INVESTMENTS]: async (workspaceId) => {
    const { investmentStore } = await import('../../stores/investment.store')
    return investmentStore.loadWorkspace(workspaceId)
  },
  [WORKSPACE_DATA_SECTIONS.KNOWLEDGE]: async (workspaceId) => {
    const { knowledgeStore } = await import('../../modules/knowledge/stores/knowledge.store.js')
    return knowledgeStore.loadWorkspace(workspaceId)
  },
  [WORKSPACE_DATA_SECTIONS.MOVIES]: async (workspaceId) => {
    const { movieWatchlistStore } = await import('../../stores/movieWatchlist.store')
    return movieWatchlistStore.loadWorkspace(workspaceId)
  },
  [WORKSPACE_DATA_SECTIONS.NOTES]: async (workspaceId) => {
    const { noteStore } = await import('../../stores/note.store.js')
    return noteStore.loadWorkspace(workspaceId)
  },
  [WORKSPACE_DATA_SECTIONS.PARAMETERS]: async (workspaceId) => {
    const { personalParametersStore } = await import('../../stores/personalParameters.store')
    return personalParametersStore.loadWorkspace(workspaceId)
  },
  [WORKSPACE_DATA_SECTIONS.PURCHASES]: async (workspaceId) => {
    const { purchaseWishlistStore } = await import('../../stores/purchaseWishlist.store')
    return purchaseWishlistStore.loadWorkspace(workspaceId)
  },
  [WORKSPACE_DATA_SECTIONS.SPORT]: async (workspaceId) => {
    const { sportStore } = await import('../../stores/sport.store.js')
    return sportStore.loadWorkspace(workspaceId)
  },
  [WORKSPACE_DATA_SECTIONS.TIME_TRACKING]: async (workspaceId) => {
    const { timeTrackingStore } = await import('../../stores/timeTracking.store')
    return timeTrackingStore.loadWorkspace(workspaceId)
  },
  [WORKSPACE_DATA_SECTIONS.WARDROBE]: async (workspaceId) => {
    const { wardrobeStore } = await import('../../stores/wardrobe.store')
    return wardrobeStore.loadWorkspace(workspaceId)
  },
}

/**
 * Загружает только обязательные данные приложения и данные текущего маршрута.
 * Вызовы без routeName сохраняют прежнее поведение полной загрузки — это нужно
 * для миграций, экспорта и переключения workspace.
 */
export async function loadWorkspaceData(workspaceId, {
  force = false,
  routeName = '',
  analyticsSection = '',
} = {}) {
  if (!workspaceId) return { ok: false, message: 'Пространство не выбрано' }

  if (force) {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.workspace.data(workspaceId, authStore.currentUserId.value),
    })
  }

  const sections = resolveWorkspaceDataSections(routeName, analyticsSection)

  try {
    const results = await Promise.all([
      loadCoreWorkspaceData(workspaceId),
      ...sections.map((section) => loadWorkspaceSection(workspaceId, section)),
    ])
    return results.some(hasLoadFailure)
      ? { ok: false, message: 'Часть данных не загрузилась из Supabase' }
      : { ok: true }
  } catch (error) {
    return {
      ok: false,
      message: error?.message || 'Не удалось загрузить данные пространства',
    }
  }
}

function loadCoreWorkspaceData(workspaceId) {
  return fetchCachedWorkspacePart(workspaceId, 'core', async () => {
    const [, collections] = await Promise.all([
      loadWorkspaceFeatures(workspaceId),
      calendarCollectionStore.loadWorkspace(workspaceId),
    ])
    if (collections === null) return null
    await calendarCollectionStore.ensureWorkspaceCollections()
    return Promise.all([
      calendarStore.loadWorkspace(workspaceId),
      notificationStore.loadWorkspace(workspaceId),
    ])
  })
}

function loadWorkspaceSection(workspaceId, section) {
  const loader = sectionLoaders[section]
  if (!loader) return Promise.resolve([])
  return fetchCachedWorkspacePart(workspaceId, section, () => loader(workspaceId))
}

function fetchCachedWorkspacePart(workspaceId, section, queryFn) {
  return queryClient.fetchQuery({
    queryKey: queryKeys.workspace.section(
      workspaceId,
      authStore.currentUserId.value,
      section,
    ),
    staleTime: Infinity,
    queryFn,
  })
}

function hasLoadFailure(result) {
  return result === null || (Array.isArray(result) && result.some(hasLoadFailure))
}

function getCurrentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Помечает снимки workspace устаревшими. Следующий переход запросит только
 * обязательные данные и данные открываемого раздела.
 */
export function invalidateWorkspaceData(workspaceId = '') {
  const queryKey = workspaceId
    ? queryKeys.workspace.data(workspaceId, authStore.currentUserId.value)
    : queryKeys.workspace.root
  return queryClient.invalidateQueries({ queryKey })
}
