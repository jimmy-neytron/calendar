import { computed } from 'vue'
import { APP_CONFIG } from '../../config/app.config.js'
import { useLocalStorage } from '../storage/useLocalStorage.js'

export const ACTIVITY_LOG_SETTING_KEY = `${APP_CONFIG.storageKey}:activity-log-enabled`

const { state: enabled } = useLocalStorage(ACTIVITY_LOG_SETTING_KEY, false)
const isEnabled = computed(() => enabled.value === true)

export function useActivityLogSettings() {
  return {
    enabled,
    isEnabled,
    setEnabled(value) {
      enabled.value = value === true
    },
  }
}

export function readActivityLogSetting() {
  return isEnabled.value
}
