export const WORKSPACE_DATA_SECTIONS = Object.freeze({
  ACTIVITY: 'activity',
  BIRTHDAYS: 'birthdays',
  BUDGET: 'budget',
  CHALLENGES: 'challenges',
  COUPONS: 'coupons',
  IDEAS: 'ideas',
  INVESTMENTS: 'investments',
  KNOWLEDGE: 'knowledge',
  MOVIES: 'movies',
  NOTES: 'notes',
  PARAMETERS: 'parameters',
  PURCHASES: 'purchases',
  SPORT: 'sport',
  TIME_TRACKING: 'time-tracking',
  WARDROBE: 'wardrobe',
})

const ALL_SECTIONS = Object.freeze(Object.values(WORKSPACE_DATA_SECTIONS))

const ROUTE_SECTIONS = Object.freeze({
  today: [
    WORKSPACE_DATA_SECTIONS.BIRTHDAYS,
    WORKSPACE_DATA_SECTIONS.BUDGET,
    WORKSPACE_DATA_SECTIONS.CHALLENGES,
    WORKSPACE_DATA_SECTIONS.COUPONS,
    WORKSPACE_DATA_SECTIONS.SPORT,
    WORKSPACE_DATA_SECTIONS.TIME_TRACKING,
  ],
  activity: [WORKSPACE_DATA_SECTIONS.ACTIVITY],
  birthdays: [WORKSPACE_DATA_SECTIONS.BIRTHDAYS],
  budget: [WORKSPACE_DATA_SECTIONS.BUDGET],
  challenges: [WORKSPACE_DATA_SECTIONS.CHALLENGES],
  coupons: [WORKSPACE_DATA_SECTIONS.COUPONS],
  ideas: [WORKSPACE_DATA_SECTIONS.IDEAS],
  investments: [WORKSPACE_DATA_SECTIONS.INVESTMENTS],
  knowledge: [WORKSPACE_DATA_SECTIONS.KNOWLEDGE],
  movies: [WORKSPACE_DATA_SECTIONS.MOVIES],
  notes: [WORKSPACE_DATA_SECTIONS.NOTES],
  'personal-parameters': [WORKSPACE_DATA_SECTIONS.PARAMETERS],
  purchases: [WORKSPACE_DATA_SECTIONS.PURCHASES],
  sport: [WORKSPACE_DATA_SECTIONS.SPORT],
  'time-project': [WORKSPACE_DATA_SECTIONS.TIME_TRACKING],
  'time-tracking': [WORKSPACE_DATA_SECTIONS.TIME_TRACKING],
  wardrobe: [WORKSPACE_DATA_SECTIONS.WARDROBE],
})

const ANALYTICS_SECTIONS = Object.freeze({
  activity: [WORKSPACE_DATA_SECTIONS.ACTIVITY],
  birthdays: [WORKSPACE_DATA_SECTIONS.BIRTHDAYS],
  calendar: [],
  ideas: [WORKSPACE_DATA_SECTIONS.IDEAS],
  movies: [WORKSPACE_DATA_SECTIONS.MOVIES],
  sport: [WORKSPACE_DATA_SECTIONS.SPORT],
})

const ANALYTICS_OVERVIEW_SECTIONS = Object.freeze([
  WORKSPACE_DATA_SECTIONS.ACTIVITY,
  WORKSPACE_DATA_SECTIONS.BIRTHDAYS,
  WORKSPACE_DATA_SECTIONS.IDEAS,
  WORKSPACE_DATA_SECTIONS.MOVIES,
  WORKSPACE_DATA_SECTIONS.SPORT,
])

export function resolveWorkspaceDataSections(routeName, analyticsSection = '') {
  if (!routeName) return [...ALL_SECTIONS]
  if (routeName === 'analytics') return [...ANALYTICS_OVERVIEW_SECTIONS]
  if (String(routeName).startsWith('analytics-')) {
    return [...(ANALYTICS_SECTIONS[analyticsSection] || [])]
  }
  return [...(ROUTE_SECTIONS[routeName] || [])]
}
