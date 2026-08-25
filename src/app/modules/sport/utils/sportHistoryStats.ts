export interface SportHistoryCompletion {
  date?: string
  durationMinutes?: number | null
  exerciseMuscleGroups?: string[]
}

export interface SportHistoryPoint {
  key: string
  label: string
  value: number
}

export interface SportHistoryStats {
  totalCompletions: number
  activeDays: number
  activeMonths: number
  longestStreak: number
  currentStreak: number
  averagePerActiveDay: number
  totalDurationMinutes: number
  firstActivityDate: string | null
  monthlyActivity: SportHistoryPoint[]
  monthlyActiveDays: SportHistoryPoint[]
  weekdayActivity: SportHistoryPoint[]
  muscleActivity: SportHistoryPoint[]
}

const WEEKDAYS = [
  { key: '1', label: 'Пн' }, { key: '2', label: 'Вт' }, { key: '3', label: 'Ср' },
  { key: '4', label: 'Чт' }, { key: '5', label: 'Пт' }, { key: '6', label: 'Сб' }, { key: '0', label: 'Вс' },
]

const MUSCLE_GROUPS = [
  { key: 'chest', label: 'Грудь', aliases: ['груд'] },
  { key: 'back', label: 'Спина', aliases: ['спин', 'широч'] },
  { key: 'shoulders', label: 'Плечи', aliases: ['плеч', 'дельт'] },
  { key: 'arms', label: 'Руки', aliases: ['рук', 'бицеп', 'трицеп', 'предплеч'] },
  { key: 'legs', label: 'Ноги', aliases: ['ног', 'бедр', 'квадриц', 'икр'] },
  { key: 'glutes', label: 'Ягодицы', aliases: ['ягод'] },
  { key: 'core', label: 'Кор', aliases: ['кор', 'пресс', 'живот'] },
]

export function buildSportHistoryStats(completions: SportHistoryCompletion[], today = new Date()): SportHistoryStats {
  const todayKey = toDateKey(today)
  const validDates = completions
    .map((item) => item.date || '')
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= todayKey)
  const uniqueDates = [...new Set(validDates)].sort()
  const monthlyActivity = buildMonthlyActivity(validDates, uniqueDates[0] || todayKey, today)
  const monthlyActiveDays = buildMonthlyActivity(uniqueDates, uniqueDates[0] || todayKey, today)
  const weekdayCounts = Object.fromEntries(WEEKDAYS.map((item) => [item.key, 0])) as Record<string, number>
  validDates.forEach((dateKey) => {
    const weekday = String(parseDateKey(dateKey).getDay())
    weekdayCounts[weekday] += 1
  })
  const streaks = calculateStreaks(uniqueDates, todayKey)
  const muscleCounts = Object.fromEntries(MUSCLE_GROUPS.map((item) => [item.key, 0])) as Record<string, number>
  completions.forEach((completion) => {
    const muscles = (completion.exerciseMuscleGroups || []).join(' ').toLowerCase()
    MUSCLE_GROUPS.forEach((group) => {
      if (group.aliases.some((alias) => muscles.includes(alias))) muscleCounts[group.key] += 1
    })
  })

  return {
    totalCompletions: validDates.length,
    activeDays: uniqueDates.length,
    activeMonths: monthlyActivity.filter((item) => item.value > 0).length,
    longestStreak: streaks.longest,
    currentStreak: streaks.current,
    averagePerActiveDay: uniqueDates.length ? validDates.length / uniqueDates.length : 0,
    totalDurationMinutes: completions.reduce((sum, item) => sum + Math.max(0, Number(item.durationMinutes) || 0), 0),
    firstActivityDate: uniqueDates[0] || null,
    monthlyActivity,
    monthlyActiveDays,
    weekdayActivity: WEEKDAYS.map((item) => ({ ...item, value: weekdayCounts[item.key] })),
    muscleActivity: MUSCLE_GROUPS.map((item) => ({ key: item.key, label: item.label, value: muscleCounts[item.key] })),
  }
}

function buildMonthlyActivity(dates: string[], firstDateKey: string, today: Date): SportHistoryPoint[] {
  const counts = dates.reduce<Record<string, number>>((result, date) => {
    const key = date.slice(0, 7)
    result[key] = (result[key] || 0) + 1
    return result
  }, {})
  const cursor = parseDateKey(`${firstDateKey.slice(0, 7)}-01`)
  const end = new Date(today.getFullYear(), today.getMonth(), 1)
  const points: SportHistoryPoint[] = []
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    points.push({
      key,
      label: new Intl.DateTimeFormat('ru-RU', { month: 'short', year: '2-digit' }).format(cursor).replace('.', ''),
      value: counts[key] || 0,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return points
}

function calculateStreaks(sortedDates: string[], todayKey: string) {
  if (!sortedDates.length) return { longest: 0, current: 0 }
  let longest = 1
  let running = 1
  for (let index = 1; index < sortedDates.length; index += 1) {
    running = dayDistance(sortedDates[index - 1], sortedDates[index]) === 1 ? running + 1 : 1
    longest = Math.max(longest, running)
  }
  const lastDate = sortedDates.at(-1)!
  const distanceFromToday = dayDistance(lastDate, todayKey)
  if (distanceFromToday > 1) return { longest, current: 0 }
  let current = 1
  for (let index = sortedDates.length - 1; index > 0; index -= 1) {
    if (dayDistance(sortedDates[index - 1], sortedDates[index]) !== 1) break
    current += 1
  }
  return { longest, current }
}

function dayDistance(from: string, to: string) {
  const start = parseDateKey(from)
  const end = parseDateKey(to)
  return Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000)
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
