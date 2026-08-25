import { describe, expect, it } from 'vitest'
import { buildSportActivityDays, getActivityLevel } from './sportActivityGrid'

describe('sport activity grid', () => {
  it('builds complete weeks and counts completed and missed exercises', () => {
    const result = buildSportActivityDays(
      new Date(2026, 7, 25),
      [{ date: '2026-08-25' }, { date: '2026-08-25' }],
      (key) => key === '2026-08-25' ? 3 : 0,
      2,
    )

    expect(result).toHaveLength(14)
    expect(result.find((item) => item.isToday)).toMatchObject({ key: '2026-08-25', done: 2, total: 3, missed: 1, level: 2 })
    expect(result.at(-1)?.isFuture).toBe(true)
  })

  it('maps completion ratios to four intensity levels', () => {
    expect([0, .2, .5, .8, 1].map(getActivityLevel)).toEqual([0, 1, 2, 3, 4])
  })
})
