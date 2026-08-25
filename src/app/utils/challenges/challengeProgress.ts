export type ChallengeGoalType = 'consistency' | 'total' | 'best'
export type ChallengeProgressDirection = 'increase' | 'decrease'

export interface ProgressChallenge {
  id?: string
  goalType?: ChallengeGoalType
  targetDays: number
  targetValue?: number
  startValue?: number
  progressDirection?: ChallengeProgressDirection
  unit?: string
  completedDates?: string[]
  dailyValues?: Record<string, number>
}

export interface ChallengeProgress {
  current: number
  target: number
  percent: number
  remaining: number
  record: number
  recordDate: string | null
}

export function getChallengeProgress(challenge: ProgressChallenge | null | undefined): ChallengeProgress {
  if (!challenge) return { current: 0, target: 1, percent: 0, remaining: 1, record: 0, recordDate: null }
  const type = challenge.goalType || 'consistency'
  const values = Object.entries(challenge.dailyValues || {}).filter(([, value]) => Number.isFinite(Number(value))).sort(([left], [right]) => left.localeCompare(right))
  const target = Math.max(1, Number(challenge.targetValue) || challenge.targetDays || 1)
  const decreases = type === 'best' && challenge.progressDirection === 'decrease'
  const recordEntry = values.reduce<[string, number] | null>((best, [date, rawValue]) => {
    const value = Number(rawValue)
    return !best || (decreases ? value < best[1] : value > best[1]) ? [date, value] : best
  }, null)
  const start = Number(challenge.startValue) || Number(values[0]?.[1]) || target
  const current = type === 'total'
    ? values.reduce((sum, [, value]) => sum + Number(value), 0)
    : type === 'best'
      ? (recordEntry?.[1] ?? (decreases ? start : 0))
      : new Set(challenge.completedDates || []).size
  const percent = decreases
    ? Math.min(100, Math.max(0, Math.round((start - current) / Math.max(.0001, start - target) * 100)))
    : Math.min(100, Math.round(current / target * 100))
  const remaining = decreases ? Math.max(0, current - target) : Math.max(0, target - current)

  return {
    current,
    target,
    percent,
    remaining,
    record: recordEntry?.[1] || 0,
    recordDate: recordEntry?.[0] || null,
  }
}

export function getChallengeStreak(completedDates: string[], todayKey: string) {
  const dates = new Set(completedDates)
  let cursor = parseDateKey(todayKey)
  if (!dates.has(toDateKey(cursor))) cursor = addDays(cursor, -1)
  let streak = 0
  while (dates.has(toDateKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function buildChallengeChart(challenge: ProgressChallenge) {
  const values = challenge.dailyValues || {}
  const completed = new Set(challenge.completedDates || [])
  const dates = [...new Set([...Object.keys(values), ...completed])].sort()
  let cumulative = 0
  return dates.map((date) => {
    const daily = Number(values[date] || 0)
    if ((challenge.goalType || 'consistency') === 'total') cumulative += daily
    return {
      key: date,
      label: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(parseDateKey(date)).replace('.', ''),
      value: challenge.goalType === 'total' ? cumulative : challenge.goalType === 'best' ? daily : 1,
    }
  })
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}
function addDays(date: Date, amount: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}
function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
