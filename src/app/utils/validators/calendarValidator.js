import {
  EVENT_FORM_CATEGORIES,
  IMPORTANCE_OPTIONS,
  REMINDER_OPTIONS,
  REPEAT_END_OPTIONS,
  REPEAT_OPTIONS,
  REPEAT_UNITS,
} from '../constants/calendarConstants.js'
import { DateHelper } from '../date/dateHelper.js'

/**
 * Validates calendar event form data.
 * @param {Record<string, any>} event
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateEvent(event) {
  const errors = {}

  if (!event.title || !event.title.trim()) {
    errors.title = 'Введите название события'
  }

  if (!event.date) {
    errors.date = 'Выберите дату'
  } else if (!DateHelper.isValidKey(event.date)) {
    errors.date = 'Дата должна быть в формате ГГГГ-ММ-ДД'
  }

  if (!event.allDay && event.startTime && event.endTime && event.endTime < event.startTime) {
    errors.endTime = 'Время окончания должно быть позже начала'
  }

  const categories = EVENT_FORM_CATEGORIES.map((category) => category.value)
  if (event.category && !categories.includes(event.category)) {
    errors.category = 'Неизвестная категория'
  }

  const repeatValues = REPEAT_OPTIONS.map((option) => option.value)
  if (event.repeat && !repeatValues.includes(event.repeat)) {
    errors.repeat = 'Неизвестный тип повтора'
  }

  const repeatEndValues = REPEAT_END_OPTIONS.map((option) => option.value)
  if (event.repeatEndType && !repeatEndValues.includes(event.repeatEndType)) {
    errors.repeatEndType = 'Неизвестный тип окончания повтора'
  }

  if (event.repeat && event.repeat !== 'none') {
    if ((event.repeatEndType === 'until' || (!event.repeatEndType && event.repeatUntil)) && !event.repeatUntil) {
      errors.repeatUntil = 'Выберите дату окончания повтора'
    }

    if (event.repeatUntil && event.repeatUntil < event.date) {
      errors.repeatUntil = 'Дата окончания повтора должна быть позже даты события'
    }

    if (event.repeatEndType === 'count' && Number(event.repeatCount || 0) <= 0) {
      errors.repeatCount = 'Количество повторений должно быть больше 0'
    }
  }

  if (event.repeat === 'custom') {
    if (Number(event.repeatInterval || 0) <= 0) errors.repeatInterval = 'Интервал должен быть больше 0'
    if (!REPEAT_UNITS.map((unit) => unit.value).includes(event.repeatUnit)) errors.repeatUnit = 'Выберите единицу повтора'
    if (event.repeatUnit === 'week' && (!Array.isArray(event.repeatWeekdays) || !event.repeatWeekdays.length)) {
      errors.repeatWeekdays = 'Выберите хотя бы один день недели'
    }
  }

  const importanceValues = IMPORTANCE_OPTIONS.map((option) => option.value)
  if (event.importance && !importanceValues.includes(event.importance)) {
    errors.importance = 'Неизвестная важность события'
  }

  const reminderValues = REMINDER_OPTIONS.map((option) => option.value)
  if (event.reminder && !reminderValues.includes(event.reminder)) {
    errors.reminder = 'Неизвестное напоминание'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validates family member.
 * @param {Record<string, any>} member
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateMember(member) {
  const errors = {}

  if (!member.name || !member.name.trim()) {
    errors.name = 'Введите имя'
  }

  if (!member.color) {
    errors.color = 'Выберите цвет'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
