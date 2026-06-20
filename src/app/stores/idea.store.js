import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { workspaceStore } from './workspace.store.js'
import { authStore } from './auth.store.js'
import { calendarStore } from './calendar.store.js'

const repository = new SyncedCollectionRepository(`${APP_CONFIG.storageKey}:ideas`, [], 'ideas')

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
  }

  repository.create(idea)
  return { ok: true, idea }
}

function removeIdea(id) {
  repository.delete(id)
}

async function planIdea(id, date, time = '12:00') {
  const idea = repository.findById(id)
  if (!idea) return { ok: false, message: 'Идея не найдена' }

  const result = await calendarStore.addEventAndWait({
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
  })

  if (!result.ok) return { ok: false, message: 'Не удалось добавить идею в календарь' }
  const linked = await repository.updateAndWait(id, { plannedEventId: result.event.id })
  if (!linked.ok) {
    await calendarStore.deleteEventAndWait(result.event.id)
    return { ok: false, message: linked.message }
  }
  return { ok: true, event: result.event }
}

async function unplanIdea(id) {
  const idea = repository.findById(id)
  if (!idea?.plannedEventId) return
  const eventId = idea.plannedEventId
  const unlinked = await repository.updateAndWait(id, { plannedEventId: '' })
  if (unlinked.ok) await calendarStore.deleteEventAndWait(eventId)
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
  const total = hour * 60 + minute + minutes
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export const ideaStore = {
  ideas,
  addIdea,
  removeIdea,
  planIdea,
  unplanIdea,
  loadWorkspace: (workspaceId) => repository.loadWorkspace(workspaceId),
}
