import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseSmartEvent } from './smartEventParser.js'

describe('умный ввод событий', () => {
  afterEach(() => vi.useRealTimers())

  it('разбирает дату, время, длительность, участника и категорию', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 16, 12))

    const result = parseSmartEvent(
      'Добавь тренировка завтра в 18:30 на 1,5 часа @аня #спорт !важно напомни за час',
      {
        members: [{ id: 'member-1', name: 'Аня' }],
        calendars: [{ id: 'sport-calendar', name: 'Спорт' }],
      }
    )

    expect(result).toMatchObject({
      title: 'тренировка',
      date: '2026-08-17',
      startTime: '18:30',
      endTime: '20:00',
      memberIds: ['member-1'],
      responsibleId: 'member-1',
      calendarId: 'sport-calendar',
      category: 'sports',
      importance: 'important',
      reminder: '1h',
    })
  })

  it('понимает следующий день недели и срочность', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 16, 12)) // воскресенье
    const result = parseSmartEvent('Создай встречу в понедельник в 9 !!')
    expect(result).toMatchObject({ date: '2026-08-17', startTime: '09:00', importance: 'urgent' })
  })

  it('не создаёт событие без намерения или заголовка', () => {
    expect(parseSmartEvent('заметка без даты')).toBeNull()
    expect(parseSmartEvent('завтра в 10:00')).toBeNull()
  })

  it('не превращает несуществующую дату в дату следующего месяца', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 10, 12))
    expect(parseSmartEvent('Встреча 31.02.2026 в 10:00').date).toBe('2026-01-10')
  })
})
