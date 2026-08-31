import { computed, ref, watch } from 'vue'

export const DEFAULT_TODAY_SECTION_ORDER = [
  'calendar', 'challenges', 'meals', 'sport', 'budget', 'birthdays',
  'notes', 'ideas', 'time-tracking', 'coupons',
]

const STORAGE_KEY = 'workspace-calendar:today-preferences'

export interface TodayPreferences {
  hiddenSectionIds: string[]
  sectionOrder: string[]
}

const preferences = ref<TodayPreferences>(readPreferences())

export function useTodayPreferences() {
  const hiddenSectionIds = computed(() => new Set(preferences.value.hiddenSectionIds))

  function setSectionVisible(id: string, visible: boolean) {
    const hidden = new Set(preferences.value.hiddenSectionIds)
    visible ? hidden.delete(id) : hidden.add(id)
    preferences.value = { ...preferences.value, hiddenSectionIds: [...hidden] }
  }

  function moveSection(id: string, direction: -1 | 1) {
    const order = [...preferences.value.sectionOrder]
    const index = order.indexOf(id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= order.length) return
    ;[order[index], order[target]] = [order[target], order[index]]
    preferences.value = { ...preferences.value, sectionOrder: order }
  }

  function reset() {
    preferences.value = normalizeTodayPreferences(null)
  }

  return { preferences, hiddenSectionIds, setSectionVisible, moveSection, reset }
}

export function normalizeTodayPreferences(value: Partial<TodayPreferences> | null): TodayPreferences {
  const requestedOrder = Array.isArray(value?.sectionOrder) ? value.sectionOrder : []
  const sectionOrder = [...new Set([
    ...requestedOrder.filter((id): id is string => typeof id === 'string' && DEFAULT_TODAY_SECTION_ORDER.includes(id)),
    ...DEFAULT_TODAY_SECTION_ORDER,
  ])]
  return {
    hiddenSectionIds: Array.isArray(value?.hiddenSectionIds)
      ? [...new Set(value.hiddenSectionIds.filter((id): id is string => typeof id === 'string' && DEFAULT_TODAY_SECTION_ORDER.includes(id)))]
      : [],
    sectionOrder,
  }
}

function readPreferences() {
  if (typeof localStorage === 'undefined') return normalizeTodayPreferences(null)
  try {
    return normalizeTodayPreferences(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'))
  } catch {
    return normalizeTodayPreferences(null)
  }
}

watch(preferences, (value) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}, { deep: true })
