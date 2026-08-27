import { computed } from 'vue'
import { APP_CONFIG } from '../../../config/app.config.js'
import { SyncedCollectionRepository } from '../../../repositories/SyncedCollectionRepository.js'
import { generateId } from '../../../utils/helpers/idGenerator.js'
import { useActivityLog } from '../../../composables/history/useActivityLog.js'
import { authStore } from '../../../stores/auth.store.js'
import { workspaceStore } from '../../../stores/workspace.store.js'

const repository = new SyncedCollectionRepository(`${APP_CONFIG.storageKey}:knowledge-notes`, [], 'knowledge_notes')
const { addActivity } = useActivityLog()

const notes = computed(() => repository.items.value
  .filter((note) => note.workspaceId === workspaceStore.activeWorkspaceId.value && note.userId === authStore.currentUserId.value)
  .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.updatedAt.localeCompare(a.updatedAt)))

function normalizeNote(data) {
  const title = String(data.title || '').trim()
  const content = String(data.content || '').trim()
  if (!title) return { ok: false, message: 'Укажи название материала' }
  if (!content) return { ok: false, message: 'Добавь содержание материала' }
  const tags = Array.isArray(data.tags) ? data.tags : String(data.tags || '').split(',')
  return { ok: true, note: { title, content, section: String(data.section || '').trim() || 'Без раздела', tags: [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))], pinned: Boolean(data.pinned) } }
}

function addNote(data) {
  const normalized = normalizeNote(data)
  if (!normalized.ok) return normalized
  const userId = authStore.currentUserId.value
  if (!userId) return { ok: false, message: 'Сначала войди в аккаунт' }
  const now = new Date().toISOString()
  const note = { id: generateId(), workspaceId: workspaceStore.activeWorkspace.value?.id, userId, ...normalized.note, createdAt: now, updatedAt: now }
  repository.create(note)
  addActivity('knowledge:create', `добавил(а) материал «${note.title}»`, { noteId: note.id, section: note.section })
  return { ok: true, note }
}

function updateNote(id, data) {
  const target = repository.findById(id)
  if (!target || target.userId !== authStore.currentUserId.value) return { ok: false, message: 'Материал не найден' }
  const normalized = normalizeNote(data)
  if (!normalized.ok) return normalized
  const note = { ...target, ...normalized.note, updatedAt: new Date().toISOString() }
  repository.update(id, note)
  addActivity('knowledge:update', `обновил(а) материал «${note.title}»`, { noteId: id, section: note.section })
  return { ok: true, note }
}

function togglePinned(id) {
  const target = repository.findById(id)
  if (!target || target.userId !== authStore.currentUserId.value) return { ok: false, message: 'Материал не найден' }
  const note = { ...target, pinned: !target.pinned, updatedAt: new Date().toISOString() }
  repository.update(id, note)
  return { ok: true, note }
}

async function deleteNote(id) {
  const target = repository.findById(id)
  if (!target || target.userId !== authStore.currentUserId.value) return { ok: false, message: 'Материал не найден' }
  const result = await repository.deleteAndWait(id)
  if (!result.ok) return result
  addActivity('knowledge:delete', `удалил(а) материал «${target.title}»`, { noteId: id })
  return { ok: true }
}

export const knowledgeStore = { notes, addNote, updateNote, togglePinned, deleteNote, loadWorkspace: (workspaceId) => repository.loadWorkspace(workspaceId) }
