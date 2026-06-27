import { ref } from 'vue'
import { createCollectionApi } from '../api/supabase/collections.api.js'
import { fromDatabaseRow, toDatabaseRow } from '../api/supabase/entityMapper.js'
import { isSyncTableEnabled } from '../config/featureFlags.js'
import { LocalCollectionRepository } from './LocalCollectionRepository.js'

const QUEUE_KEY = 'workspace-calendar:sync-queue'
const RETRY_DELAY = 15_000
const repositories = new Map()
let syncQueue = readQueue()
let flushPromise = null
let retryTimer = null
let listenersInstalled = false

export class SyncedCollectionRepository extends LocalCollectionRepository {
  constructor(key, initialValue, table, options = {}) {
    super(key, initialValue)
    this.table = table
    this.isEnabled = options.isEnabled || (() => options.enabled ?? isSyncTableEnabled(table))
    this.api = createCollectionApi(table)
    this.toRow = options.toRow || toDatabaseRow
    this.fromRow = options.fromRow || fromDatabaseRow
    this.getEntityId = options.getEntityId || ((item) => item.id)
    this.lastError = ref('')
    this.pendingCount = ref(0)
    if (!this.isEnabled()) {
      removeTableOperations(table)
    }

    repositories.set(table, this)
    installConnectivityListeners()
    updatePendingCounts()
    if (isOnline()) window.setTimeout(() => flushSyncQueue(), 0)
  }

  async loadWorkspace(workspaceId) {
    if (!workspaceId) return []
    if (!this.isEnabled()) return []
    const localItems = this.items.value.filter((item) => item.workspaceId === workspaceId)
    if (!isOnline()) return localItems

    try {
      const { data, error } = await this.api.list(workspaceId)
      if (error) {
        if (isNetworkError(error)) {
          scheduleRetry()
          return localItems
        }
        this.handlePermanentError(error)
        return null
      }

      const remoteItems = (data || []).map(this.fromRow)
      const mergedItems = applyPendingOperations(
        remoteItems,
        getTableOperations(this.table, workspaceId),
        this.fromRow,
        this.getEntityId
      )
      const otherWorkspaces = this.items.value.filter((item) => item.workspaceId !== workspaceId)
      this.replaceAll([...otherWorkspaces, ...mergedItems])
      this.lastError.value = ''
      flushSyncQueue()
      return mergedItems
    } catch (error) {
      if (isNetworkError(error)) {
        scheduleRetry()
        return localItems
      }
      this.handlePermanentError(error)
      return null
    }
  }

  create(item) {
    if (!this.isEnabled()) return item
    super.create(item)
    this.syncOperation({ type: 'create', entityId: this.getEntityId(item), payload: this.toRow(item) })
    return item
  }

  async createAndWait(item) {
    if (!this.isEnabled()) return { ok: true, disabled: true, item }
    super.create(item)
    const result = await this.syncOperation(
      { type: 'create', entityId: this.getEntityId(item), payload: this.toRow(item) },
      { wait: true }
    )
    if (result.ok) return { ...result, item }
    this.deleteLocal(this.getEntityId(item))
    return result
  }

  update(id, updates) {
    if (!this.isEnabled()) return null
    const previous = this.findLocal(id)
    const updated = this.updateLocal(id, updates)
    if (updated) {
      this.syncOperation(
        { type: 'update', entityId: id, payload: this.toRow(updated) },
        { rollback: () => previous && this.updateLocal(id, previous) }
      )
    }
    return updated
  }

  async updateAndWait(id, updates) {
    if (!this.isEnabled()) return { ok: true, disabled: true }
    const previous = this.findLocal(id)
    const updated = this.updateLocal(id, updates)
    if (!updated) return { ok: false, message: 'Запись не найдена' }

    const result = await this.syncOperation(
      { type: 'update', entityId: id, payload: this.toRow(updated) },
      { wait: true }
    )
    if (result.ok) return { ...result, item: updated }
    if (previous) this.updateLocal(id, previous)
    return result
  }

