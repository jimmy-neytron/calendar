import { readActivityLogSetting } from '../composables/preferences/useActivityLogSettings.js'

export function isSyncTableEnabled(table) {
  if (table === 'activity_entries') return readActivityLogSetting()
  return true
}
