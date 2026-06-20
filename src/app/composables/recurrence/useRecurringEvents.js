import { DateHelper } from '../../utils/date/dateHelper.js'

const MAX_OCCURRENCES = 520
const WORKDAYS = new Set([1, 2, 3, 4, 5])

export function useRecurringEvents() {
  const expandRecurringEvents = (events, fromDate = DateHelper.addYears(new Date(), -1), toDate = DateHelper.addYears(new Date(), 1)) => {
    const fromKey = DateHelper.toKey(fromDate)
    const toKey = DateHelper.toKey(toDate)

    return events.flatMap((event) => {
      if (!event.repeat || event.repeat === 'none') return [event]
      return generateOccurrences(event, fromKey, toKey)
    })
  }

  return { expandRecurringEvents }
}

export function generateOccurrences(event, fromKey, toKey) {
  const occurrences = []
  const maxCount = getMaxCount(event)
  let currentDate = DateHelper.parseKey(event.date)
  let generatedCount = 0
  let loopGuard = 0

  while (loopGuard < MAX_OCCURRENCES) {
    const currentKey = DateHelper.toKey(currentDate)
    if (currentKey > toKey || isAfterRepeatEnd(event, currentKey, generatedCount)) break

    if (currentKey >= fromKey && shouldIncludeDate(event, currentDate)) {
      occurrences.push({
        ...event,
        id: `${event.id}::${currentKey}`,
        parentId: event.id,
        date: currentKey,
        isRecurringOccurrence: currentKey !== event.date,
      })
      generatedCount += 1
      if (maxCount && generatedCount >= maxCount) break
    }

    currentDate = getNextOccurrenceDate(currentDate, event)
    loopGuard += 1
  }

  return occurrences
}

function isAfterRepeatEnd(event, currentKey, generatedCount) {
  if (event.repeatEndType === 'until' && event.repeatUntil && currentKey > event.repeatUntil) return true
  if (event.repeatEndType === 'count' && Number(event.repeatCount || 0) > 0 && generatedCount >= Number(event.repeatCount)) return true
  if (!event.repeatEndType && event.repeatUntil && currentKey > event.repeatUntil) return true
  return false
}

function getMaxCount(event) {
  if (event.repeatEndType !== 'count') return 0
  return Math.max(1, Math.min(Number(event.repeatCount || 1), MAX_OCCURRENCES))
}

function shouldIncludeDate(event, date) {
  const weekday = date.getDay()
  if (event.repeat === 'workdays') return WORKDAYS.has(weekday)
  if (event.repeat === 'custom' && event.repeatUnit === 'week' && Array.isArray(event.repeatWeekdays) && event.repeatWeekdays.length) {
    const baseDate = DateHelper.parseKey(event.date)
    const diffDays = Math.floor((DateHelper.parseKey(DateHelper.toKey(date)) - DateHelper.parseKey(DateHelper.toKey(baseDate))) / 86400000)
    const weekOffset = Math.floor(diffDays / 7)
    const interval = Math.max(1, Number(event.repeatInterval || 1))
    return weekOffset % interval === 0 && event.repeatWeekdays.map(Number).includes(weekday)
  }
  return true
}

function getNextOccurrenceDate(date, event) {
  if (event.repeat === 'workdays') return DateHelper.addDays(date, 1)
  if (event.repeat === 'daily') return DateHelper.addDays(date, 1)
  if (event.repeat === 'weekly') return DateHelper.addDays(date, 7)
  if (event.repeat === 'biweekly') return DateHelper.addDays(date, 14)
  if (event.repeat === 'monthly') return DateHelper.addMonths(date, 1)
  if (event.repeat === 'yearly') return DateHelper.addYears(date, 1)

  if (event.repeat === 'custom') {
    const interval = Math.max(1, Number(event.repeatInterval || 1))
    if (event.repeatUnit === 'week') return DateHelper.addDays(date, 1)
    if (event.repeatUnit === 'month') return DateHelper.addMonths(date, interval)
    return DateHelper.addDays(date, interval)
  }

  return DateHelper.addDays(date, 1)
}
