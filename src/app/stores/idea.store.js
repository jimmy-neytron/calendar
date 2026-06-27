import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { workspaceStore } from './workspace.store.js'
import { authStore } from './auth.store.js'
import { calendarStore } from './calendar.store.js'
import { useActivityLog } from '../composables/history/useActivityLog.js'
import { CALENDAR_LINK_CHANGE_EVENT, LINKED_ENTITY_TYPES } from '../utils/constants/linkedEntityTypes.js'

const repository = new SyncedCollectionRepository(`${APP_CONFIG.storageKey}:ideas`, [], 'ideas')
const { addActivity } = useActivityLog()
let isSyncingCalendar = false

const ideas = computed(() => repository.items.value
  .filter((idea) => idea.workspaceId === workspaceStore.activeWorkspaceId.value)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt)))

function addIdea(data) {
  const title = String(data.title || '').trim()
  if (!title) return { ok: false, message: 'Напиши идею' }

  const idea = {
    id: generateId(),
    workspaceId: workspaceStore.activeWorkspace.value?.id,
    authorId: authStore.currentUserId.value,
    title,
    type: data.type || 'other',
    note: String(data.note || '').trim(),
    plannedEventId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  repository.create(idea)
  addActivity('idea:create', `сохранил(а) идею «${idea.title}»`, { ideaId: idea.id, type: idea.type })
  return { ok: true, idea }
}

async function removeIdea(id) {
  const idea = repository.findById(id)
  if (!idea) return { ok: true }

  if (idea.plannedEventId) {
    const eventResult = await deleteCalendarEventSilently(idea.plannedEventId)
    if (!eventResult.ok) return { ok: false, message: eventResult.message || 'Не удалось удалить событие календаря' }
  }

  const result = await repository.deleteAndWait(id)
  if (!result.ok) return result
  addActivity('idea:delete', `удалил(а) идею «${idea.title}»`, { ideaId: id })
  return { ok: true }
}

async function planIdea(id, date, time = '12:00') {
  const idea = repository.findById(id)
  if (!idea) return { ok: false, message: 'Идея не найдена' }

  const payload = buildIdeaEventPayload(idea, date, time)
  const result = await upsertIdeaCalendarEvent(idea, payload)
  if (!result.ok) return result

  if (idea.plannedEventId !== result.event.id) {
    const linked = await repository.updateAndWait(id, {
      ...idea,
      plannedEventId: result.event.id,
      updatedAt: new Date().toISOString(),
    })
    if (!linked.ok) {
      if (result.created) await deleteCalendarEventSilently(result.event.id)
      return { ok: false, message: linked.message }
    }
  }

  addActivity('idea:plan', `запланировал(а) идею «${idea.title}» на ${date} в ${time}`, {
    ideaId: id,
    eventId: result.event.id,
    date,
    time,
  })
  return { ok: true, event: result.event }
}

async function unplanIdea(id) {
  const idea = repository.findById(id)
  if (!idea?.plannedEventId) return { ok: true }
  const eventId = idea.plannedEventId
  const unlinked = await repository.updateAndWait(id, {
    ...idea,
    plannedEventId: '',
    updatedAt: new Date().toISOString(),
  })
  if (!unlinked.ok) return unlinked

  const deleted = await deleteCalendarEventSilently(eventId)
  if (!deleted.ok) {
    await repository.updateAndWait(id, {
      ...idea,
      plannedEventId: eventId,
      updatedAt: new Date().toISOString(),
    })
    return { ok: false, message: deleted.message || 'Не удалось удалить событие календаря' }
  }

  addActivity('idea:unplan', `убрал(а) идею «${idea.title}» из календаря`, { ideaId: id, eventId })
  return { ok: true }
}

function buildIdeaEventPayload(idea, date, time = '12:00') {
  return {
    title: idea.title,
    date,
    startTime: time,
    endTime: addMinutes(time, 60),
    memberIds: [],
    category: categoryByType[idea.type] || 'other',
    notes: idea.note,
    allDay: false,
    repeat: 'none',
    reminder: '1h',
    linkedEntityType: LINKED_ENTITY_TYPES.IDEA,
    linkedEntityId: idea.id,
  }
}

async function upsertIdeaCalendarEvent(idea, payload) {
  isSyncingCalendar = true
  try {
    const existingEvent = idea.plannedEventId
      ? calendarStore.events.value.find((event) => event.id === idea.plannedEventId)
      : null

    if (existingEvent) {
      const updated = calendarStore.updateEvent(existingEvent.id, payload)
      return updated.ok
        ? { ok: true, event: updated.event, created: false }
        : { ok: false, message: Object.values(updated.errors || {})[0] || 'Не удалось обновить событие календаря' }
    }

    const created = await calendarStore.addEventAndWait(payload)
    return created.ok
      ? { ok: true, event: created.event, created: true }
      : { ok: false, message: Object.values(created.errors || {})[0] || 'Не удалось добавить идею в календарь' }
  } finally {
    isSyncingCalendar = false
  }
}

async function deleteCalendarEventSilently(eventId) {
  isSyncingCalendar = true
  try {
    return await calendarStore.deleteEventAndWait(eventId)
  } finally {
    isSyncingCalendar = false
  }
}

async function handleLinkedCalendarEventChange(change) {
  if (isSyncingCalendar) return
  const event = change?.event
  if (!event?.id) return
  const idea = findIdeaByCalendarEvent(event)
  if (!idea) return

  if (change.action === 'delete') {
    await repository.updateAndWait(idea.id, {
      ...idea,
      plannedEventId: '',
      updatedAt: new Date().toISOString(),
    })
    return
  }

  const updates = {}
  if (idea.plannedEventId !== event.id) updates.plannedEventId = event.id
  if (event.title && event.title !== idea.title) updates.title = event.title
  if ((event.notes || '') !== (idea.note || '')) updates.note = event.notes || ''
  if (!Object.keys(updates).length) return

  await repository.updateAndWait(idea.id, {
    ...idea,
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

function findIdeaByCalendarEvent(event) {
  if (!event) return null
  if (event.linkedEntityType === LINKED_ENTITY_TYPES.IDEA && event.linkedEntityId) {
    return repository.findById(event.linkedEntityId)
      || repository.items.value.find((idea) => idea.plannedEventId === event.id)
      || null
  }
  return repository.items.value.find((idea) => idea.plannedEventId === event.id) || null
}

async function ensureCalendarLinks(workspaceId) {
  if (!workspaceId) return
  isSyncingCalendar = true
  try {
    const workspaceIdeas = repository.items.value.filter((idea) => idea.workspaceId === workspaceId)

    for (const idea of workspaceIdeas) {
      const linkedEvent = idea.plannedEventId
        ? calendarStore.events.value.find((event) => event.id === idea.plannedEventId)
        : null

      if (linkedEvent && (linkedEvent.linkedEntityType !== LINKED_ENTITY_TYPES.IDEA || linkedEvent.linkedEntityId !== idea.id)) {
        calendarStore.updateEvent(linkedEvent.id, {
          linkedEntityType: LINKED_ENTITY_TYPES.IDEA,
          linkedEntityId: idea.id,
        })
      }
    }

    for (const event of calendarStore.events.value.filter((event) => event.linkedEntityType === LINKED_ENTITY_TYPES.IDEA && event.linkedEntityId)) {
      const idea = repository.findById(event.linkedEntityId)
      if (!idea || idea.plannedEventId === event.id) continue
      await repository.updateAndWait(idea.id, {
        ...idea,
        plannedEventId: event.id,
        updatedAt: new Date().toISOString(),
      })
    }
  } finally {
    isSyncingCalendar = false
  }
}

async function loadWorkspace(workspaceId) {
  const result = await repository.loadWorkspace(workspaceId)
  if (result === null) return null
  if (typeof window !== 'undefined') {
    window.setTimeout(() => ensureCalendarLinks(workspaceId), 0)
    window.setTimeout(() => ensureCalendarLinks(workspaceId), 500)
  }
  return result
}

const categoryByType = {
  place: 'personal',
  food: 'home',
  movie: 'personal',
  activity: 'sports',
  family: 'home',
  other: 'other',
}

function addMinutes(time, minutes) {
  const [hour, minute] = time.split(':').map(Number)
  const total = Math.min(23 * 60 + 59, hour * 60 + minute + minutes)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export const ideaStore = {
  ideas,
  addIdea,
  removeIdea,
  planIdea,
  unplanIdea,
  loadWorkspace,
}

if (typeof window !== 'undefined') {
  window.addEventListener(CALENDAR_LINK_CHANGE_EVENT, (event) => {
    handleLinkedCalendarEventChange(event.detail)
  })
}
