import { computed } from 'vue'
import { useActivityLog } from '../../composables/history/useActivityLog.js'
import { birthdayStore } from '../../stores/birthday.store.js'
import { calendarStore } from '../../stores/calendar.store.js'
import { ideaStore } from '../../stores/idea.store.js'
import { movieWatchlistStore } from '../../stores/movieWatchlist.store'
import { sportStore } from '../../stores/sport.store.js'
import { EVENT_FORM_CATEGORIES } from '../../utils/constants/calendarConstants.js'
import { DateHelper } from '../../utils/date/dateHelper.js'

const DAY_MS = 86400000

export function useAnalyticsData() {
  const { workspaceActivity } = useActivityLog()
  const watchlist = movieWatchlistStore.watchlist
  const ideas = ideaStore.ideas
  const birthdays = birthdayStore.birthdays
  const sportProgress = sportStore.weekProgress
  const today = new Date()
  const start = startOfDay(DateHelper.addDays(today, -6))
  const end = DateHelper.addDays(startOfDay(today), 1)

  const weekEvents = computed(() => calendarStore.sortedEvents.value.filter((event) => {
    const date = DateHelper.parseKey(event.date)
    return date >= start && date < end
  }))
  const weekActivity = computed(() => workspaceActivity.value.filter((entry) => {
    const date = new Date(entry.createdAt)
    return date >= start && date < end
  }))
  const plannedMovies = computed(() => watchlist.value.filter((movie) => movie.plannedEventId).length)
  const plannedIdeas = computed(() => ideas.value.filter((idea) => idea.plannedEventId).length)

  const days = computed(() => Array.from({ length: 7 }, (_, index) => {
    const date = DateHelper.addDays(start, index)
    const key = DateHelper.toKey(date)
    return {
      key,
      label: new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date).replace('.', ''),
      dateLabel: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date).replace('.', ''),
      events: weekEvents.value.filter((event) => event.date === key).length,
      activity: weekActivity.value.filter((entry) => DateHelper.toKey(new Date(entry.createdAt)) === key).length,
      sport: sportProgress.value.days.find((day) => day.key === key)?.done || 0,
    }
  }))

  const eventCategories = computed(() => EVENT_FORM_CATEGORIES.map((category) => ({
    label: category.label,
    color: category.color,
    value: weekEvents.value.filter((event) => event.category === category.value).length,
  })).filter((item) => item.value))

  const activityDomains = computed(() => groupBy(
    weekActivity.value,
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
      label: new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(new Date(2026, month, 1)).replace('.', ''),
      value: 0,
    }))
    birthdays.value.forEach((birthday) => {
      const date = DateHelper.parseKey(birthday.birthDate)
      if (!Number.isNaN(date.getTime())) values[date.getMonth()].value += 1
    })
    return values
  })
  const busyMinutes = computed(() => weekEvents.value.reduce((sum, event) => sum + durationMinutes(event), 0))
  const completedGifts = computed(() => birthdays.value.reduce(
    (sum, birthday) => sum + (birthday.giftIdeas || []).filter((gift) => gift.purchased).length, 0,
  ))
  const totalGifts = computed(() => birthdays.value.reduce((sum, birthday) => sum + (birthday.giftIdeas || []).length, 0))

  return {
    watchlist, ideas, birthdays, sportProgress, weekEvents, weekActivity, days,
    eventCategories, activityDomains, movieTypes, ideaTypes, birthdayMonths,
    plannedMovies, plannedIdeas, busyMinutes, completedGifts, totalGifts,
    workspaceActivity,
  }
}

function groupBy(items, getKey, labels) {
  const counts = items.reduce((result, item) => {
    const key = getKey(item) || 'other'
    result[key] = (result[key] || 0) + 1
    return result
  }, {})
  return Object.entries(counts)
    .map(([key, value], index) => ({
      label: labels[key] || key,
      value,
      color: ['var(--info)', 'var(--pink)', 'var(--success)', 'var(--warning)', 'var(--orange)', 'var(--cyan)'][index % 6],
    }))
    .sort((a, b) => b.value - a.value)
}

function durationMinutes(event) {
  if (event.allDay || !event.startTime || !event.endTime) return 0
  const [startHour, startMinute] = event.startTime.split(':').map(Number)
  const [endHour, endMinute] = event.endTime.split(':').map(Number)
  return Math.max(0, endHour * 60 + endMinute - startHour * 60 - startMinute)
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
