import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import { defaultEvents } from '../utils/seed/sampleData.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { validateEvent } from '../utils/validators/calendarValidator.js'
import { toDateKey } from '../utils/formatters/dateFormatter.js'
import { DateHelper } from '../utils/date/dateHelper.js'
import { useRecurringEvents } from '../composables/recurrence/useRecurringEvents.js'
import { useActivityLog } from '../composables/history/useActivityLog.js'
import { workspaceStore } from './workspace.store.js'
import { notificationStore } from './notification.store.js'
import { calendarCollectionStore } from './calendarCollection.store.js'
import { authStore } from './auth.store.js'

const STORAGE_KEY = `${APP_CONFIG.storageKey}:events`
const defaultWorkspaceEvents = defaultEvents.map((event) => ({
  ...event,
  workspaceId: 'space-family',
  importance: event.importance || 'normal',
  reminder: event.reminder || 'none',
  repeatEndType: event.repeatUntil ? 'until' : 'never',
}))
const eventRepository = new SyncedCollectionRepository(STORAGE_KEY, defaultWorkspaceEvents, 'events')
const { expandRecurringEvents } = useRecurringEvents()
const { addActivity } = useActivityLog()

const events = computed(() => eventRepository.items.value.filter((event) => event.workspaceId === workspaceStore.activeWorkspaceId.value))
const visibleEvents = computed(() => expandRecurringEvents(events.value))
const sortedEvents = computed(() => [...visibleEvents.value].sort(compareEvents))
const todayEvents = computed(() => {
  const today = toDateKey(new Date())
  return sortedEvents.value.filter((event) => event.date === today)
})
const eventsByDate = computed(() => groupEventsByDate(sortedEvents.value))
const upcomingReminders = computed(() => getUpcomingReminders(sortedEvents.value))

function prepareEvent(data) {
  calendarCollectionStore.ensureWorkspaceCollections()
  const workspaceId = workspaceStore.activeWorkspace.value?.id
  if (!workspaceId) {
    return { ok: false, errors: { workspace: 'Пространство не загружено. Обнови страницу.' } }
  }
  const now = new Date().toISOString()
  const event = normalizeEvent({
    ...data,
    id: generateId(),
    workspaceId,
    createdAt: now,
    updatedAt: now,
  })

  const validation = validateEvent(event)
  return validation.valid
    ? { ok: true, event }
    : { ok: false, errors: validation.errors }
}

const addEvent = (data) => {
  const prepared = prepareEvent(data)
  if (!prepared.ok) return prepared
  const { event } = prepared
  eventRepository.create(event)
  notificationStore.notifyEventChange('create', event)
  addActivity('event:create', `создал(а) событие «${event.title}»`, { eventId: event.id, date: event.date })
  return { ok: true, event }
}

const addEventAndWait = async (data) => {
  const collectionsReady = await calendarCollectionStore.ensureWorkspaceCollections()
  if (!collectionsReady?.ok) {
    return { ok: false, errors: { backend: collectionsReady?.message || 'Не удалось подготовить календарь' } }
  }
  const prepared = prepareEvent(data)
  if (!prepared.ok) return prepared
  const { event } = prepared
  const persisted = await eventRepository.createAndWait(event)
  if (!persisted.ok) return { ok: false, errors: { backend: persisted.message } }
  notificationStore.notifyEventChange('create', event)
  addActivity('event:create', `создал(а) событие «${event.title}»`, { eventId: event.id, date: event.date })
  return { ok: true, event }
}

const updateEvent = (id, updates) => {
  const targetId = updates.parentId || String(id).split('::')[0]
  const target = eventRepository.findById(targetId)
  if (!target) return { ok: false, errors: { event: 'Событие не найдено' } }

  const notificationAction = updates.__notificationAction || 'update'
  const cleanUpdates = { ...updates }
  delete cleanUpdates.__notificationAction

  const nextEvent = normalizeEvent({
    ...target,
    ...cleanUpdates,
    id: targetId,
    workspaceId: target.workspaceId || workspaceStore.activeWorkspace.value?.id,
    title: cleanUpdates.title?.trim() ?? target.title,
    updatedAt: new Date().toISOString(),
  })

  const validation = validateEvent(nextEvent)
  if (!validation.valid) return { ok: false, errors: validation.errors }

  eventRepository.update(targetId, nextEvent)
  reportLinkedEventChange('update', nextEvent)
  notificationStore.notifyEventChange(notificationAction, nextEvent, target)
  addActivity('event:update', `обновил(а) событие «${nextEvent.title}»`, { eventId: targetId, date: nextEvent.date })
  return { ok: true, event: nextEvent }
}

