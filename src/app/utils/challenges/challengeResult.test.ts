import { describe, expect, it } from 'vitest'
import { getInitialResult, getLatestResult, getRecordedResult, getResultSuggestions } from './challengeResult'

describe('challenge result input', () => {
  it('never substitutes the target weight when a legacy decrease goal has no valid start', () => {
    const challenge = { goalType: 'best' as const, progressDirection: 'decrease' as const, targetDays: 60, targetValue: 75, startValue: 0, dailyValues: {} }
    expect(getInitialResult(challenge, '2026-08-31')).toBeNull()
    expect(getResultSuggestions(challenge, '2026-08-31')).toEqual([])
  })

  it('starts a decrease measurement with the configured current value', () => {
    const challenge = { goalType: 'best' as const, progressDirection: 'decrease' as const, targetDays: 60, targetValue: 75, startValue: 85, dailyValues: {} }
    expect(getInitialResult(challenge, '2026-08-31')).toBe(85)
    expect(getResultSuggestions(challenge, '2026-08-31')).toEqual([85, 84.5, 84, 75])
  })

  it('uses the selected day, then the latest earlier measurement', () => {
    const challenge = { targetDays: 60, dailyValues: { '2026-08-01': 85, '2026-08-10': 83.4, '2026-08-20': 82.8 } }
    expect(getRecordedResult(challenge, '2026-08-10')).toBe(83.4)
    expect(getLatestResult(challenge, '2026-08-15')).toBe(83.4)
    expect(getInitialResult(challenge, '2026-08-15')).toBe(83.4)
  })

  it('does not use a future measurement when filling a past date', () => {
    expect(getInitialResult({ targetDays: 60, startValue: 85, dailyValues: { '2026-08-20': 82.8 } }, '2026-08-10')).toBe(85)
  })

  it('suggests a daily amount for cumulative goals', () => {
    expect(getResultSuggestions({ goalType: 'total', targetDays: 10, targetValue: 100 }, '2026-08-31')).toEqual([5, 10, 15, 20])
  })
})
