import { describe, expect, it } from 'vitest'
import { SIDEBAR_SECTION_IDS } from '../../navigation/sidebarSections'
import { normalizeSidebarPreferences } from './useSidebarPreferences'

describe('normalizeSidebarPreferences', () => {
  it('uses the full catalog for a new user', () => {
    const result = normalizeSidebarPreferences(null)

    expect(result.visibleSectionIds).toEqual(SIDEBAR_SECTION_IDS)
    expect(result.sectionOrder).toEqual(SIDEBAR_SECTION_IDS)
    expect(result.mobileFavoriteIds).toHaveLength(4)
  })

  it('removes unknown and duplicate ids while preserving hidden sections', () => {
    const result = normalizeSidebarPreferences({
      visibleSectionIds: ['calendar', 'settings', 'calendar', 'unknown'],
      sectionOrder: ['notes', 'calendar', 'unknown', 'notes'],
      mobileFavoriteIds: ['notes', 'calendar', 'budget', 'sport', 'ideas', 'unknown'],
    })

    expect(result.visibleSectionIds).toEqual(['calendar', 'settings'])
    expect(result.sectionOrder.slice(0, 2)).toEqual(['notes', 'calendar'])
    expect(result.sectionOrder).toHaveLength(SIDEBAR_SECTION_IDS.length)
    expect(result.mobileFavoriteIds).toEqual(['notes', 'calendar', 'budget', 'sport'])
  })
})
