import { describe, expect, it } from 'vitest'
import { generateOccurrences } from './useRecurringEvents.js'

const baseEvent = {
  id: 'event-1',
  title: 'Повтор',
  date: '2026-01-01',
}

describe('повторяющиеся события', () => {
  it('создаёт еженедельные вхождения в заданном диапазоне', () => {
    const result = generateOccurrences(
      { ...baseEvent, repeat: 'weekly' },
      '2026-01-01',
      '2026-01-22'
    )
    expect(result.map((event) => event.date)).toEqual([
      '2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22',
    ])
    expect(result[0]).toMatchObject({ parentId: 'event-1', isRecurringOccurrence: false })
    expect(result[1].id).toBe('event-1::2026-01-08')
  })

  it('соблюдает общий лимит повторений даже если диапазон начинается позже', () => {
    const result = generateOccurrences(
      { ...baseEvent, repeat: 'daily', repeatEndType: 'count', repeatCount: 3 },
      '2026-01-10',
      '2026-01-20'
    )
    expect(result).toEqual([])
  })

  it('пропускает выходные для рабочих дней', () => {
    const result = generateOccurrences(
      { ...baseEvent, date: '2026-01-02', repeat: 'workdays' },
      '2026-01-02',
      '2026-01-07'
    )
    expect(result.map((event) => event.date)).toEqual([
      '2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07',
    ])
  })

  it('сохраняет последний доступный день при ежемесячном повторе', () => {
    const result = generateOccurrences(
      { ...baseEvent, date: '2026-01-31', repeat: 'monthly' },
      '2026-01-01',
      '2026-03-31'
    )
    expect(result.map((event) => event.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })
})
