const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function parseDateKey(value) {
  if (!DATE_KEY_PATTERN.test(String(value || ''))) throw new Error('Некорректная дата начала')
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) throw new Error('Некорректная дата начала')
  return date
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date, amount) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

function weekday(date) {
  return date.getUTCDay() || 7
}

function addMinutes(time, minutes) {
  const match = TIME_PATTERN.exec(String(time || ''))
  if (!match) throw new Error('Некорректное время занятия')
  const total = Number(match[1]) * 60 + Number(match[2]) + minutes
  if (total >= 24 * 60) throw new Error('Занятие не должно заканчиваться после полуночи')
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function buildCourseSchedule({
  lessons,
  startDate,
  weekdayTimes,
  excludedDates = [],
}) {
  if (!Array.isArray(lessons) || !lessons.length) throw new Error('В курсе нет доступных уроков')

  const slots = [...(weekdayTimes || [])]
    .filter((slot) => Number(slot.weekday) >= 1 && Number(slot.weekday) <= 7 && TIME_PATTERN.test(slot.startTime))
    .sort((left, right) => Number(left.weekday) - Number(right.weekday))
  if (!slots.length) throw new Error('Выберите хотя бы один день и время')

  const slotByWeekday = new Map(slots.map((slot) => [Number(slot.weekday), slot.startTime]))
  const excluded = new Set(excludedDates)
  let cursor = parseDateKey(startDate)
  let scans = 0
  const sessions = []

  while (sessions.length < lessons.length) {
    if (scans++ > 3660) throw new Error('Не удалось построить расписание')
    const dateKey = toDateKey(cursor)
    const startTime = slotByWeekday.get(weekday(cursor))
    if (startTime && !excluded.has(dateKey)) {
      const lesson = lessons[sessions.length]
      const durationMinutes = Math.max(5, Number(lesson.durationMinutes || 30))
      sessions.push({
        lessonId: String(lesson.id),
        moduleId: String(lesson.moduleId || ''),
        moduleTitle: String(lesson.moduleTitle || ''),
        lessonTitle: String(lesson.title || `Урок ${sessions.length + 1}`),
        lessonPosition: sessions.length + 1,
        lessonUrl: String(lesson.url || ''),
        scheduledDate: dateKey,
        startTime,
        endTime: addMinutes(startTime, durationMinutes),
        durationMinutes,
      })
    }
    cursor = addDays(cursor, 1)
  }

  return sessions
}

export function createCoursePlanKey(courseId) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `course-plan:${courseId}:${random}`
}
