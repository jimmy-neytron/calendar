import { computed, watch } from 'vue'
import { APP_CONFIG } from '../../config/app.config.js'
import {
  discardSyncOperations,
  SyncedCollectionRepository,
} from '../../repositories/SyncedCollectionRepository.js'
import { generateId } from '../../utils/helpers/idGenerator.js'
import { authStore } from '../../stores/auth.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'
import { useActivityLogSettings } from '../preferences/useActivityLogSettings.js'

const ACTIVITY_KEY = `${APP_CONFIG.storageKey}:activity`
const { isEnabled } = useActivityLogSettings()
const repository = new SyncedCollectionRepository(ACTIVITY_KEY, [], 'activity_entries', {
  isEnabled: () => isEnabled.value,
  toRow: (item) => ({
    id: item.id,
    workspace_id: item.workspaceId,
    actor_id: item.userId,
    action: item.action,
    message: item.text,
    metadata: { ...item.payload, userName: item.userName },
    created_at: item.createdAt,
  }),
  fromRow: (row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.actor_id,
    userName: row.metadata?.userName || 'Пользователь',
    action: row.action,
    text: row.message,
    payload: row.metadata || {},
    createdAt: row.created_at,
  }),
})

const activity = computed(() => isEnabled.value ? repository.items.value : [])
const workspaceActivity = computed(() => {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  return activity.value
    .filter((item) => item.workspaceId === workspaceId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

function addActivity(action, text, payload = {}) {
  if (!isEnabled.value) return null
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
  return entry
}

function forgetActivity(workspaceId, entryIds = null) {
  if (!isEnabled.value) return
  const ids = entryIds?.length ? new Set(entryIds) : null
  repository.items.value = repository.items.value.filter((entry) => (
    entry.workspaceId !== workspaceId || (ids && !ids.has(entry.id))
  ))
}

export function useActivityLog() {
  return {
    activity,
    workspaceActivity,
    addActivity,
    forgetActivity,
    loadWorkspace: (workspaceId) => isEnabled.value
      ? repository.loadWorkspace(workspaceId)
      : Promise.resolve([]),
  }
}

watch(isEnabled, (enabled) => {
  if (enabled) return
  repository.replaceAll([])
  discardSyncOperations('activity_entries')
})