  delete(id) {
    if (!this.isEnabled()) return
    const previous = this.findLocal(id)
    this.deleteLocal(id)
    this.syncOperation(
      { type: 'delete', entityId: id, payload: null, workspaceId: previous?.workspaceId },
      { rollback: () => previous && super.create(previous) }
    )
  }

  async deleteAndWait(id) {
    if (!this.isEnabled()) return { ok: true, disabled: true }
    const previous = this.findLocal(id)
    this.deleteLocal(id)
    const result = await this.syncOperation(
      { type: 'delete', entityId: id, payload: null, workspaceId: previous?.workspaceId },
      { wait: true }
    )
    if (result.ok) return result
    if (previous) super.create(previous)
    return result
  }

  async upsert(items) {
    if (!this.isEnabled()) return { ok: true, disabled: true }
    if (!items.length) return { ok: true }
    const payload = items.map(this.toRow)
    return this.syncOperation({ type: 'upsert', entityId: '', payload }, { wait: true })
  }

  async syncOperation(operation, options = {}) {
    if (!this.isEnabled()) return { ok: true, disabled: true }
    const queuedOperation = createQueueOperation(this.table, operation)

    if (!isOnline()) {
      enqueueOperation(queuedOperation)
      return { ok: true, queued: true }
    }

    this.pendingCount.value += 1
    try {
      const result = await executeOperation(this, queuedOperation)
      if (!result.error) {
        this.lastError.value = ''
        return { ok: true }
      }

      if (isNetworkError(result.error)) {
        enqueueOperation(queuedOperation)
        scheduleRetry()
        return { ok: true, queued: true }
      }

      this.handlePermanentError(result.error)
      options.rollback?.()
      return { ok: false, message: result.error.message }
    } catch (error) {
      if (isNetworkError(error)) {
        enqueueOperation(queuedOperation)
        scheduleRetry()
        return { ok: true, queued: true }
      }

      this.handlePermanentError(error)
      options.rollback?.()
      return { ok: false, message: error.message }
    } finally {
      this.pendingCount.value = Math.max(0, this.pendingCount.value - 1)
    }
  }

  handlePermanentError(error) {
    const message = error?.message || 'Не удалось синхронизировать данные'
    this.lastError.value = message
    reportSyncError(message)
    console.error('Supabase sync failed:', error)
  }

  findById(id) {
    return this.findLocal(id)
  }

  findLocal(id) {
    return this.items.value.find((item) => this.getEntityId(item) === id)
  }

  updateLocal(id, updates) {
    let updatedItem = null
    this.items.value = this.items.value.map((item) => {
      if (this.getEntityId(item) !== id) return item
      updatedItem = { ...item, ...updates }
      return updatedItem
    })
    return updatedItem
  }

  deleteLocal(id) {
    this.items.value = this.items.value.filter((item) => this.getEntityId(item) !== id)
  }
}

async function flushSyncQueue() {
  if (flushPromise || !isOnline() || !syncQueue.length) return flushPromise

  flushPromise = (async () => {
    while (syncQueue.length && isOnline()) {
      const operation = syncQueue[0]
      const repository = repositories.get(operation.table)
      if (!repository) break
      if (!repository.isEnabled()) {
        syncQueue.shift()
        persistQueue()
        continue
      }

      repository.pendingCount.value += 1
      try {
        const { error } = await executeOperation(repository, operation)
        if (error) {
          if (isNetworkError(error)) {
            scheduleRetry()
            break
          }
          repository.handlePermanentError(error)
        } else {
          repository.lastError.value = ''
        }
        syncQueue.shift()
        persistQueue()
      } catch (error) {
        if (isNetworkError(error)) {
          scheduleRetry()
          break
        }
        repository.handlePermanentError(error)
        syncQueue.shift()
        persistQueue()
      } finally {
        repository.pendingCount.value = Math.max(0, repository.pendingCount.value - 1)
      }
    }

    updatePendingCounts()
    if (!syncQueue.length && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backend-sync-complete'))
    }
  })().finally(() => {
    flushPromise = null
  })

  return flushPromise
}

