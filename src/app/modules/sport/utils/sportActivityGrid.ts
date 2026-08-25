export interface SportActivityDay {
  key: string
  date: Date
  done: number
  total: number
  missed: number
  level: 0 | 1 | 2 | 3 | 4
  isToday: boolean
  isFuture: boolean
  label: string
}

export interface SportCompletionLike {
  date?: string
}

export function buildSportActivityDays(
  today: Date,
  completions: SportCompletionLike[],
  getTotal: (dateKey: string) => number,
  weeks = 53,
): SportActivityDay[] {
  const currentDay = startOfDay(today)
  const lastDay = addDays(currentDay, 6 - currentDay.getDay())
  const start = addDays(lastDay, -((weeks * 7) - 1))
  const completionCounts = completions.reduce<Record<string, number>>((counts, completion) => {
    if (completion.date) counts[completion.date] = (counts[completion.date] || 0) + 1
    return counts
  }, {})

  return Array.from({ length: weeks * 7 }, (_, index) => {
    const date = addDays(start, index)
    const key = toDateKey(date)
    const isFuture = date > currentDay
    const done = isFuture ? 0 : (completionCounts[key] || 0)
    const total = isFuture ? 0 : getTotal(key)
    const ratio = total ? done / total : done ? 1 : 0
    return {
      key,
      date,
      done,
      total,
      missed: Math.max(0, total - done),
      level: getActivityLevel(ratio),
      isToday: key === toDateKey(currentDay),
      isFuture,
      label: new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(date),
    }
  })
}

export function getActivityLevel(ratio: number): 0 | 1 | 2 | 3 | 4 {
  if (ratio <= 0) return 0
  if (ratio < .34) return 1
  if (ratio < .67) return 2
  if (ratio < 1) return 3
  return 4
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, amount: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
