import { readActivityLogSetting } from '../composables/preferences/useActivityLogSettings.js'
import { readBudgetSetting } from '../composables/preferences/useBudgetSettings.js'
import { readTimeTrackingSetting } from '../composables/preferences/useTimeTrackingSettings.js'
import { readSubscriptionFeature } from '../composables/preferences/useSubscriptionSettings.js'

export function isSyncTableEnabled(table) {
  if (table === 'activity_entries') return readActivityLogSetting()
  if (table === 'time_entries' || table === 'time_projects') return readSubscriptionFeature('timeTracking') && readTimeTrackingSetting()
  if (table.startsWith('budget_')) return readSubscriptionFeature('budget') && readBudgetSetting()
  if (table === 'sport_exercises' || table === 'sport_completions') return readSubscriptionFeature('sport')
  if (table === 'movie_watchlist') return readSubscriptionFeature('movies')
  return true
}
