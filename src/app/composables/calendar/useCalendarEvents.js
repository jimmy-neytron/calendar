import { calendarStore } from '../../stores/calendar.store.js'

/**
 * Состояние и операции изменения событий календаря.
 * Использует хранилище через репозиторий, чтобы механизм сохранения можно было заменить.
 */
export function useCalendarEvents() {
  return calendarStore
}
