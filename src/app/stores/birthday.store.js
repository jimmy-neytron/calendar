import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { DateHelper } from '../utils/date/dateHelper.js'
import { workspaceStore } from './workspace.store.js'
import { calendarStore } from './calendar.store.js'
import { useActivityLog } from '../composables/history/useActivityLog.js'

const repository = new SyncedCollectionRepository(`${APP_CONFIG.storageKey}:birthdays`, [], 'birthdays')
const { addActivity } = useActivityLog()

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
    await removeCalendarEvents(synced.ids)
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
    await removeCalendarEvents(synced.ids)
    return { ok: false, message: updated.message }
  }
  await removeCalendarEvents(current)
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
  const birthdayEvent = await calendarStore.addEventAndWait({
    title: `День рождения: ${birthday.name}`,
    date: birthday.birthDate,
    memberIds: [],
    category: 'birthday',
    location: '',
    notes: birthday.note,
    allDay: true,
    repeat: 'yearly',
    repeatEndType: 'never',
    reminder: '1d',
  })
  if (!birthdayEvent.ok) return { ok: false, message: 'Не удалось создать событие дня рождения' }

  let reminderEventId = ''
  if (birthday.reminderDays > 0) {
    const reminderDate = DateHelper.toKey(DateHelper.addDays(DateHelper.parseKey(birthday.birthDate), -birthday.reminderDays))
    const reminderEvent = await calendarStore.addEventAndWait({
      title: `Подготовить подарок: ${birthday.name}`,
      date: reminderDate,
      memberIds: [],
      category: 'birthday',
      location: '',
      notes: `До дня рождения ${birthday.reminderDays} дней`,
      allDay: true,
      repeat: 'yearly',
      repeatEndType: 'never',
      reminder: '1d',
    })
    if (reminderEvent.ok) reminderEventId = reminderEvent.event.id
  }

  return {
    ok: true,
    ids: { eventId: birthdayEvent.event.id, reminderEventId },
  }
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

export const birthdayStore = {
  birthdays,
  upcomingBirthdays,
  addBirthday,
  updateBirthday,
  removeBirthday,
  addGiftIdea,
  toggleGiftIdea,
  removeGiftIdea,
  loadWorkspace: (workspaceId) => repository.loadWorkspace(workspaceId),
}
