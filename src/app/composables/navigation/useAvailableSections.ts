import { computed } from 'vue'
import { authStore } from '../../stores/auth.store.js'
import { useActivityLogSettings } from '../preferences/useActivityLogSettings.js'
import { useBudgetSettings } from '../preferences/useBudgetSettings.js'
import { useExtraSectionsSettings } from '../preferences/useExtraSectionsSettings.js'
import { readSubscriptionFeature } from '../preferences/useSubscriptionSettings.js'
import { SIDEBAR_GROUPS, type SidebarGroup, type SidebarSection } from '../../navigation/sidebarSections'

/** Единое правило доступности разделов для навигации и сводных экранов. */
export function useAvailableSections() {
  const { isEnabled: activityLogEnabled } = useActivityLogSettings()
  const { isEnabled: budgetEnabled } = useBudgetSettings()
  const { isEnabled: extraSectionsEnabled } = useExtraSectionsSettings()

  function isSectionAvailable(itemOrName: SidebarSection | string) {
    const item = typeof itemOrName === 'string'
      ? SIDEBAR_GROUPS.flatMap((group) => group.items).find((candidate) => candidate.name === itemOrName)
      : itemOrName
    if (!item) return false
    return (
      (item.name !== 'activity' || activityLogEnabled.value)
      && (item.name !== 'budget' || budgetEnabled.value)
      && (!item.extra || extraSectionsEnabled.value)
      && (!item.feature || readSubscriptionFeature(item.feature))
      && (item.name !== 'admin-overview' || authStore.isAdmin.value)
    )
  }

  const availableGroups = computed<SidebarGroup[]>(() => SIDEBAR_GROUPS
    .map((group) => ({ ...group, items: group.items.filter(isSectionAvailable) }))
    .filter((group) => group.items.length))

  const availableSectionIds = computed(() => new Set(
    availableGroups.value.flatMap((group) => group.items.map((item) => item.name)),
  ))

  return { availableGroups, availableSectionIds, isSectionAvailable }
}
