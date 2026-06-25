import { readActivityLogSetting } from '../composables/preferences/useActivityLogSettings.js'
import { readTimeTrackingSetting } from '../composables/preferences/useTimeTrackingSettings.js'

export function isSyncTableEnabled(table) {
  if (table === 'activity_entries') return readActivityLogSetting()
  if (table === 'time_entries' || table === 'time_projects') return readTimeTrackingSetting()
  return true
}
