import { describe, expect, it } from 'vitest'
import { resolveWorkspaceDataSections } from './workspaceDataRoutes.js'

describe('resolveWorkspaceDataSections', () => {
  it('не загружает данные остальных разделов для календаря', () => {
    expect(resolveWorkspaceDataSections('calendar')).toEqual([])
    expect(resolveWorkspaceDataSections('settings')).toEqual([])
  })

  it('загружает только store открываемого раздела', () => {
    expect(resolveWorkspaceDataSections('investments')).toEqual(['investments'])
    expect(resolveWorkspaceDataSections('time-project')).toEqual(['time-tracking'])
  })

  it('запрашивает домены, которые могут отображаться на странице сегодня', () => {
    expect(resolveWorkspaceDataSections('today')).toEqual([
      'birthdays',
      'budget',
      'challenges',
      'coupons',
      'sport',
      'time-tracking',
    ])
  })

  it('ограничивает детальную аналитику выбранным доменом', () => {
    expect(resolveWorkspaceDataSections('analytics-sport', 'sport')).toEqual(['sport'])
    expect(resolveWorkspaceDataSections('analytics-calendar', 'calendar')).toEqual([])
  })

  it('сохраняет полную загрузку для служебных вызовов без маршрута', () => {
    expect(resolveWorkspaceDataSections()).toHaveLength(15)
  })
})
