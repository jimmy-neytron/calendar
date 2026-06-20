import { DateHelper } from '../utils/date/dateHelper.js'

const CATEGORY_ALIASES = {
  спорт: 'sports',
  тренировка: 'sports',
  работа: 'work',
  встреча: 'work',
  школа: 'school',
  учеба: 'school',
  учёба: 'school',
  здоровье: 'health',
  врач: 'health',
  дом: 'home',
  семья: 'home',
  др: 'birthday',
  деньрождения: 'birthday',
  личное: 'personal',
}

const WEEKDAYS = [
  { pattern: /воскресен(?:ье|ия|ью)?/i, value: 0 },
  { pattern: /понедельник(?:а|у)?/i, value: 1 },
  { pattern: /вторник(?:а|у)?/i, value: 2 },
  { pattern: /сред(?:а|у|ы)/i, value: 3 },
  { pattern: /четверг(?:а|у)?/i, value: 4 },
  { pattern: /пятниц(?:а|у|ы)/i, value: 5 },
  { pattern: /суббот(?:а|у|ы)/i, value: 6 },
]

export function parseSmartEvent(input, context = {}) {
  const source = String(input || '').trim()
  if (source.length < 3) return null
  if (!hasEventIntent(source)) return null

  let title = source
  const now = new Date()
  const date = parseDate(source, now)
  const time = parseTime(source)
  const duration = parseDuration(source)
  const categoryToken = source.match(/#([а-яёa-z-]+)/i)?.[1]?.toLowerCase()
  const category = CATEGORY_ALIASES[categoryToken] || inferCategory(source)
  const mention = source.match(/@([а-яёa-z0-9._-]+)/i)?.[1]?.toLowerCase()
  const member = mention
    ? context.members?.find((item) => (
      item.name.toLowerCase().startsWith(mention) || item.email.toLowerCase().startsWith(mention)
    ))
    : null
  const calendar = findCalendar(categoryToken, category, context.calendars || [])
  const importance = /!срочно|!!/.test(source) ? 'urgent' : /!важно|важное/i.test(source) ? 'important' : 'normal'
  const reminder = parseReminder(source)

  title = cleanTitle(title)
  if (!title) return null

  const startTime = time || '09:00'
  return {
    title,
    date: DateHelper.toKey(date),
    startTime,
    endTime: addMinutes(startTime, duration),
    allDay: false,
    memberIds: member ? [member.id] : [],
    calendarId: calendar?.id || context.calendars?.[0]?.id || '',
    responsibleId: member?.id || '',
    category,
    location: '',
    notes: `Создано из быстрого ввода: ${source}`,
    repeat: 'none',
    repeatUntil: '',
    repeatEndType: 'never',
    repeatCount: 0,
    repeatInterval: 1,
    repeatUnit: 'week',
    repeatWeekdays: [],
    importance,
    reminder,
    attendeeResponses: {},
    comments: [],
    preview: {
      dateLabel: new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).format(date),
      timeLabel: `${startTime}–${addMinutes(startTime, duration)}`,
      categoryLabel: categoryToken ? `#${categoryToken}` : '',
      memberLabel: member ? `@${member.name}` : '',
    },
  }
}

function hasEventIntent(source) {
  return /(?:сегодня|завтра|послезавтра|понедельник|вторник|сред|четверг|пятниц|суббот|воскресен)/i.test(source)
    || /\b(?:[01]?\d|2[0-3])[:.]\d{2}\b/.test(source)
    || /\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/.test(source)
    || /#[а-яёa-z-]+|@[а-яёa-z0-9._-]+|!важно|!срочно|!!/i.test(source)
}

