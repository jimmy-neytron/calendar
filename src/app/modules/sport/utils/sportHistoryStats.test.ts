import { describe, expect, it } from 'vitest'
import { buildSportHistoryStats } from './sportHistoryStats'

describe('sport history stats', () => {
  it('aggregates the complete history by month and weekday', () => {
    const stats = buildSportHistoryStats([
      { date: '2026-06-01', durationMinutes: 8, exerciseMuscleGroups: ['Грудь'] },
      { date: '2026-06-01', durationMinutes: 7, exerciseMuscleGroups: ['Грудь', 'Руки'] },
      { date: '2026-06-02', durationMinutes: 10, exerciseMuscleGroups: ['Ноги'] },
      { date: '2026-08-24', durationMinutes: 5, exerciseMuscleGroups: ['Кор'] },
      { date: '2026-08-25', durationMinutes: 10, exerciseMuscleGroups: ['Спина'] },
    ], new Date(2026, 7, 25))

    expect(stats.totalCompletions).toBe(5)
    expect(stats.activeDays).toBe(4)
    expect(stats.activeMonths).toBe(2)
    expect(stats.longestStreak).toBe(2)
    expect(stats.currentStreak).toBe(2)
    expect(stats.monthlyActivity.map((item) => item.value)).toEqual([3, 0, 2])
    expect(stats.monthlyActiveDays.map((item) => item.value)).toEqual([2, 0, 2])
    expect(stats.weekdayActivity.find((item) => item.label === 'Пн')?.value).toBe(3)
    expect(stats.totalDurationMinutes).toBe(40)
    expect(stats.muscleActivity.find((item) => item.label === 'Грудь')?.value).toBe(2)
  })

  it('returns stable empty-state values', () => {
    const stats = buildSportHistoryStats([], new Date(2026, 7, 25))
    expect(stats).toMatchObject({ totalCompletions: 0, activeDays: 0, longestStreak: 0, currentStreak: 0, firstActivityDate: null })
    expect(stats.monthlyActivity).toHaveLength(1)
  })
})
