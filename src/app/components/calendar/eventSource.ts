import type { RouteLocationRaw } from 'vue-router'

interface LinkedEvent {
  linkedEntityType?: string
  linkedEntityId?: string
}
interface EventSource {
  label: string
  icon: string
  color: string
  action: string
  route?: string
  query?: string
}

const sources: Record<string, EventSource> = {
  'budget-payment': { label: 'Бюджет', icon: 'wallet', color: 'var(--success)', action: 'Открыть платёж' },
  'course-lesson': { label: 'Обучение', icon: 'book', color: 'var(--accent)', action: 'Открыть урок' },
  birthday: { label: 'Дни рождения', icon: 'heart', color: 'var(--pink)', action: 'Открыть день рождения', route: 'birthdays', query: 'birthday' },
  'birthday-reminder': { label: 'Дни рождения', icon: 'heart', color: 'var(--pink)', action: 'Открыть день рождения', route: 'birthdays', query: 'birthday' },
  idea: { label: 'Идеи', icon: 'sparkles', color: 'var(--warning)', action: 'Открыть идею', route: 'ideas', query: 'idea' },
  'movie-watchlist': { label: 'Фильмы и сериалы', icon: 'movie', color: 'var(--accent)', action: 'Открыть фильм', route: 'movies', query: 'movie' },
  'family-tree': { label: 'Семейное дерево', icon: 'network', color: 'var(--success)', action: 'Открыть раздел', route: 'family-tree' },
  sport: { label: 'Спорт', icon: 'sport', color: 'var(--success)', action: 'Открыть раздел', route: 'sport' },
  'sport-exercise': { label: 'Спорт', icon: 'sport', color: 'var(--success)', action: 'Открыть раздел', route: 'sport' },
  'time-tracking': { label: 'Учёт времени', icon: 'clock', color: 'var(--info)', action: 'Открыть раздел', route: 'time-tracking' },
  'time-entry': { label: 'Учёт времени', icon: 'clock', color: 'var(--info)', action: 'Открыть раздел', route: 'time-tracking' },
  'time-project': { label: 'Учёт времени', icon: 'clock', color: 'var(--info)', action: 'Открыть раздел', route: 'time-tracking' },
}

export function getEventSource(event: LinkedEvent | null | undefined): EventSource | null {
  if (!event?.linkedEntityType) return null
  return sources[event.linkedEntityType] ?? { label: 'Другой раздел', icon: 'link', color: 'var(--text-secondary)', action: '' }
}

export function getEventSourceRoute(event: LinkedEvent): RouteLocationRaw | null {
  const source = getEventSource(event)
  if (!source?.route || !event.linkedEntityId) return null
  // Watchlist record IDs include the workspace; the movie page expects mediaType:id.
  const id = event.linkedEntityType === 'movie-watchlist'
    ? event.linkedEntityId.split(':').slice(-2).join(':')
    : event.linkedEntityId
  return { name: source.route, ...(source.query ? { query: { [source.query]: id } } : {}) }
}
