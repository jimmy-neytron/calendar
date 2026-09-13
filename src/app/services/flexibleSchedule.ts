export interface FlexibleRule {
  groupId: string; weekStart: string; weekdays: number[]; startTime: string; endTime: string; duration: number; buffer: number; locked?: boolean
}
export interface ScheduledEvent {
  id: string; title: string; date: string; startTime?: string; endTime?: string; allDay?: boolean; completedAt?: string | null; repeat?: string; linkedEntityType?: string; flexibleRule?: FlexibleRule
}
export interface Slot { date: string; startTime: string; endTime: string }
export interface ScheduleRequest {
  from: string; weeks: number; count: number; weekdays: number[]; startTime: string; endTime: string; duration: number; buffer: number
}
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function addDays(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00`)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}
export function monday(key: string): string { return addDays(key, -((new Date(`${key}T12:00:00`).getDay() + 6) % 7)) }
export function minutes(value = ''): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)) return NaN
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))
}
function time(value: number): string { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` }
export function validateRequest(r: ScheduleRequest): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.from) || dateKey(new Date(`${r.from}T12:00:00`)) !== r.from) return 'Выберите корректную дату начала.'
  if (!Number.isInteger(r.weeks) || r.weeks < 1 || r.weeks > 8) return 'Период — от 1 до 8 недель.'
  if (!Number.isInteger(r.count) || r.count < 1 || r.count > 7) return 'Укажите от 1 до 7 занятий в неделю.'
  if (!r.weekdays.length || r.weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6)) return 'Выберите дни недели.'
  if (!Number.isInteger(r.duration) || r.duration < 15 || r.duration > 720) return 'Длительность — от 15 до 720 минут.'
  if (!Number.isInteger(r.buffer) || r.buffer < 0 || r.buffer > 120) return 'Пауза — от 0 до 120 минут.'
  if (!Number.isFinite(minutes(r.startTime)) || !Number.isFinite(minutes(r.endTime)) || minutes(r.endTime) - minutes(r.startTime) < r.duration) return 'Занятие должно помещаться в интервал одного дня.'
  return ''
}
export function isSlotFree(slot: Slot, events: ScheduledEvent[], buffer = 0): boolean {
  const start = minutes(slot.startTime), end = minutes(slot.endTime)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false
  return !events.some(event => {
    if (event.date !== slot.date) return false
    if (event.allDay) return true
    const busyStart = minutes(event.startTime)
    if (!Number.isFinite(busyStart)) return true
    const parsedEnd = minutes(event.endTime)
    const busyEnd = Number.isFinite(parsedEnd) && parsedEnd > busyStart ? parsedEnd : Math.min(1440, busyStart + 60)
    const gap = Math.max(buffer, event.flexibleRule?.buffer || 0)
    return start < busyEnd + gap && end + gap > busyStart
  })
}
export function availableSlots(rule: FlexibleRule, events: ScheduledEvent[], now = new Date()): Slot[] {
  const slots: Slot[] = []
  if (validateRequest({ ...rule, from: rule.weekStart, weeks: 1, count: 1 })) return slots
  for (let day = 0; day < 7; day++) {
    const date = addDays(rule.weekStart, day)
    if (date < dateKey(now) || !rule.weekdays.includes(new Date(`${date}T12:00:00`).getDay())) continue
    if (events.some(event => event.date === date && event.flexibleRule?.groupId === rule.groupId)) continue
    for (let start = minutes(rule.startTime); start + rule.duration <= minutes(rule.endTime); start += 15) {
      if (date === dateKey(now) && start <= now.getHours() * 60 + now.getMinutes()) continue
      const slot = { date, startTime: time(start), endTime: time(start + rule.duration) }
      if (isSlotFree(slot, events, rule.buffer)) slots.push(slot)
    }
  }
  return slots
}
export function planSchedule(r: ScheduleRequest, events: ScheduledEvent[], groupId: string, now = new Date()) {
  const error = validateRequest(r)
  if (error) throw new Error(error)
  const planned: ScheduledEvent[] = []
  const shortages: { week: string; missing: number }[] = []
  for (let week = 0; week < r.weeks; week++) {
    const rule: FlexibleRule = { groupId, weekStart: addDays(monday(r.from), week * 7), weekdays: [...r.weekdays], startTime: r.startTime, endTime: r.endTime, duration: r.duration, buffer: r.buffer }
    let placed = 0
    for (let index = 0; index < r.count; index++) {
      const slot = availableSlots(rule, [...events, ...planned], now).find(s => s.date >= r.from)
      if (!slot) break
      planned.push({ ...slot, id: `preview-${week}-${index}`, title: '', flexibleRule: rule })
      placed++
    }
    if (placed < r.count) shortages.push({ week: rule.weekStart, missing: r.count - placed })
  }
  return { planned, shortages }
}
export function canReschedule(event: ScheduledEvent): boolean {
  return Boolean(event.flexibleRule && !event.flexibleRule.locked && !event.completedAt && !event.linkedEntityType && (!event.repeat || event.repeat === 'none'))
}

