import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { DateHelper } from '../utils/date/dateHelper.js'
import { workspaceStore } from './workspace.store.js'
import { calendarStore } from './calendar.store.js'
import { useActivityLog } from '../composables/history/useActivityLog.js'
import { CALENDAR_LINK_CHANGE_EVENT, LINKED_ENTITY_TYPES } from '../utils/constants/linkedEntityTypes.js'

const repository = new SyncedCollectionRepository(`${APP_CONFIG.storageKey}:birthdays`, [], 'birthdays')
const { addActivity } = useActivityLog()
let isSyncingCalendar = false

const birthdays = computed(() => repository.items.value
  .filter((birthday) => birthday.workspaceId === workspaceStore.activeWorkspaceId.value)
  .map(enrichBirthday)
  .sort((a, b) => a.daysUntil - b.daysUntil))

const upcomingBirthdays = computed(() => birthdays.value.filter((birthday) => birthday.daysUntil <= birthday.reminderDays))

async function addBirthday(data) {
  const name = String(data.name || '').trim()
  if (!name) return { ok: false, message: 'Укажи имя' }
  if (!DateHelper.isValidKey(data.birthDate)) return { ok: false, message: 'Укажи дату рождения' }

  const birthday = {
    id: generateId(),
    workspaceId: workspaceStore.activeWorkspace.value?.id,
    name,
    birthDate: data.birthDate,
    reminderDays: Number(data.reminderDays || 0),
    note: String(data.note || '').trim(),
    giftIdeas: [],
    eventId: '',
    reminderEventId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const synced = await syncCalendarEvents(birthday)
  if (!synced.ok) return synced
  const created = await repository.createAndWait({ ...birthday, ...synced.ids })
  if (!created.ok) {
    await removeCalendarEvents(synced.createdIds)
    return { ok: false, message: created.message }
  }
  addActivity('birthday:create', `добавил(а) день рождения ${birthday.name}`, {
    birthdayId: birthday.id,
    birthDate: birthday.birthDate,
  })
  return { ok: true, birthday }
}

async function updateBirthday(id, updates) {
  const current = repository.findById(id)
  if (!current) return { ok: false, message: 'Запись не найдена' }
  const next = {
    ...current,
    ...updates,
    name: String(updates.name ?? current.name).trim(),
    reminderDays: Number(updates.reminderDays ?? current.reminderDays),
    updatedAt: new Date().toISOString(),
  }
  if (!next.name || !DateHelper.isValidKey(next.birthDate)) return { ok: false, message: 'Проверь имя и дату' }

  const synced = await syncCalendarEvents(next)
  if (!synced.ok) return synced
  const updated = await repository.updateAndWait(id, { ...next, ...synced.ids })
  if (!updated.ok) {
    await removeCalendarEvents(synced.createdIds)
    return { ok: false, message: updated.message }
  }
  addActivity('birthday:update', `обновил(а) день рождения ${next.name}`, {
    birthdayId: id,
    birthDate: next.birthDate,
  })
  return { ok: true }
}

async function removeBirthday(id) {
  const birthday = repository.findById(id)
  if (!birthday) return
  const removed = await repository.deleteAndWait(id)
  if (removed.ok) {
    await removeCalendarEvents(birthday)
    addActivity('birthday:delete', `удалил(а) день рождения ${birthday.name}`, { birthdayId: id })
  }
}

function addGiftIdea(id, text) {
  const birthday = repository.findById(id)
  const title = String(text || '').trim()
  if (!birthday || !title) return false
  repository.update(id, {
    giftIdeas: [...(birthday.giftIdeas || []), { id: generateId(), title, purchased: false }],
    updatedAt: new Date().toISOString(),
  })
  addActivity('birthday:gift-add', `добавил(а) идею подарка для ${birthday.name}`, {
    birthdayId: id,
    giftTitle: title,
  })
  return true
}

function toggleGiftIdea(birthdayId, giftId) {
  const birthday = repository.findById(birthdayId)
  if (!birthday) return
  const gift = (birthday.giftIdeas || []).find((item) => item.id === giftId)
  if (!gift) return
  const purchased = !gift.purchased
  repository.update(birthdayId, {
    giftIdeas: (birthday.giftIdeas || []).map((item) => (
      item.id === giftId ? { ...item, purchased } : item
    )),
  })
  addActivity('birthday:gift-toggle', `${purchased ? 'отметил(а) купленным' : 'вернул(а) в список'} подарок «${gift.title}» для ${birthday.name}`, {
    birthdayId,
    giftId,
    purchased,
  })
}

function removeGiftIdea(birthdayId, giftId) {
  const birthday = repository.findById(birthdayId)
  if (!birthday) return
  const gift = (birthday.giftIdeas || []).find((item) => item.id === giftId)
  repository.update(birthdayId, {
    giftIdeas: (birthday.giftIdeas || []).filter((gift) => gift.id !== giftId),
  })
  if (gift) addActivity('birthday:gift-delete', `удалил(а) идею подарка «${gift.title}» для ${birthday.name}`, {
    birthdayId,
    giftId,
  })
}

async function syncCalendarEvents(birthday) {
  isSyncingCalendar = true
  try {
    const birthdayEvent = await upsertBirthdayCalendarEvent(
      birthday.eventId,
      buildBirthdayEventPayload(birthday),
      'Не удалось создать событие дня рождения'
    )
    if (!birthdayEvent.ok) return birthdayEvent

    const reminderEvent = await syncReminderCalendarEvent(birthday)
    if (!reminderEvent.ok) return reminderEvent

    return {
      ok: true,
      ids: {
        eventId: birthdayEvent.event.id,
        reminderEventId: reminderEvent.eventId,
      },
      createdIds: {
        eventId: birthdayEvent.created ? birthdayEvent.event.id : '',
        reminderEventId: reminderEvent.created ? reminderEvent.eventId : '',
      },
    }
  } finally {
    isSyncingCalendar = false
  }
}

function buildBirthdayEventPayload(birthday) {
  return {
    title: `День рождения: ${birthday.name}`,
    date: birthday.birthDate,
    memberIds: [],
    category: LINKED_ENTITY_TYPES.BIRTHDAY,
    location: '',
    notes: birthday.note,
    allDay: true,
    repeat: 'yearly',
    repeatEndType: 'never',
    reminder: '1d',
    linkedEntityType: LINKED_ENTITY_TYPES.BIRTHDAY,
    linkedEntityId: birthday.id,
  }
}

function buildReminderEventPayload(birthday) {
  const reminderDate = DateHelper.toKey(DateHelper.addDays(DateHelper.parseKey(birthday.birthDate), -birthday.reminderDays))
  return {
    title: `Подготовить подарок: ${birthday.name}`,
    date: reminderDate,
    memberIds: [],
    category: LINKED_ENTITY_TYPES.BIRTHDAY,
    location: '',
    notes: `До дня рождения ${birthday.reminderDays} дней`,
    allDay: true,
    repeat: 'yearly',
    repeatEndType: 'never',
    reminder: '1d',
    linkedEntityType: LINKED_ENTITY_TYPES.BIRTHDAY_REMINDER,
    linkedEntityId: birthday.id,
  }
}

async function syncReminderCalendarEvent(birthday) {
  if (birthday.reminderDays <= 0) {
    if (birthday.reminderEventId) await calendarStore.deleteEventAndWait(birthday.reminderEventId)
    return { ok: true, eventId: '', created: false }
  }

  const result = await upsertBirthdayCalendarEvent(
    birthday.reminderEventId,
    buildReminderEventPayload(birthday),
    'Не удалось создать напоминание о подарке'
  )
  return result.ok
    ? { ok: true, eventId: result.event.id, created: result.created }
    : result
}

async function upsertBirthdayCalendarEvent(eventId, payload, errorMessage) {
  const existingEvent = eventId
    ? calendarStore.events.value.find((event) => event.id === eventId)
    : null
  if (existingEvent) {
    const updated = calendarStore.updateEvent(eventId, payload)
    return updated.ok
      ? { ok: true, event: updated.event, created: false }
      : { ok: false, message: Object.values(updated.errors || {})[0] || errorMessage }
  }

  const created = await calendarStore.addEventAndWait(payload)
  return created.ok
    ? { ok: true, event: created.event, created: true }
    : { ok: false, message: Object.values(created.errors || {})[0] || errorMessage }
}

async function removeCalendarEvents(birthday) {
  if (birthday.eventId) await calendarStore.deleteEventAndWait(birthday.eventId)
  if (birthday.reminderEventId) await calendarStore.deleteEventAndWait(birthday.reminderEventId)
}

function enrichBirthday(birthday) {
  const today = new Date()
  const birthDate = DateHelper.parseKey(birthday.birthDate)
  const nextDate = nextBirthdayDate(birthDate, today)
  const daysUntil = Math.ceil((startOfDay(nextDate) - startOfDay(today)) / 86400000)
  const age = calculateAge(birthDate, today)
  const turningAge = nextDate.getFullYear() - birthDate.getFullYear()
  return {
    ...birthday,
    giftIdeas: Array.isArray(birthday.giftIdeas) ? birthday.giftIdeas : [],
    reminderDays: Number(birthday.reminderDays || 0),
    age,
    turningAge,
    nextDate,
    daysUntil,
  }
}

function nextBirthdayDate(birthDate, today) {
  let candidate = safeBirthdayDate(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
  if (startOfDay(candidate) < startOfDay(today)) {
    candidate = safeBirthdayDate(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate())
  }
  return candidate
}

function safeBirthdayDate(year, month, day) {
  if (month === 1 && day === 29 && !isLeapYear(year)) return new Date(year, 1, 28)
  return new Date(year, month, day)
}

function calculateAge(birthDate, today) {
  let age = today.getFullYear() - birthDate.getFullYear()
  const birthdayThisYear = safeBirthdayDate(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
  if (startOfDay(today) < startOfDay(birthdayThisYear)) age -= 1
  return Math.max(0, age)
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

async function handleLinkedCalendarEventChange(change) {
  if (isSyncingCalendar) return
  const event = change?.event
  if (!event?.id) return
  const birthday = findBirthdayByCalendarEvent(event)
  if (!birthday) return

  if (event.linkedEntityType === LINKED_ENTITY_TYPES.BIRTHDAY_REMINDER || birthday.reminderEventId === event.id) {
    await syncBirthdayReminderFromCalendar(change.action, event)
    return
  }

  if (event.linkedEntityType === LINKED_ENTITY_TYPES.BIRTHDAY || birthday.eventId === event.id) {
    await syncBirthdayFromCalendar(change.action, event)
  }
}

async function syncBirthdayFromCalendar(action, event) {
  const birthday = findBirthdayByCalendarEvent(event)
  if (!birthday) return
  if (action === 'delete') {
    await repository.deleteAndWait(birthday.id)
    if (birthday.reminderEventId) await calendarStore.deleteEventAndWait(birthday.reminderEventId)
    return
  }

  const nextBirthDate = mergeBirthdayDate(birthday.birthDate, event.date)
  const nextBirthday = {
    ...birthday,
    name: parseBirthdayName(event.title) || birthday.name,
    birthDate: nextBirthDate,
    note: event.notes || '',
    updatedAt: new Date().toISOString(),
  }
  const reminderSync = await syncCalendarEvents(nextBirthday)
  if (!reminderSync.ok) return
  await repository.updateAndWait(birthday.id, {
    ...nextBirthday,
    ...reminderSync.ids,
  })
}

async function syncBirthdayReminderFromCalendar(action, event) {
  const birthday = findBirthdayByCalendarEvent(event)
  if (!birthday) return
  if (action === 'delete') {
    await repository.updateAndWait(birthday.id, {
      ...birthday,
      reminderDays: 0,
      reminderEventId: '',
      updatedAt: new Date().toISOString(),
    })
    return
  }

  const reminderDays = calculateReminderDays(birthday.birthDate, event.date)
  await repository.updateAndWait(birthday.id, {
    ...birthday,
    reminderDays,
    updatedAt: new Date().toISOString(),
  })
}

function findBirthdayByCalendarEvent(event) {
  return repository.findById(event.linkedEntityId)
    || repository.items.value.find((birthday) => (
      birthday.eventId === event.id || birthday.reminderEventId === event.id
    ))
}

function parseBirthdayName(title) {
  return String(title || '').replace(/^день рождения:\s*/i, '').trim()
}

function mergeBirthdayDate(currentBirthDate, calendarDate) {
  if (!DateHelper.isValidKey(calendarDate)) return currentBirthDate
  if (!DateHelper.isValidKey(currentBirthDate)) return calendarDate
  const birthDate = DateHelper.parseKey(currentBirthDate)
  const eventDate = DateHelper.parseKey(calendarDate)
  return DateHelper.toKey(safeBirthdayDate(
    birthDate.getFullYear(),
    eventDate.getMonth(),
    eventDate.getDate()
  ))
}

function calculateReminderDays(birthDateKey, reminderDateKey) {
  if (!DateHelper.isValidKey(birthDateKey) || !DateHelper.isValidKey(reminderDateKey)) return 0
  const birthDate = DateHelper.parseKey(birthDateKey)
  const reminderDate = DateHelper.parseKey(reminderDateKey)
  let birthdayInReminderYear = safeBirthdayDate(
    reminderDate.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate()
  )
  if (startOfDay(birthdayInReminderYear) < startOfDay(reminderDate)) {
    birthdayInReminderYear = safeBirthdayDate(
      reminderDate.getFullYear() + 1,
      birthDate.getMonth(),
      birthDate.getDate()
    )
  }
  return Math.max(0, Math.round((startOfDay(birthdayInReminderYear) - startOfDay(reminderDate)) / 86400000))
}

async function ensureSupabaseCalendarLinks(workspaceId) {
  if (!workspaceId) return
  isSyncingCalendar = true
  try {
    const workspaceBirthdays = repository.items.value.filter((birthday) => birthday.workspaceId === workspaceId)
    for (const birthday of workspaceBirthdays) {
      const birthdayEvent = calendarStore.events.value.find((event) => event.id === birthday.eventId)
      if (birthdayEvent && (birthdayEvent.linkedEntityType !== LINKED_ENTITY_TYPES.BIRTHDAY || birthdayEvent.linkedEntityId !== birthday.id)) {
        calendarStore.updateEvent(birthdayEvent.id, {
          linkedEntityType: LINKED_ENTITY_TYPES.BIRTHDAY,
          linkedEntityId: birthday.id,
        })
      }

      const reminderEvent = calendarStore.events.value.find((event) => event.id === birthday.reminderEventId)
      if (reminderEvent && (reminderEvent.linkedEntityType !== LINKED_ENTITY_TYPES.BIRTHDAY_REMINDER || reminderEvent.linkedEntityId !== birthday.id)) {
        calendarStore.updateEvent(reminderEvent.id, {
          linkedEntityType: LINKED_ENTITY_TYPES.BIRTHDAY_REMINDER,
          linkedEntityId: birthday.id,
        })
      }
    }
  } finally {
    isSyncingCalendar = false
  }
}

async function loadWorkspace(workspaceId) {
  const result = await repository.loadWorkspace(workspaceId)
  if (result === null) return null
  if (typeof window !== 'undefined') {
    window.setTimeout(() => ensureSupabaseCalendarLinks(workspaceId), 0)
    window.setTimeout(() => ensureSupabaseCalendarLinks(workspaceId), 500)
  }
  return result
}

export const birthdayStore = {
  birthdays,
  upcomingBirthdays,
  addBirthday,
  updateBirthday,
  removeBirthday,
  addGiftIdea,
  toggleGiftIdea,
  removeGiftIdea,
  loadWorkspace,
}

if (typeof window !== 'undefined') {
  window.addEventListener(CALENDAR_LINK_CHANGE_EVENT, (event) => {
    handleLinkedCalendarEventChange(event.detail)
  })
}
