import { computed, ref, watch } from 'vue'
import { sidebarPreferencesApi, type SidebarPreferencesRow } from '../../api/supabase/sidebarPreferences.api'
import { authStore } from '../../stores/auth.store.js'
import { APP_CONFIG } from '../../config/app.config.js'
import { DEFAULT_MOBILE_SECTION_IDS, SIDEBAR_SECTION_IDS } from '../../navigation/sidebarSections'

export interface SidebarPreferences {
  visibleSectionIds: string[]
  sectionOrder: string[]
  mobileFavoriteIds: string[]
}

const createDefaults = (): SidebarPreferences => ({
  visibleSectionIds: [...SIDEBAR_SECTION_IDS],
  sectionOrder: [...SIDEBAR_SECTION_IDS],
  mobileFavoriteIds: [...DEFAULT_MOBILE_SECTION_IDS],
})

const preferences = ref<SidebarPreferences>(createDefaults())
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const loadedUserId = ref('')
let loadSequence = 0
let saveSequence = 0
let saveQueue: Promise<unknown> = Promise.resolve()

function uniqueKnownIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && SIDEBAR_SECTION_IDS.includes(id)))]
}

export function normalizeSidebarPreferences(value?: Partial<SidebarPreferences> | null): SidebarPreferences {
  const visibleIds = uniqueKnownIds(value?.visibleSectionIds)
  const orderedIds = uniqueKnownIds(value?.sectionOrder)
  const favoriteIds = value?.mobileFavoriteIds === undefined
    ? [...DEFAULT_MOBILE_SECTION_IDS]
    : uniqueKnownIds(value.mobileFavoriteIds)

  return {
    visibleSectionIds: visibleIds.length ? visibleIds : [...SIDEBAR_SECTION_IDS],
    sectionOrder: [...orderedIds, ...SIDEBAR_SECTION_IDS.filter((id) => !orderedIds.includes(id))],
    mobileFavoriteIds: favoriteIds.slice(0, 4),
  }
}

function cacheKey(userId: string) {
  return `${APP_CONFIG.storageKey}:sidebar:${userId}`
}

function readCache(userId: string): SidebarPreferences | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    return raw ? normalizeSidebarPreferences(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function writeCache(userId: string, value: SidebarPreferences) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(cacheKey(userId), JSON.stringify(value))
}

function fromRow(row: Partial<SidebarPreferencesRow>): SidebarPreferences {
  return normalizeSidebarPreferences({
    visibleSectionIds: row.visible_section_ids,
    sectionOrder: row.section_order,
    mobileFavoriteIds: row.mobile_favorite_ids,
  })
}

async function load(userId = String(authStore.currentUserId.value || '')) {
  const sequence = ++loadSequence
  loadedUserId.value = userId
  error.value = ''

  if (!userId) {
    preferences.value = createDefaults()
    return
  }

  preferences.value = readCache(userId) || createDefaults()
  loading.value = true
  try {
    const { data, error: requestError } = await sidebarPreferencesApi.get(userId)
    if (sequence !== loadSequence || loadedUserId.value !== userId) return
    if (requestError) throw requestError
    if (data) {
      preferences.value = fromRow(data)
      writeCache(userId, preferences.value)
    }
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Не удалось загрузить настройку меню'
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

async function setPreferences(value: SidebarPreferences) {
  const normalized = normalizeSidebarPreferences(value)
  const userId = String(authStore.currentUserId.value || '')
  preferences.value = normalized
  if (!userId) return { ok: false, message: 'Пользователь не авторизован' }

  writeCache(userId, normalized)
  const sequence = ++saveSequence
  saving.value = true
  error.value = ''
  try {
    const request = saveQueue.then(() => sidebarPreferencesApi.upsert({
      user_id: userId,
      visible_section_ids: normalized.visibleSectionIds,
      section_order: normalized.sectionOrder,
      mobile_favorite_ids: normalized.mobileFavoriteIds,
    }))
    saveQueue = request.then(() => undefined, () => undefined)
    const { data, error: requestError } = await request
    if (requestError) throw requestError
    if (sequence === saveSequence && data) {
      preferences.value = fromRow(data)
      writeCache(userId, preferences.value)
    }
    return { ok: true }
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Не удалось сохранить настройку меню'
    return { ok: false, message: error.value }
  } finally {
    if (sequence === saveSequence) saving.value = false
  }
}

function reset() {
  return setPreferences(createDefaults())
}

watch(
  () => authStore.currentUserId.value,
  (userId) => load(String(userId || '')),
  { immediate: true },
)

export function useSidebarPreferences() {
  return {
    preferences: computed(() => preferences.value),
    loading: computed(() => loading.value),
    saving: computed(() => saving.value),
    error: computed(() => error.value),
    setPreferences,
    reset,
    reload: load,
  }
}
