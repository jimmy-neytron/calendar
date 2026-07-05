import { computed, watch } from 'vue'
import { APP_CONFIG } from '../../config/app.config.js'
import { useLocalStorage } from '../storage/useLocalStorage.js'
import { DEFAULT_PREFERENCES, DENSITY_OPTIONS, HOLIDAY_COUNTRY_OPTIONS, THEME_OPTIONS } from '../../utils/constants/calendarConstants.js'

const PREFERENCES_KEY = `${APP_CONFIG.storageKey}:preferences`
const { state: preferences } = useLocalStorage(PREFERENCES_KEY, DEFAULT_PREFERENCES)

const normalizePreferences = (value = {}) => ({
  ...DEFAULT_PREFERENCES,
  ...value,
  theme: THEME_OPTIONS.some((theme) => theme.value === value.theme) ? value.theme : DEFAULT_PREFERENCES.theme,
  density: DENSITY_OPTIONS.some((density) => density.value === value.density) ? value.density : DEFAULT_PREFERENCES.density,
  holidayCountry: HOLIDAY_COUNTRY_OPTIONS.some((country) => country.value === value.holidayCountry)
    ? value.holidayCountry
    : DEFAULT_PREFERENCES.holidayCountry,
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

const applyDensity = (density) => {
  if (typeof document === 'undefined') return
  const nextDensity = DENSITY_OPTIONS.some((option) => option.value === density) ? density : DEFAULT_PREFERENCES.density
  document.documentElement.dataset.density = nextDensity
}

watch(
  () => preferences.value.theme,
  (theme) => applyTheme(theme),
  { immediate: true }
)

watch(
  () => preferences.value.density,
  (density) => applyDensity(density),
  { immediate: true }
)

const defaultMode = computed(() => preferences.value.defaultMode || DEFAULT_PREFERENCES.defaultMode)
const activeTheme = computed(() => preferences.value.theme || DEFAULT_PREFERENCES.theme)
const activeDensity = computed(() => preferences.value.density || DEFAULT_PREFERENCES.density)
const holidayCountry = computed(() => preferences.value.holidayCountry || DEFAULT_PREFERENCES.holidayCountry)

export function useCalendarPreferences() {
  return {
    preferences,
    defaultMode,
    activeTheme,
    activeDensity,
    holidayCountry,
    themeOptions: THEME_OPTIONS,
    updatePreferences,
    applyTheme,
    applyDensity,
  }
}
