import { computed } from 'vue'
import { APP_CONFIG } from '../../config/app.config.js'
import { useLocalStorage } from '../storage/useLocalStorage.js'

export const TIME_TRACKING_SETTING_KEY = `${APP_CONFIG.storageKey}:time-tracking-enabled`

const { state: enabled } = useLocalStorage(TIME_TRACKING_SETTING_KEY, false)
const isEnabled = computed(() => enabled.value === true)

export function useTimeTrackingSettings() {
  return {
    enabled,
    isEnabled,
    setEnabled(value) {
      enabled.value = value === true
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('time-tracking-setting-change', {
          detail: { enabled: enabled.value },
        }))
      }
    },
  }
}

export function readTimeTrackingSetting() {
  return isEnabled.value
}
