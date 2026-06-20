import { WEEK_DAYS_LONG } from '../constants/calendarConstants.js'
import { DateHelper } from '../date/dateHelper.js'

const DEFAULT_LOCALE = 'ru-RU'

/**
 * Returns YYYY-MM-DD from a Date.
 * @param {Date} date
 * @returns {string}
 */
export function toDateKey(date) {
  return DateHelper.toKey(date)
}

/**
 * Parses YYYY-MM-DD safely as local date.
 * @param {string} value
 * @returns {Date}
 */
export function parseDateKey(value) {
  return DateHelper.parseKey(value)
}

/**
 * Formats a date for UI.
 * @param {Date|string} value
 * @param {Intl.LocalesArgument} locale
 * @returns {string}
 */
export function formatDate(value, locale = DEFAULT_LOCALE) {
  const date = typeof value === 'string' ? parseDateKey(value) : value
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Formats a date as short month/day.
 * @param {Date|string} value
 * @returns {string}
 */
export function formatDateShort(value) {
  const date = typeof value === 'string' ? parseDateKey(value) : value
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

/**
 * Returns weekday label.
 * @param {Date|string} value
 * @returns {string}
 */
export function formatWeekday(value) {
  const date = typeof value === 'string' ? parseDateKey(value) : value
  return WEEK_DAYS_LONG[date.getDay()]
}

/**
 * Checks if date key is today.
 * @param {string} value
 * @returns {boolean}
 */
export function isToday(value) {
  return value === toDateKey(new Date())
}

/**
 * Adds days to date.
 * @param {Date} date
 * @param {number} amount
 * @returns {Date}
 */
export function addDays(date, amount) {
  return DateHelper.addDays(date, amount)
}

/**
 * Returns month matrix with leading/trailing days.
 * @param {Date} activeDate
 * @returns {Array<{date: Date, key: string, isCurrentMonth: boolean, isToday: boolean}>}
 */
export function getMonthGrid(activeDate) {
  const year = activeDate.getFullYear()
  const month = activeDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const gridStart = addDays(firstDay, -startOffset)
  const days = []

  for (let index = 0; index < 42; index += 1) {
    const date = addDays(gridStart, index)
    const key = toDateKey(date)

    days.push({
      date,
      key,
      isCurrentMonth: date.getMonth() === month,
      isToday: isToday(key),
    })
  }

  return days
}

/**
 * Returns week days around active date, starting Sunday.
 * @param {Date} activeDate
 * @returns {Array<{date: Date, key: string, isToday: boolean}>}
 */
export function getWeekRange(activeDate) {
  return DateHelper.getWeekDays(activeDate)
}

/**
 * Formats time range.
 * @param {string} startTime
 * @param {string} endTime
 * @param {boolean} allDay
 * @returns {string}
 */
export function formatTimeRange(startTime, endTime, allDay = false) {
  if (allDay) return 'Весь день'
  if (!startTime && !endTime) return 'Без времени'
  if (!endTime) return startTime
  return `${startTime}–${endTime}`
}

/**
 * Creates a readable month heading.
 * @param {Date} date
 * @returns {string}
 */
export function formatMonthHeading(date) {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Creates a readable day heading.
 * @param {Date} date
 * @returns {string}
 */
export function formatDayHeading(date) {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}
