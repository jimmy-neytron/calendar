import type { ProgressChallenge } from './challengeProgress'

export interface ResultChallenge extends ProgressChallenge {
  title?: string
}

export function getRecordedResult(challenge: ResultChallenge | null | undefined, dateKey: string) {
  const value = Number(challenge?.dailyValues?.[dateKey])
  return Number.isFinite(value) && value > 0 ? value : null
}

export function getLatestResult(challenge: ResultChallenge | null | undefined, dateKey: string) {
  const entry = Object.entries(challenge?.dailyValues || {})
    .filter(([date, rawValue]) => date < dateKey && Number.isFinite(Number(rawValue)) && Number(rawValue) > 0)
    .sort(([left], [right]) => right.localeCompare(left))[0]
  return entry ? Number(entry[1]) : null
}

export function getInitialResult(challenge: ResultChallenge | null | undefined, dateKey: string) {
  const recorded = getRecordedResult(challenge, dateKey)
  if (recorded !== null) return recorded
  const latest = getLatestResult(challenge, dateKey)
  if (latest !== null) return latest

  const start = Number(challenge?.startValue)
  const target = Number(challenge?.targetValue)
  const validStart = Number.isFinite(start) && start > 0
    && (challenge?.progressDirection !== 'decrease' || !Number.isFinite(target) || start > target)
  return validStart ? start : null
}

export function getResultSuggestions(challenge: ResultChallenge | null | undefined, dateKey: string) {
  const target = Math.max(1, Number(challenge?.targetValue) || 1)
  const initial = getInitialResult(challenge, dateKey)
  if (challenge?.progressDirection === 'decrease') {
    return initial === null ? [] : uniquePositive([initial, initial - .5, initial - 1, target])
  }
  if (challenge?.goalType === 'total') {
    const dailyTarget = Math.max(1, target / Math.max(1, Number(challenge.targetDays) || 1))
    return uniquePositive([dailyTarget * .5, dailyTarget, dailyTarget * 1.5, dailyTarget * 2])
  }
  return initial === null
    ? uniquePositive([target * .5, target * .75, target])
    : uniquePositive([initial, initial * 1.05, initial * 1.1, target])
}

function uniquePositive(values: number[]) {
  return [...new Set(values.map((value) => Math.round(value * 10) / 10).filter((value) => value > 0))].slice(0, 4)
}
