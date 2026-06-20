import { WEEK_DAYS_LONG } from '../constants/calendarConstants.js'

export class DateHelper {
  static toKey(date) {
    const source = typeof date === 'string' ? DateHelper.parseKey(date) : date
    const year = source.getFullYear()
    const month = String(source.getMonth() + 1).padStart(2, '0')
    const day = String(source.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  static parseKey(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return new Date(Number.NaN)
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  static isValidKey(value) {
    const date = DateHelper.parseKey(value)
    return !Number.isNaN(date.getTime()) && DateHelper.toKey(date) === value
  }

  static isToday(value) {
    return DateHelper.toKey(value) === DateHelper.toKey(new Date())
  }

  static addDays(date, amount) {
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + amount)
    return nextDate
  }

  static addMonths(date, amount) {
    const nextDate = new Date(date)
    nextDate.setMonth(nextDate.getMonth() + amount)
    return nextDate
  }

  static addYears(date, amount) {
    const nextDate = new Date(date)
    nextDate.setFullYear(nextDate.getFullYear() + amount)
    return nextDate
  }

  static getWeekDays(date) {
    const start = DateHelper.addDays(date, -date.getDay())
    return Array.from({ length: 7 }, (_, index) => {
      const day = DateHelper.addDays(start, index)
      return {
        date: day,
        key: DateHelper.toKey(day),
        isToday: DateHelper.isToday(day),
      }
    })
  }

  static formatTime(value) {
    if (!value) return ''
    const [hours, minutes] = value.split(':')
    return `${hours}:${minutes}`
  }

  static formatWeekday(value) {
    const date = typeof value === 'string' ? DateHelper.parseKey(value) : value
    return WEEK_DAYS_LONG[date.getDay()]
  }
}
