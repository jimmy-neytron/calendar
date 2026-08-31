import { readActivityLogSetting } from '../composables/preferences/useActivityLogSettings.js'
import { readBudgetSetting } from '../composables/preferences/useBudgetSettings.js'
import { readExtraSectionsSetting } from '../composables/preferences/useExtraSectionsSettings.js'
import { readSubscriptionFeature } from '../composables/preferences/useSubscriptionSettings.js'

export function isSyncTableEnabled(table) {
  if (table === 'activity_entries') return readSubscriptionFeature('activity') && readActivityLogSetting()
  if (table === 'time_entries' || table === 'time_projects') return readExtraSectionsSetting() && readSubscriptionFeature('timeTracking')
  if (table.startsWith('budget_')) return readSubscriptionFeature('budget') && readBudgetSetting()
  if (table === 'sport_exercises' || table === 'sport_completions' || table === 'sport_workouts') return readExtraSectionsSetting() && readSubscriptionFeature('sport')
  if (table === 'movie_watchlist') return readExtraSectionsSetting() && readSubscriptionFeature('movies')
  if (table === 'purchase_wishlist') return readExtraSectionsSetting() && readSubscriptionFeature('purchases')
  if (table === 'personal_parameters') return readExtraSectionsSetting() && readSubscriptionFeature('extraSections')
  if (table === 'wardrobe_items' || table === 'wardrobe_looks') return readExtraSectionsSetting() && readSubscriptionFeature('extraSections')
  if (table === 'knowledge_notes') return readSubscriptionFeature('knowledge')
  if (table.startsWith('investment_')) return readSubscriptionFeature('investments')
  if (table === 'coupons') return readSubscriptionFeature('coupons')
  return true
}

export function isWorkspaceDataSectionEnabled(section) {
  if (section === 'activity') return readSubscriptionFeature('activity') && readActivityLogSetting()
  if (section === 'budget') return readSubscriptionFeature('budget') && readBudgetSetting()
  if (section === 'sport') return readExtraSectionsSetting() && readSubscriptionFeature('sport')
  if (section === 'time-tracking') return readExtraSectionsSetting() && readSubscriptionFeature('timeTracking')
  if (section === 'movies') return readExtraSectionsSetting() && readSubscriptionFeature('movies')
  if (section === 'purchases') return readExtraSectionsSetting() && readSubscriptionFeature('purchases')
  if (section === 'parameters' || section === 'wardrobe') return readExtraSectionsSetting() && readSubscriptionFeature('extraSections')
  if (section === 'knowledge') return readSubscriptionFeature('knowledge')
  if (section === 'investments') return readSubscriptionFeature('investments')
  if (section === 'coupons') return readSubscriptionFeature('coupons')
  return true
}