function enqueueOperation(operation) {
  syncQueue.push(operation)
  persistQueue()
  updatePendingCounts()
  scheduleRetry()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('backend-sync-deferred', {
      detail: { count: syncQueue.length },
    }))
  }
}

function createQueueOperation(table, operation) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    table,
    type: operation.type,
    entityId: operation.entityId || '',
    payload: operation.payload ?? null,
    workspaceId: operation.workspaceId
      || operation.payload?.workspace_id
      || operation.payload?.[0]?.workspace_id
      || '',
    createdAt: new Date().toISOString(),
  }
}

async function executeOperation(repository, operation) {
  if (operation.type === 'create') return repository.api.create(operation.payload)
  if (operation.type === 'update') return repository.api.update(operation.entityId, operation.payload)
  if (operation.type === 'delete') return repository.api.remove(operation.entityId)
  if (operation.type === 'upsert') return repository.api.upsert(operation.payload)
  return { error: new Error(`Неизвестная операция синхронизации: ${operation.type}`) }
}

function applyPendingOperations(remoteItems, operations, fromRow, getEntityId = (item) => item.id) {
  const items = new Map(remoteItems.map((item) => [getEntityId(item), item]))
  operations.forEach((operation) => {
    if (operation.type === 'delete') {
      items.delete(operation.entityId)
      return
    }

    const rows = operation.type === 'upsert' ? operation.payload : [operation.payload]
    rows.filter(Boolean).forEach((row) => {
      const localItem = fromRow(row)
      const entityId = getEntityId(localItem)
      items.set(entityId, { ...items.get(entityId), ...localItem })
    })
  })
  return [...items.values()]
}

function getTableOperations(table, workspaceId) {
  return syncQueue.filter((operation) => (
    operation.table === table
    && (!workspaceId || operation.workspaceId === workspaceId)
  ))
}

function updatePendingCounts() {
  repositories.forEach((repository, table) => {
    repository.pendingCount.value = syncQueue.filter((operation) => operation.table === table).length
  })
}

function scheduleRetry() {
  if (retryTimer || !syncQueue.length) return
  retryTimer = window.setTimeout(() => {
    retryTimer = null
    flushSyncQueue()
  }, RETRY_DELAY)
}

function installConnectivityListeners() {
  if (listenersInstalled || typeof window === 'undefined') return
  listenersInstalled = true
  window.addEventListener('online', () => flushSyncQueue())
  if (isOnline()) window.setTimeout(() => flushSyncQueue(), 0)
}

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine
}

function isNetworkError(error) {
  if (!isOnline()) return true
  const message = String(error?.message || error || '').toLowerCase()
  return message.includes('failed to fetch')
    || message.includes('networkerror')
    || message.includes('network request failed')
    || message.includes('err_name_not_resolved')
    || message.includes('load failed')
}

function readQueue() {
  if (typeof localStorage === 'undefined') return []
  try {
    const stored = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    if (!Array.isArray(stored)) return []
    const enabledOperations = stored.filter((operation) => isSyncTableEnabled(operation.table))
    if (enabledOperations.length !== stored.length) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(enabledOperations))
    }
    return enabledOperations
  } catch {
    return []
  }
}

function removeTableOperations(table) {
  const nextQueue = syncQueue.filter((operation) => operation.table !== table)
  if (nextQueue.length === syncQueue.length) return
  syncQueue = nextQueue
  persistQueue()
  updatePendingCounts()
}

export function discardSyncOperations(table) {
  removeTableOperations(table)
}

function persistQueue() {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(QUEUE_KEY, JSON.stringify(syncQueue))
}

function reportSyncError(message) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('backend-sync-error', {
    detail: { message: message || 'Не удалось синхронизировать данные' },
  }))
}
