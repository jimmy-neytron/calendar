import { describe, expect, it } from 'vitest'
import { buildChallengeChart, getChallengeProgress, getChallengeStreak } from './challengeProgress'

describe('challenge progress', () => {
  it('supports consistency, totals and personal best goals', () => {
    expect(getChallengeProgress({ targetDays: 30, targetValue: 12, completedDates: ['2026-08-01', '2026-08-02'] })).toMatchObject({ current: 2, target: 12, percent: 17 })
    expect(getChallengeProgress({ goalType: 'total', targetDays: 30, targetValue: 100, dailyValues: { '2026-08-01': 20, '2026-08-02': 35 } })).toMatchObject({ current: 55, remaining: 45, record: 35 })
    expect(getChallengeProgress({ goalType: 'best', targetDays: 30, targetValue: 60, dailyValues: { '2026-08-01': 40, '2026-08-02': 52 } })).toMatchObject({ current: 52, recordDate: '2026-08-02' })
  })

  it('calculates streak and cumulative total chart', () => {
    expect(getChallengeStreak(['2026-08-23', '2026-08-24', '2026-08-25'], '2026-08-26')).toBe(3)
    expect(buildChallengeChart({ goalType: 'total', targetDays: 30, dailyValues: { '2026-08-01': 10, '2026-08-03': 15 } }).map((item) => item.value)).toEqual([10, 25])
  })

  it('treats a lower value as progress for decrease goals', () => {
    const progress = getChallengeProgress({
      goalType: 'best', progressDirection: 'decrease', startValue: 90, targetValue: 80, targetDays: 60,
      dailyValues: { '2026-08-01': 90, '2026-08-10': 87, '2026-08-20': 88 },
    })
    expect(progress).toMatchObject({ current: 87, target: 80, percent: 30, remaining: 7, record: 87, recordDate: '2026-08-10' })
  })
})
