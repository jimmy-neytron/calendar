import { computed } from 'vue'
import { APP_CONFIG } from '../../config/app.config.js'
import { LocalCollectionRepository } from '../../repositories/LocalCollectionRepository.js'
import { generateId } from '../../utils/helpers/idGenerator.js'
import { authStore } from '../../stores/auth.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'

const ACTIVITY_KEY = `${APP_CONFIG.storageKey}:activity`
const repository = new LocalCollectionRepository(ACTIVITY_KEY, [])

const activity = computed(() => repository.items.value)
const workspaceActivity = computed(() => {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  return activity.value
    .filter((item) => item.workspaceId === workspaceId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

function addActivity(action, text, payload = {}) {
  const user = authStore.currentUser.value
  const workspace = workspaceStore.activeWorkspace.value
  if (!workspace) return null

  const entry = {
    id: generateId(),
    workspaceId: workspace.id,
    userId: user?.id || null,
    userName: user?.name || 'Система',
    action,
    text,
    payload,
    createdAt: new Date().toISOString(),
  }

  repository.create(entry)
  const activeItems = repository.items.value
  if (activeItems.length > 250) {
    repository.replaceAll(activeItems.slice(activeItems.length - 250))
  }
  return entry
}

export function useActivityLog() {
  return {
    activity,
    workspaceActivity,
    addActivity,
  }
}
