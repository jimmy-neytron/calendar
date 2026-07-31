import { readActivityLogSetting } from '../composables/preferences/useActivityLogSettings.js'
import { readBudgetSetting } from '../composables/preferences/useBudgetSettings.js'
import { readExtraSectionsSetting } from '../composables/preferences/useExtraSectionsSettings.js'
import { readSubscriptionFeature } from '../composables/preferences/useSubscriptionSettings.js'

export function isSyncTableEnabled(table) {
  if (table === 'activity_entries') return readSubscriptionFeature('activity') && readActivityLogSetting()
  if (table === 'time_entries' || table === 'time_projects') return readExtraSectionsSetting() && readSubscriptionFeature('timeTracking')
  if (table.startsWith('budget_')) return readSubscriptionFeature('budget') && readBudgetSetting()
  if (table === 'sport_exercises' || table === 'sport_completions') return readExtraSectionsSetting() && readSubscriptionFeature('sport')
  if (table === 'movie_watchlist') return readExtraSectionsSetting() && readSubscriptionFeature('movies')
  if (table === 'purchase_wishlist') return readExtraSectionsSetting() && readSubscriptionFeature('purchases')
  return true
}
