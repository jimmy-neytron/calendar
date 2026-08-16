import { describe, expect, it } from 'vitest'
import { DateHelper } from './dateHelper.js'

describe('DateHelper', () => {
  it('строго проверяет календарные ключи', () => {
    expect(DateHelper.isValidKey('2026-02-28')).toBe(true)
    expect(DateHelper.isValidKey('2026-02-29')).toBe(false)
    expect(DateHelper.isValidKey('2024-02-29')).toBe(true)
    expect(DateHelper.isValidKey('28.02.2026')).toBe(false)
  })

  it('не зависит от UTC при преобразовании локальной даты', () => {
    expect(DateHelper.toKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
    expect(DateHelper.toKey(DateHelper.parseKey('2026-07-01'))).toBe('2026-07-01')
  })

  it('ограничивает день последним днём целевого месяца', () => {
    expect(DateHelper.toKey(DateHelper.addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28')
    expect(DateHelper.toKey(DateHelper.addMonths(new Date(2024, 0, 31), 1))).toBe('2024-02-29')
  })

  it('корректно переносит високосный день на обычный год', () => {
    expect(DateHelper.toKey(DateHelper.addYears(new Date(2024, 1, 29), 1))).toBe('2025-02-28')
  })

  it('строит полную неделю с воскресенья', () => {
    const week = DateHelper.getWeekDays(new Date(2026, 6, 1))
    expect(week.map((day) => day.key)).toEqual([
      '2026-06-28', '2026-06-29', '2026-06-30', '2026-07-01',
      '2026-07-02', '2026-07-03', '2026-07-04',
    ])
  })
})
