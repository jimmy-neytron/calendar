import { describe, expect, it } from 'vitest'
import { buildMonthlyTimeline } from './useAnalyticsData.js'

describe('analytics all-time timeline', () => {
  it('keeps every month from the first account record through today', () => {
    const timeline = buildMonthlyTimeline([
      { date: '2025-11-08' },
      { date: '2025-11-20' },
      { date: '2026-02-01' },
    ], (item) => item.date, new Date(2026, 2, 15))

    expect(timeline.map((item) => item.key)).toEqual([
      '2025-11', '2025-12', '2026-01', '2026-02', '2026-03',
    ])
    expect(timeline.map((item) => item.value)).toEqual([2, 0, 0, 1, 0])
  })

  it('returns the current month when history is empty', () => {
    const timeline = buildMonthlyTimeline([], (item) => item.date, new Date(2026, 7, 25))
    expect(timeline).toMatchObject([{ key: '2026-08', value: 0 }])
  })
})
