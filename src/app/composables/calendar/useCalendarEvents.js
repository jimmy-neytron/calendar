import { calendarStore } from '../../stores/calendar.store.js'

/**
 * Calendar event state and mutations.
 * Uses a repository-backed store so persistence can be replaced later.
 */
export function useCalendarEvents() {
  return calendarStore
}