const deleteEvent = (id) => {
  const eventId = String(id).split('::')[0]
  const target = eventRepository.findById(eventId)
  eventRepository.delete(eventId)
  if (target) {
    reportLinkedEventChange('delete', target)
    notificationStore.notifyEventChange('delete', target)
    addActivity('event:delete', `удалил(а) событие «${target.title}»`, { eventId, date: target.date })
  }
}

const deleteEventAndWait = async (id) => {
  const eventId = String(id).split('::')[0]
  const target = eventRepository.findById(eventId)
  const result = await eventRepository.deleteAndWait(eventId)
  if (result.ok && target) {
    notificationStore.notifyEventChange('delete', target)
    addActivity('event:delete', `удалил(а) событие «${target.title}»`, { eventId, date: target.date })
  }
  return result
}

const moveEvent = (id, date, time = null) => {
  const eventId = String(id).split('::')[0]
  const target = eventRepository.findById(eventId)
  if (!target) return { ok: false, errors: { event: 'Событие не найдено' } }

  const updates = {
    date,
    updatedAt: new Date().toISOString(),
  }

  if (time && !target.allDay) {
    const duration = getDurationMinutes(target.startTime, target.endTime)
    updates.startTime = time
    updates.endTime = addMinutesToTime(time, duration)
  }

  const result = updateEvent(eventId, { ...updates, __notificationAction: 'move' })
  if (result.ok) addActivity('event:move', `перенёс(ла) событие «${target.title}» на ${date}${time ? ` в ${time}` : ''}`, { eventId, date, time })
  return result
}

const resizeEvent = (id, minutesDelta) => {
  const eventId = String(id).split('::')[0]
  const target = eventRepository.findById(eventId)
  if (!target || target.allDay) return { ok: false, errors: { event: 'Нельзя изменить длительность' } }
  const duration = Math.max(15, getDurationMinutes(target.startTime, target.endTime) + minutesDelta)
  return updateEvent(eventId, { endTime: addMinutesToTime(target.startTime, duration) })
}

const duplicateEvent = (id, mode = 'tomorrow', customDates = []) => {
  const eventId = String(id).split('::')[0]
  const source = eventRepository.findById(eventId)
  if (!source) return { ok: false, message: 'Событие не найдено' }

  const dates = getDuplicateDates(source.date, mode, customDates)
  if (!dates.length) return { ok: false, message: 'Нет дат для дублирования' }

  const now = new Date().toISOString()
  const created = dates.map((date) => normalizeEvent({
    ...source,
    id: generateId(),
    date,
    repeat: 'none',
    repeatUntil: '',
    repeatEndType: 'never',
    repeatCount: 0,
    parentId: undefined,
    createdAt: now,
    updatedAt: now,
  }))

  created.forEach((event) => {
    eventRepository.create(event)
    notificationStore.notifyEventChange('create', event, source)
  })
  addActivity('event:duplicate', `дублировал(а) событие «${source.title}» на ${created.length} дат`, { eventId, dates })
  return { ok: true, events: created }
}

const getEventsForDate = (dateKey) => eventsByDate.value[dateKey] || []

export const calendarStore = {
  events,
  visibleEvents,
  sortedEvents,
  todayEvents,
  eventsByDate,
  upcomingReminders,
  addEvent,
  addEventAndWait,
  updateEvent,
  deleteEvent,
  deleteEventAndWait,
  moveEvent,
  resizeEvent,
  duplicateEvent,
  addComment,
  respondToEvent,
  getEventsForDate,
  loadWorkspace: (workspaceId) => eventRepository.loadWorkspace(workspaceId),
  syncError: eventRepository.lastError,
  pendingSyncCount: eventRepository.pendingCount,
}

export function groupEventsByDate(items) {
  return items.reduce((acc, event) => {
    acc[event.date] ||= []
    acc[event.date].push(event)
    return acc
  }, {})
}

