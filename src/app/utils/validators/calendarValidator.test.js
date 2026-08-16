import { describe, expect, it } from 'vitest'
import { validateEvent, validateMember } from './calendarValidator.js'

const validEvent = {
  title: 'Встреча',
  date: '2026-08-16',
  startTime: '10:00',
  endTime: '11:00',
  category: 'work',
  repeat: 'none',
  importance: 'normal',
  reminder: 'none',
}

describe('валидация календаря', () => {
  it('принимает корректное событие и участника', () => {
    expect(validateEvent(validEvent)).toEqual({ valid: true, errors: {} })
    expect(validateMember({ name: 'Аня', color: '#fff' })).toEqual({ valid: true, errors: {} })
  })

  it('проверяет обязательные поля, дату и время', () => {
    const result = validateEvent({ ...validEvent, title: ' ', date: '2026-02-30', endTime: '09:00' })
    expect(result.valid).toBe(false)
    expect(result.errors).toMatchObject({
      title: 'Введите название события',
      date: 'Дата должна быть в формате ГГГГ-ММ-ДД',
      endTime: 'Время окончания должно быть позже начала',
    })
  })

  it('проверяет параметры пользовательского повтора', () => {
    const result = validateEvent({
      ...validEvent,
      repeat: 'custom',
      repeatInterval: 0,
      repeatUnit: 'week',
      repeatWeekdays: [],
      repeatEndType: 'count',
      repeatCount: 0,
    })
    expect(result.errors).toMatchObject({
      repeatInterval: 'Интервал должен быть больше 0',
      repeatWeekdays: 'Выберите хотя бы один день недели',
      repeatCount: 'Количество повторений должно быть больше 0',
    })
  })

  it('проверяет имя и цвет участника', () => {
    expect(validateMember({ name: ' ' })).toEqual({
      valid: false,
      errors: { name: 'Введите имя', color: 'Выберите цвет' },
    })
  })
})
