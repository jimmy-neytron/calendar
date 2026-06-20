import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { useLocalStorage } from '../composables/storage/useLocalStorage.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { workspaceStore } from './workspace.store.js'

const STORAGE_KEY = `${APP_CONFIG.storageKey}:calendar-collections`
const defaultCollections = [
  { id: 'calendar-family', workspaceId: 'space-family', name: 'Семья', color: '#60a5fa', visible: true },
  { id: 'calendar-personal', workspaceId: 'space-family', name: 'Личное', color: '#f472b6', visible: true },
  { id: 'calendar-work', workspaceId: 'space-family', name: 'Работа', color: '#22c55e', visible: true },
  { id: 'calendar-sport', workspaceId: 'space-family', name: 'Спорт', color: '#fb923c', visible: true },
]

const { state: collections } = useLocalStorage(STORAGE_KEY, defaultCollections)
const activeCollections = computed(() => collections.value.filter(
  (calendar) => calendar.workspaceId === workspaceStore.activeWorkspaceId.value
))
const visibleCollectionIds = computed(() => activeCollections.value.filter((calendar) => calendar.visible).map((calendar) => calendar.id))

function ensureWorkspaceCollections() {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId || activeCollections.value.length) return
  collections.value = [
    ...collections.value,
    { id: generateId(), workspaceId, name: 'Основной', color: '#60a5fa', visible: true },
    { id: generateId(), workspaceId, name: 'Личное', color: '#f472b6', visible: true },
  ]
}

function addCollection(name, color = '#60a5fa') {
  const title = String(name || '').trim()
  if (!title) return null
  const calendar = {
    id: generateId(),
    workspaceId: workspaceStore.activeWorkspaceId.value,
    name: title,
    color,
    visible: true,
  }
  collections.value = [...collections.value, calendar]
  return calendar
}

function updateCollection(id, updates) {
  collections.value = collections.value.map((calendar) => (
    calendar.id === id ? { ...calendar, ...updates } : calendar
  ))
}

function toggleCollection(id) {
  const calendar = collections.value.find((item) => item.id === id)
  if (calendar) updateCollection(id, { visible: !calendar.visible })
}

function removeCollection(id) {
  if (activeCollections.value.length <= 1) return false
  collections.value = collections.value.filter((calendar) => calendar.id !== id)
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
}