function normalizeEvent(data) {
  const fallbackCalendar = calendarCollectionStore.activeCollections.value[0]
  return {
    id: data.id,
    workspaceId: data.workspaceId || workspaceStore.activeWorkspace.value?.id || '',
    title: data.title?.trim() || '',
    date: data.date,
    startTime: data.allDay ? '' : data.startTime || '',
    endTime: data.allDay ? '' : data.endTime || '',
    memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
    calendarId: data.calendarId || fallbackCalendar?.id || '',
    responsibleId: data.responsibleId || '',
    attendeeResponses: data.attendeeResponses && typeof data.attendeeResponses === 'object'
      ? data.attendeeResponses
      : {},
    comments: Array.isArray(data.comments) ? data.comments : [],
    category: data.category || 'other',
    location: data.location || '',
    notes: data.notes || '',
    allDay: Boolean(data.allDay),
    repeat: data.repeat || 'none',
    repeatUntil: data.repeatUntil || '',
    repeatEndType: data.repeatEndType || (data.repeatUntil ? 'until' : 'never'),
    repeatCount: Number(data.repeatCount || 0),
    repeatInterval: Number(data.repeatInterval || 1),
    repeatUnit: data.repeatUnit || 'week',
    repeatWeekdays: Array.isArray(data.repeatWeekdays) ? data.repeatWeekdays.map(Number) : [],
    importance: data.importance || 'normal',
    reminder: data.reminder || 'none',
    linkedEntityType: data.linkedEntityType || '',
    linkedEntityId: data.linkedEntityId || '',
    completedAt: data.completedAt || null,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  }
}

function addComment(id, text) {
  const eventId = String(id).split('::')[0]
  const target = eventRepository.findById(eventId)
  const message = String(text || '').trim()
  if (!target || !message) return { ok: false }
  const user = authStore.currentUser.value
  const comments = [
    ...(target.comments || []),
    {
      id: generateId(),
      userId: user?.id || null,
      userName: user?.name || 'Пользователь',
      text: message,
      createdAt: new Date().toISOString(),
    },
  ]
  const result = updateEvent(eventId, { comments })
  if (result.ok) addActivity('event:comment', `добавил(а) комментарий к событию «${target.title}»`, {
    eventId,
    commentId: comments.at(-1)?.id,
  })
  return result
}

function respondToEvent(id, response) {
  const eventId = String(id).split('::')[0]
  const target = eventRepository.findById(eventId)
  const userId = authStore.currentUserId.value
  if (!target || !userId || !['accepted', 'maybe', 'declined'].includes(response)) return { ok: false }
  const result = updateEvent(eventId, {
    attendeeResponses: { ...(target.attendeeResponses || {}), [userId]: response },
  })
  if (result.ok) addActivity('event:response', `изменил(а) ответ на событие «${target.title}»`, {
    eventId,
    response,
  })
  return result
}

function compareEvents(firstEvent, secondEvent) {
  if (firstEvent.date !== secondEvent.date) return firstEvent.date.localeCompare(secondEvent.date)
  if (firstEvent.allDay && !secondEvent.allDay) return -1
  if (!firstEvent.allDay && secondEvent.allDay) return 1
  return (firstEvent.startTime || '99:99').localeCompare(secondEvent.startTime || '99:99')
}

function getDurationMinutes(startTime, endTime) {
  if (!startTime || !endTime) return 60
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  const diff = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
  return Math.max(15, diff || 60)
}

function addMinutesToTime(time, minutes) {
  const [hour, minute] = time.split(':').map(Number)
  const total = Math.min(23 * 60 + 59, hour * 60 + minute + minutes)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function getDuplicateDates(dateKey, mode, customDates) {
  const date = DateHelper.parseKey(dateKey)
  if (mode === 'tomorrow') return [DateHelper.toKey(DateHelper.addDays(date, 1))]
  if (mode === 'next-week') return [DateHelper.toKey(DateHelper.addDays(date, 7))]
  if (mode === 'weekend') return [6, 0].map((day) => nextWeekday(date, day)).map(DateHelper.toKey)
  if (mode === 'workdays') return [1, 2, 3, 4, 5].map((day) => nextWeekday(date, day)).map(DateHelper.toKey)
  if (mode === 'custom-dates') return customDates.filter(DateHelper.isValidKey)
  return []
}

function nextWeekday(date, weekday) {
  const current = date.getDay()
  const delta = (weekday - current + 7) % 7 || 7
  return DateHelper.addDays(date, delta)
}

function getUpcomingReminders(items) {
  const now = new Date()
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return items
    .filter((event) => !event.allDay && event.reminder && event.reminder !== 'none' && event.date && event.startTime)
    .map((event) => ({ ...event, startsAt: new Date(`${event.date}T${event.startTime}`) }))
    .filter((event) => event.startsAt >= now && event.startsAt <= in24Hours)
    .slice(0, 5)
}

function reportLinkedEventChange(action, event) {
  if (typeof window === 'undefined' || !event?.linkedEntityId) return
  window.dispatchEvent(new CustomEvent('calendar-linked-event-change', {
    detail: { action, event },
  }))
}
