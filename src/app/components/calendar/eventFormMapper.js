import { toDateKey } from '../../utils/formatters/dateFormatter.js'

export function createEmptyEventForm({ date = '', calendarId = '' } = {}) {
  return {
    title: '',
    date: date || toDateKey(new Date()),
    startTime: '09:00',
    endTime: '10:00',
    memberIds: [],
    calendarId,
    responsibleId: '',
    attendeeResponses: {},
    comments: [],
    category: 'home',
    location: '',
    notes: '',
    allDay: false,
    repeat: 'none',
    repeatUntil: '',
    repeatEndType: 'never',
    repeatCount: 10,
    repeatInterval: 1,
    repeatUnit: 'week',
    repeatWeekdays: [],
    importance: 'normal',
    reminder: 'none',
  }
}

export function normalizeEventForm(event) {
  return {
    ...event,
    memberIds: Array.isArray(event?.memberIds) ? [...event.memberIds] : [],
    attendeeResponses: event?.attendeeResponses && typeof event.attendeeResponses === 'object'
      ? { ...event.attendeeResponses }
      : {},
    comments: Array.isArray(event?.comments) ? [...event.comments] : [],
    repeatEndType: event?.repeatEndType || (event?.repeatUntil ? 'until' : 'never'),
    repeatCount: Number(event?.repeatCount || 0),
    repeatInterval: Math.max(1, Number(event?.repeatInterval || 1)),
    repeatUnit: event?.repeatUnit || 'week',
    repeatWeekdays: Array.isArray(event?.repeatWeekdays) ? event.repeatWeekdays.map(Number) : [],
    importance: event?.importance || 'normal',
    reminder: event?.reminder || 'none',
  }
}

export function addMinutesToEventTime(time, minutes) {
  const match = String(time || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return ''
  const total = Math.max(0, Math.min(23 * 60 + 59, Number(match[1]) * 60 + Number(match[2]) + Number(minutes || 0)))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
