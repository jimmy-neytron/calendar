import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { workspaceStore } from './workspace.store.js'

const STORAGE_KEY = `${APP_CONFIG.storageKey}:calendar-collections`
const defaultCollections = [
  { id: 'calendar-family', workspaceId: 'space-family', name: 'Семья', color: '#60a5fa', visible: true },
  { id: 'calendar-personal', workspaceId: 'space-family', name: 'Личное', color: '#f472b6', visible: true },
  { id: 'calendar-work', workspaceId: 'space-family', name: 'Работа', color: '#22c55e', visible: true },
  { id: 'calendar-sport', workspaceId: 'space-family', name: 'Спорт', color: '#fb923c', visible: true },
]

const repository = new SyncedCollectionRepository(STORAGE_KEY, defaultCollections, 'calendar_collections')
const collections = repository.items
const activeCollections = computed(() => collections.value.filter(
  (calendar) => calendar.workspaceId === workspaceStore.activeWorkspaceId.value
))
const visibleCollectionIds = computed(() => activeCollections.value.filter((calendar) => calendar.visible).map((calendar) => calendar.id))
let ensurePromise = null
let ensureWorkspaceId = ''

async function ensureWorkspaceCollections() {
  const workspaceId = workspaceStore.activeWorkspace.value?.id
  if (!workspaceId) return { ok: false, message: 'Пространство не загружено' }
  if (activeCollections.value.length) return { ok: true, collections: activeCollections.value }
  if (ensurePromise && ensureWorkspaceId === workspaceId) return ensurePromise

  ensureWorkspaceId = workspaceId
  ensurePromise = (async () => {
    const definitions = [
      { name: 'Основной', color: '#60a5fa' },
      { name: 'Личное', color: '#f472b6' },
    ]
    for (const definition of definitions) {
      const result = await repository.createAndWait({
        id: generateId(),
        workspaceId,
        name: definition.name,
        color: definition.color,
        visible: true,
      })
      if (!result.ok) return result
    }
    return { ok: true, collections: activeCollections.value }
  })()

  try {
    return await ensurePromise
  } finally {
    ensurePromise = null
    ensureWorkspaceId = ''
  }
}

function addCollection(name, color = '#60a5fa') {
  const title = String(name || '').trim()
  if (!title) return null
  const calendar = {
    id: generateId(),
    workspaceId: workspaceStore.activeWorkspace.value?.id,
    name: title,
    color,
    visible: true,
  }
  repository.create(calendar)
  return calendar
}

function updateCollection(id, updates) {
  repository.update(id, updates)
}

function toggleCollection(id) {
  const calendar = collections.value.find((item) => item.id === id)
  if (calendar) updateCollection(id, { visible: !calendar.visible })
}

function removeCollection(id) {
  if (activeCollections.value.length <= 1) return false
  repository.delete(id)
  return true
}

function getCollection(id) {
  return activeCollections.value.find((calendar) => calendar.id === id) || activeCollections.value[0] || null
}

export const calendarCollectionStore = {
  collections,
  activeCollections,
  visibleCollectionIds,
  ensureWorkspaceCollections,
  addCollection,
  updateCollection,
  toggleCollection,
  removeCollection,
  getCollection,
  loadWorkspace: (workspaceId) => repository.loadWorkspace(workspaceId),
}
