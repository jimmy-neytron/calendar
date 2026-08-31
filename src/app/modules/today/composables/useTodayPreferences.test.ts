import { describe, expect, it } from 'vitest'
import { DEFAULT_TODAY_SECTION_ORDER, normalizeTodayPreferences } from './useTodayPreferences'

describe('normalizeTodayPreferences', () => {
  it('returns the complete default dashboard', () => {
    expect(normalizeTodayPreferences(null)).toEqual({
      hiddenSectionIds: [],
      sectionOrder: DEFAULT_TODAY_SECTION_ORDER,
    })
  })

  it('keeps valid preferences and removes duplicates and unknown sections', () => {
    const result = normalizeTodayPreferences({
      hiddenSectionIds: ['sport', 'unknown', 'sport'],
      sectionOrder: ['coupons', 'calendar', 'unknown', 'coupons'],
    })

    expect(result.hiddenSectionIds).toEqual(['sport'])
    expect(result.sectionOrder.slice(0, 2)).toEqual(['coupons', 'calendar'])
    expect(result.sectionOrder).toHaveLength(DEFAULT_TODAY_SECTION_ORDER.length)
  })
})
