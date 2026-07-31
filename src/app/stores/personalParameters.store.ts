import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import type {
  PersonalParameterCategory,
  PersonalParameterField,
  PersonalParameterItem,
  PersonalParameterVisibility,
} from '../types/personalParameter'
import { authStore } from './auth.store.js'
import { workspaceStore } from './workspace.store.js'

const repository = new SyncedCollectionRepository(
  `${APP_CONFIG.storageKey}:personal-parameters`,
  [] as PersonalParameterItem[],
  'personal_parameters',
  {
    toRow: toDatabaseRow,
    fromRow: fromDatabaseRow,
  },
)

const items = computed<PersonalParameterItem[]>(() => repository.items.value
  .filter((item: PersonalParameterItem) => (
    item.workspaceId === workspaceStore.activeWorkspaceId.value
    && (item.visibility === 'shared' || item.ownerId === authStore.currentUserId.value)
  ))
  .sort((first: PersonalParameterItem, second: PersonalParameterItem) => (
    Number(second.favorite) - Number(first.favorite)
    || second.updatedAt.localeCompare(first.updatedAt)
  )))

async function create(payload: Pick<PersonalParameterItem, 'title' | 'category' | 'visibility' | 'note' | 'fields' | 'favorite'>) {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  const ownerId = authStore.currentUserId.value
  if (!workspaceId || !ownerId) return { ok: false, message: 'Пространство не выбрано' }

  const now = new Date().toISOString()
  const item: PersonalParameterItem = {
    ...payload,
    id: crypto.randomUUID(),
    workspaceId,
    ownerId,
    fields: normalizeFields(payload.fields),
    createdAt: now,
    updatedAt: now,
  }
  return repository.createAndWait(item)
}

async function update(id: string, payload: Partial<PersonalParameterItem>) {
  const item = repository.findById(id) as PersonalParameterItem | undefined
  if (!item) return { ok: false, message: 'Карточка не найдена' }
  if (item.ownerId !== authStore.currentUserId.value) {
    return { ok: false, message: 'Изменять эту карточку может только её владелец' }
  }

  return repository.updateAndWait(id, {
    ...payload,
    fields: payload.fields ? normalizeFields(payload.fields) : item.fields,
    updatedAt: new Date().toISOString(),
  })
}

async function remove(id: string) {
  const item = repository.findById(id) as PersonalParameterItem | undefined
  if (!item) return { ok: true }
  if (item.ownerId !== authStore.currentUserId.value) {
    return { ok: false, message: 'Удалить эту карточку может только её владелец' }
  }
  return repository.deleteAndWait(id)
}

function loadWorkspace(workspaceId: string) {
  return repository.loadWorkspace(workspaceId)
}

function toDatabaseRow(item: PersonalParameterItem) {
  return {
    id: item.id,
    workspace_id: item.workspaceId,
    owner_id: item.ownerId,
    title: item.title,
    category: item.category,
    visibility: item.visibility,
    note: item.note,
    fields: item.fields,
    favorite: item.favorite,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }
}

function fromDatabaseRow(row: Record<string, unknown>): PersonalParameterItem {
  return {
    id: String(row.id || ''),
    workspaceId: String(row.workspace_id || ''),
    ownerId: String(row.owner_id || ''),
    title: String(row.title || ''),
    category: normalizeCategory(row.category),
    visibility: normalizeVisibility(row.visibility),
    note: String(row.note || ''),
    fields: normalizeFields(row.fields),
    favorite: row.favorite === true,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  }
}

function normalizeCategory(value: unknown): PersonalParameterCategory {
  const category = String(value || '')
  return ['clothes', 'personal'].includes(category)
    ? category as PersonalParameterCategory
    : 'other'
}

function normalizeVisibility(value: unknown): PersonalParameterVisibility {
  return value === 'shared' ? 'shared' : 'private'
}

function normalizeFields(value: unknown): PersonalParameterField[] {
  if (!Array.isArray(value)) return []
  return value
    .slice(0, 20)
    .map((field) => {
      const source = field && typeof field === 'object' ? field as Record<string, unknown> : {}
      return {
        id: String(source.id || crypto.randomUUID()),
        label: String(source.label || '').trim().slice(0, 80),
        value: String(source.value || '').trim().slice(0, 240),
        unit: String(source.unit || '').trim().slice(0, 24),
      }
    })
    .filter((field) => field.label && field.value)
}

export const personalParametersStore = {
  items,
  create,
  update,
  remove,
  loadWorkspace,
}
