export const LINKED_ENTITY_TYPES = Object.freeze({
  BUDGET_PAYMENT: 'budget-payment',
  COURSE_LESSON: 'course-lesson',
  BIRTHDAY: 'birthday',
  BIRTHDAY_REMINDER: 'birthday-reminder',
  IDEA: 'idea',
  MOVIE_WATCHLIST: 'movie-watchlist',
  FAMILY_TREE: 'family-tree',
  SPORT: 'sport',
  SPORT_EXERCISE: 'sport-exercise',
  TIME_TRACKING: 'time-tracking',
  TIME_ENTRY: 'time-entry',
  TIME_PROJECT: 'time-project',
})

export const CALENDAR_LINK_CHANGE_EVENT = 'calendar-linked-event-change'

const EXTRA_SECTION_EVENT_TYPES = new Set([
  LINKED_ENTITY_TYPES.MOVIE_WATCHLIST,
  LINKED_ENTITY_TYPES.FAMILY_TREE,
  LINKED_ENTITY_TYPES.SPORT,
  LINKED_ENTITY_TYPES.SPORT_EXERCISE,
  LINKED_ENTITY_TYPES.TIME_TRACKING,
  LINKED_ENTITY_TYPES.TIME_ENTRY,
  LINKED_ENTITY_TYPES.TIME_PROJECT,
])

export function isExtraSectionEvent(event) {
  return EXTRA_SECTION_EVENT_TYPES.has(event?.linkedEntityType)
    || event?.category === 'sports'
    || event?.calendarId === 'calendar-sport'
}
