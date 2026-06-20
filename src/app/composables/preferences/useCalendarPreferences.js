import { computed, watch } from 'vue'
import { APP_CONFIG } from '../../config/app.config.js'
import { useLocalStorage } from '../storage/useLocalStorage.js'
import { DEFAULT_PREFERENCES, THEME_OPTIONS } from '../../utils/constants/calendarConstants.js'

const PREFERENCES_KEY = `${APP_CONFIG.storageKey}:preferences`
const { state: preferences } = useLocalStorage(PREFERENCES_KEY, DEFAULT_PREFERENCES)

const normalizePreferences = (value = {}) => ({
  ...DEFAULT_PREFERENCES,
  ...value,
  theme: THEME_OPTIONS.some((theme) => theme.value === value.theme) ? value.theme : DEFAULT_PREFERENCES.theme,
})

const updatePreferences = (updates) => {
  preferences.value = normalizePreferences({
    ...preferences.value,
    ...updates,
  })
}

const applyTheme = (theme) => {
  if (typeof document === 'undefined') return
  const nextTheme = THEME_OPTIONS.some((option) => option.value === theme) ? theme : DEFAULT_PREFERENCES.theme
  document.documentElement.dataset.theme = nextTheme
  document.documentElement.style.colorScheme = nextTheme === 'light' ? 'light' : 'dark'
}

watch(
  () => preferences.value.theme,
  (theme) => applyTheme(theme),
  { immediate: true }
)

const defaultMode = computed(() => preferences.value.defaultMode || DEFAULT_PREFERENCES.defaultMode)
const activeTheme = computed(() => preferences.value.theme || DEFAULT_PREFERENCES.theme)

export function useCalendarPreferences() {
  return {
    preferences,
    defaultMode,
    activeTheme,
    themeOptions: THEME_OPTIONS,
    updatePreferences,
    applyTheme,
  }
}