function parseDate(source, now) {
  if (/послезавтра/i.test(source)) return DateHelper.addDays(now, 2)
  if (/завтра/i.test(source)) return DateHelper.addDays(now, 1)
  if (/сегодня/i.test(source)) return now

  const explicit = source.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/)
  if (explicit) {
    const year = explicit[3] ? normalizeYear(Number(explicit[3])) : now.getFullYear()
    const candidate = new Date(year, Number(explicit[2]) - 1, Number(explicit[1]))
    if (!Number.isNaN(candidate.getTime())) return candidate
  }

  const weekdayEntry = WEEKDAYS.find((weekday) => weekday.pattern.test(source))
  if (weekdayEntry) {
    const target = weekdayEntry.value
    const delta = (target - now.getDay() + 7) % 7 || 7
    return DateHelper.addDays(now, delta)
  }

  return now
}

function parseTime(source) {
  const match = source.match(/\b(?:в\s*)?([01]?\d|2[0-3])[:.](\d{2})\b/i)
    || source.match(/\bв\s+([01]?\d|2[0-3])\b/i)
  if (!match) return ''
  return `${String(Number(match[1])).padStart(2, '0')}:${String(Number(match[2] || 0)).padStart(2, '0')}`
}

function parseDuration(source) {
  if (/на\s+(?:один\s+)?час/i.test(source)) return 60
  if (/на\s+полчаса/i.test(source)) return 30
  const hours = source.match(/на\s+(\d+(?:[.,]\d+)?)\s*(?:ч|час|часа|часов)\b/i)
  if (hours) return Math.max(15, Math.round(Number(hours[1].replace(',', '.')) * 60))
  const minutes = source.match(/на\s+(\d+)\s*(?:м|мин|минут|минуты)\b/i)
  return minutes ? Math.max(15, Number(minutes[1])) : 60
}

function parseReminder(source) {
  if (/напомни\s+за\s+(?:1\s*)?(?:день|дня)/i.test(source)) return '1d'
  if (/напомни\s+за\s+(?:1\s*)?(?:час|часа)/i.test(source)) return '1h'
  if (/напомни\s+за\s+15\s*(?:мин|минут)/i.test(source)) return '15m'
  if (/напомни\s+за\s+5\s*(?:мин|минут)/i.test(source)) return '5m'
  return 'none'
}

function inferCategory(source) {
  const normalized = source.toLowerCase()
  const alias = Object.entries(CATEGORY_ALIASES).find(([word]) => normalized.includes(word))
  return alias?.[1] || 'other'
}

function findCalendar(token, category, calendars) {
  const words = [token, category].filter(Boolean)
  return calendars.find((calendar) => words.some((word) => calendar.name.toLowerCase().includes(word)))
}

function cleanTitle(source) {
  return source
    .replace(/(?:сегодня|завтра|послезавтра)/gi, '')
    .replace(/\b(?:в\s*)?(?:[01]?\d|2[0-3])[:.]\d{2}\b/gi, '')
    .replace(/(^|\s)в\s+(?:[01]?\d|2[0-3])(?=\s|$)/gi, ' ')
    .replace(/\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/g, '')
    .replace(/(?:в\s+)?(?:воскресен(?:ье|ия|ью)?|понедельник(?:а|у)?|вторник(?:а|у)?|сред(?:а|у|ы)|четверг(?:а|у)?|пятниц(?:а|у|ы)|суббот(?:а|у|ы))/gi, '')
    .replace(/на\s+(?:полчаса|(?:один\s+)?час|\d+(?:[.,]\d+)?\s*(?:ч|час|часа|часов|м|мин|минут|минуты))/gi, '')
    .replace(/напомни\s+за\s+(?:\d+\s*)?(?:день|дня|час|часа|мин|минут)/gi, '')
    .replace(/#[а-яёa-z-]+/gi, '')
    .replace(/@[а-яёa-z0-9._-]+/gi, '')
    .replace(/!срочно|!важно|!!/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function addMinutes(time, minutes) {
  const [hour, minute] = time.split(':').map(Number)
  const total = Math.min(23 * 60 + 59, hour * 60 + minute + minutes)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function normalizeYear(year) {
  return year < 100 ? 2000 + year : year
}
