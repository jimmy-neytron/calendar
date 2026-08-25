import { computed } from 'vue'
import { useActivityLog } from '../../composables/history/useActivityLog.js'
import { birthdayStore } from '../../stores/birthday.store.js'
import { calendarStore } from '../../stores/calendar.store.js'
import { ideaStore } from '../../stores/idea.store.js'
import { movieWatchlistStore } from '../../stores/movieWatchlist.store'
import { sportStore } from '../../stores/sport.store.js'
import { EVENT_FORM_CATEGORIES } from '../../utils/constants/calendarConstants.js'
import { DateHelper } from '../../utils/date/dateHelper.js'
import { buildSportHistoryStats } from '../../modules/sport/utils/sportHistoryStats'

export function useAnalyticsData() {
  const { workspaceActivity } = useActivityLog()
  const events = calendarStore.sortedEvents
  const watchlist = movieWatchlistStore.watchlist
  const ideas = ideaStore.ideas
  const birthdays = birthdayStore.birthdays
  const sportCompletions = sportStore.completions
  const now = new Date()

  const normalizedSportCompletions = computed(() => sportCompletions.value.map((completion) => {
    const exercise = completion.exerciseId ? sportStore.exercises.value.find((item) => item.id === completion.exerciseId) : null
    return {
      ...completion,
      durationMinutes: completion.durationMinutes ?? exercise?.durationMinutes ?? null,
      exerciseMuscleGroups: completion.exerciseMuscleGroups?.length ? completion.exerciseMuscleGroups : (exercise?.muscleGroups || []),
    }
  }))
  const sportHistory = computed(() => buildSportHistoryStats(normalizedSportCompletions.value, now))
  const eventTimeline = computed(() => buildMonthlyTimeline(events.value, (item) => item.date, now))
  const activityTimeline = computed(() => buildMonthlyTimeline(workspaceActivity.value, (item) => item.createdAt, now))
  const sportTimeline = computed(() => sportHistory.value.monthlyActivity)
  const movieTimeline = computed(() => buildMonthlyTimeline(watchlist.value, (item) => item.addedAt || item.createdAt, now))
  const ideaTimeline = computed(() => buildMonthlyTimeline(ideas.value, (item) => item.createdAt, now))

  const eventCategories = computed(() => EVENT_FORM_CATEGORIES.map((category) => ({
    label: category.label,
    color: category.color,
    value: events.value.filter((event) => event.category === category.value).length,
  })).filter((item) => item.value))
  const activityDomains = computed(() => groupBy(
    workspaceActivity.value,
    (entry) => entry.action.split(':')[0],
    { event: 'События', movie: 'Фильмы', sport: 'Спорт', idea: 'Идеи', birthday: 'Дни рождения', member: 'Участники', workspace: 'Пространство', calendar: 'Календари' },
  ))
  const movieTypes = computed(() => [
    { label: 'Фильмы', value: watchlist.value.filter((item) => item.mediaType === 'movie').length, color: 'var(--pink)' },
    { label: 'Сериалы', value: watchlist.value.filter((item) => item.mediaType === 'tv').length, color: 'var(--info)' },
  ].filter((item) => item.value))
  const ideaTypes = computed(() => groupBy(ideas.value, (idea) => idea.type, {
    place: 'Места', food: 'Еда', movie: 'Кино', activity: 'Активности', family: 'Семья', other: 'Другое',
  }))
  const birthdayMonths = computed(() => {
    const values = Array.from({ length: 12 }, (_, month) => ({
      key: String(month + 1),
      label: new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(new Date(2026, month, 1)).replace('.', ''),
      value: 0,
    }))
    birthdays.value.forEach((birthday) => {
      const date = DateHelper.parseKey(birthday.birthDate)
      if (!Number.isNaN(date.getTime())) values[date.getMonth()].value += 1
    })
    return values
  })

  const plannedMovies = computed(() => watchlist.value.filter((movie) => movie.plannedEventId).length)
  const plannedIdeas = computed(() => ideas.value.filter((idea) => idea.plannedEventId).length)
  const busyMinutes = computed(() => events.value.reduce((sum, event) => sum + durationMinutes(event), 0))
  const eventActiveDays = computed(() => uniqueDateCount(events.value, (item) => item.date))
  const activityActiveDays = computed(() => uniqueDateCount(workspaceActivity.value, (item) => item.createdAt))
  const completedGifts = computed(() => birthdays.value.reduce((sum, birthday) => sum + (birthday.giftIdeas || []).filter((gift) => gift.purchased).length, 0))
  const totalGifts = computed(() => birthdays.value.reduce((sum, birthday) => sum + (birthday.giftIdeas || []).length, 0))
  const firstDataDate = computed(() => findFirstDate([
    ...events.value.map((item) => item.date),
    ...workspaceActivity.value.map((item) => item.createdAt),
    ...normalizedSportCompletions.value.map((item) => item.date),
    ...watchlist.value.map((item) => item.addedAt || item.createdAt),
    ...ideas.value.map((item) => item.createdAt),
  ]))

  return {
    events, workspaceActivity, watchlist, ideas, birthdays, normalizedSportCompletions, sportHistory,
    eventTimeline, activityTimeline, sportTimeline, movieTimeline, ideaTimeline,
    eventCategories, activityDomains, movieTypes, ideaTypes, birthdayMonths,
    plannedMovies, plannedIdeas, busyMinutes, eventActiveDays, activityActiveDays,
    completedGifts, totalGifts, firstDataDate,
  }
}

export function buildMonthlyTimeline(items, getDate, today) {
  const dates = items.map(getDate).map(normalizeDateKey).filter(Boolean).sort()
  const todayKey = DateHelper.toKey(today)
  const firstKey = dates[0] || todayKey
  const lastKey = dates.at(-1) > todayKey ? dates.at(-1) : todayKey
  const counts = dates.reduce((result, date) => {
    const key = date.slice(0, 7)
    result[key] = (result[key] || 0) + 1
    return result
  }, {})
  const cursor = DateHelper.parseKey(`${firstKey.slice(0, 7)}-01`)
  const end = DateHelper.parseKey(`${lastKey.slice(0, 7)}-01`)
  const result = []
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    result.push({ key, label: new Intl.DateTimeFormat('ru-RU', { month: 'short', year: '2-digit' }).format(cursor).replace('.', ''), value: counts[key] || 0 })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return result
}

function groupBy(items, getKey, labels) {
  const counts = items.reduce((result, item) => {
    const key = getKey(item) || 'other'
    result[key] = (result[key] || 0) + 1
    return result
  }, {})
  return Object.entries(counts).map(([key, value], index) => ({
    label: labels[key] || key,
    value,
    color: ['var(--info)', 'var(--pink)', 'var(--success)', 'var(--warning)', 'var(--orange)', 'var(--cyan)'][index % 6],
  })).sort((a, b) => b.value - a.value)
}

function uniqueDateCount(items, getDate) {
  return new Set(items.map(getDate).map(normalizeDateKey).filter(Boolean)).size
}

function findFirstDate(values) {
  return values.map(normalizeDateKey).filter(Boolean).sort()[0] || null
}

function normalizeDateKey(value) {
  if (!value) return ''
  const direct = String(value).slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : DateHelper.toKey(date)
}

function durationMinutes(event) {
  if (event.allDay || !event.startTime || !event.endTime) return 0
  const [startHour, startMinute] = event.startTime.split(':').map(Number)
  const [endHour, endMinute] = event.endTime.split(':').map(Number)
  return Math.max(0, endHour * 60 + endMinute - startHour * 60 - startMinute)
}
