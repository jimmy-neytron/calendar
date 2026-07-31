import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import type { PurchaseItem } from '../types/purchase'
import { workspaceStore } from './workspace.store.js'

const repository = new SyncedCollectionRepository(
  `${APP_CONFIG.storageKey}:purchase-wishlist`,
  [] as PurchaseItem[],
  'purchase_wishlist',
  {
    toRow: toDatabaseRow,
    fromRow: fromDatabaseRow,
  },
)

const items = computed<PurchaseItem[]>(() => repository.items.value
  .filter((item: PurchaseItem) => item.workspaceId === workspaceStore.activeWorkspaceId.value)
  .sort((first: PurchaseItem, second: PurchaseItem) => (
    second.priority - first.priority || second.createdAt.localeCompare(first.createdAt)
  )))

async function create(payload: Omit<PurchaseItem, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>) {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId) return { ok: false, message: 'Пространство не выбрано' }
  const now = new Date().toISOString()
  const item: PurchaseItem = {
    ...payload,
    id: crypto.randomUUID(),
    workspaceId,
    createdAt: now,
    updatedAt: now,
  }
  return repository.createAndWait(item)
}

async function update(id: string, payload: Partial<PurchaseItem>) {
  return repository.updateAndWait(id, {
    ...payload,
    updatedAt: new Date().toISOString(),
  })
}

async function remove(id: string) {
  return repository.deleteAndWait(id)
}

function loadWorkspace(workspaceId: string) {
  return repository.loadWorkspace(workspaceId)
}

function toDatabaseRow(item: PurchaseItem) {
  return {
    id: item.id,
    workspace_id: item.workspaceId,
    title: item.title,
    description: item.description,
    category: item.category,
    status: item.status,
    product_url: item.productUrl,
    image_url: item.imageUrl,
    source: item.source,
    current_price: item.currentPrice,
    target_price: item.targetPrice,
    currency: item.currency,
    priority: item.priority,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }
}

function fromDatabaseRow(row: Record<string, unknown>): PurchaseItem {
  return {
    id: String(row.id || ''),
    workspaceId: String(row.workspace_id || ''),
    title: String(row.title || ''),
    description: String(row.description || ''),
    category: normalizeCategory(row.category),
    status: normalizeStatus(row.status),
    productUrl: String(row.product_url || ''),
    imageUrl: String(row.image_url || ''),
    source: String(row.source || ''),
    currentPrice: Math.max(0, Number(row.current_price || 0)),
    targetPrice: Math.max(0, Number(row.target_price || 0)),
    currency: String(row.currency || 'RUB'),
    priority: Math.min(3, Math.max(0, Number(row.priority || 0))),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  }
}

function normalizeCategory(value: unknown): PurchaseItem['category'] {
  const category = String(value || '')
  return ['tools', 'electronics', 'home', 'clothes', 'hobby'].includes(category)
    ? category as PurchaseItem['category']
    : 'other'
}

function normalizeStatus(value: unknown): PurchaseItem['status'] {
  const status = String(value || '')
  return ['thinking', 'bought'].includes(status) ? status as PurchaseItem['status'] : 'wanted'
}

export const purchaseWishlistStore = {
  items,
  create,
  update,
  remove,
  loadWorkspace,
}
