import { ref } from 'vue'
import { createCollectionApi } from '../api/supabase/collections.api.js'
import { fromDatabaseRow, toDatabaseRow } from '../api/supabase/entityMapper.js'
import { LocalCollectionRepository } from './LocalCollectionRepository.js'

export class SyncedCollectionRepository extends LocalCollectionRepository {
  constructor(key, initialValue, table, options = {}) {
    super(key, initialValue)
    this.api = createCollectionApi(table)
    this.toRow = options.toRow || toDatabaseRow
    this.fromRow = options.fromRow || fromDatabaseRow
    this.lastError = ref('')
    this.pendingCount = ref(0)
  }

  async loadWorkspace(workspaceId) {
    if (!workspaceId) return []
    const { data, error } = await this.api.list(workspaceId)
    if (error) {
      this.lastError.value = error.message
      reportSyncError(error.message)
      return null
    }
    const remoteItems = (data || []).map(this.fromRow)
    const otherWorkspaces = this.items.value.filter((item) => item.workspaceId !== workspaceId)
    this.replaceAll([...otherWorkspaces, ...remoteItems])
    this.lastError.value = ''
    return remoteItems
  }

  create(item) {
    super.create(item)
    this.runSync(() => this.api.create(this.toRow(item)), () => super.delete(item.id))
    return item
  }

  async createAndWait(item) {
    super.create(item)
    try {
      const { error } = await this.api.create(this.toRow(item))
      if (!error) return { ok: true, item }
      super.delete(item.id)
      this.lastError.value = error.message
      reportSyncError(error.message)
      return { ok: false, message: error.message }
    } catch (error) {
      super.delete(item.id)
      this.lastError.value = error.message
      reportSyncError(error.message)
      return { ok: false, message: error.message }
    }
  }

  update(id, updates) {
    const previous = this.findById(id)
    const updated = super.update(id, updates)
    if (updated) {
      this.runSync(
        () => this.api.update(id, this.toRow(updated)),
        () => previous && super.update(id, previous)
      )
    }
    return updated
  }

  async updateAndWait(id, updates) {
    const previous = this.findById(id)
    const updated = super.update(id, updates)
    if (!updated) return { ok: false, message: 'Запись не найдена' }
    try {
      const { error } = await this.api.update(id, this.toRow(updated))
      if (!error) return { ok: true, item: updated }
      if (previous) super.update(id, previous)
      this.lastError.value = error.message
      reportSyncError(error.message)
      return { ok: false, message: error.message }
    } catch (error) {
      if (previous) super.update(id, previous)
      this.lastError.value = error.message
      reportSyncError(error.message)
      return { ok: false, message: error.message }
    }
  }

  delete(id) {
    const previous = this.findById(id)
    super.delete(id)
    this.runSync(() => this.api.remove(id), () => previous && super.create(previous))
  }

  async deleteAndWait(id) {
    const previous = this.findById(id)
    super.delete(id)
    try {
      const { error } = await this.api.remove(id)
      if (!error) return { ok: true }
      if (previous) super.create(previous)
      this.lastError.value = error.message
      reportSyncError(error.message)
      return { ok: false, message: error.message }
    } catch (error) {
      if (previous) super.create(previous)
      this.lastError.value = error.message
      reportSyncError(error.message)
      return { ok: false, message: error.message }
    }
  }

  async upsert(items) {
    if (!items.length) return { ok: true }
    const { error } = await this.api.upsert(items.map(this.toRow))
    if (error) {
      this.lastError.value = error.message
      reportSyncError(error.message)
      return { ok: false, message: error.message }
    }
    return { ok: true }
  }

  runSync(request, rollback) {
    this.pendingCount.value += 1
    Promise.resolve(request())
      .then(({ error }) => {
        if (!error) {
          this.lastError.value = ''
          return
        }
        this.lastError.value = error.message
        reportSyncError(error.message)
        rollback?.()
        console.error('Supabase sync failed:', error.message)
      })
      .catch((error) => {
        this.lastError.value = error.message
        reportSyncError(error.message)
        rollback?.()
        console.error('Supabase sync failed:', error)
      })
      .finally(() => {
        this.pendingCount.value = Math.max(0, this.pendingCount.value - 1)
      })
  }
}

function reportSyncError(message) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('backend-sync-error', {
    detail: { message: message || 'Не удалось синхронизировать данные' },
  }))
}
