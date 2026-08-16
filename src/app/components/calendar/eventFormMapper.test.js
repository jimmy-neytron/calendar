import { describe, expect, it } from 'vitest'
import { addMinutesToEventTime, createEmptyEventForm, normalizeEventForm } from './eventFormMapper.js'

describe('форма события', () => {
  it('создаёт независимую форму с понятными значениями по умолчанию', () => {
    const first = createEmptyEventForm({ date: '2026-08-16', calendarId: 'main' })
    const second = createEmptyEventForm({ date: '2026-08-16', calendarId: 'main' })
    first.comments.push({ id: '1' })
    expect(second.comments).toEqual([])
    expect(first).toMatchObject({ date: '2026-08-16', calendarId: 'main', startTime: '09:00', endTime: '10:00' })
  })

  it('нормализует старые настройки повторения и копирует массивы', () => {
    const source = { repeatUntil: '2026-12-01', repeatInterval: 0, repeatWeekdays: ['1', '3'], comments: [] }
    const result = normalizeEventForm(source)
    expect(result).toMatchObject({ repeatEndType: 'until', repeatInterval: 1, repeatWeekdays: [1, 3] })
    expect(result.comments).not.toBe(source.comments)
  })

  it('изменяет время в допустимых границах суток', () => {
    expect(addMinutesToEventTime('09:30', 60)).toBe('10:30')
    expect(addMinutesToEventTime('23:30', 60)).toBe('23:59')
    expect(addMinutesToEventTime('bad', 60)).toBe('')
  })
})
