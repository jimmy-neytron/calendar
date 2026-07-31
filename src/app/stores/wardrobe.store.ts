import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import type { WardrobeItem, WardrobeLook } from '../types/wardrobe'
import { normalizeLookLayout } from '../modules/wardrobe/utils/wardrobeLookLayout'
import { authStore } from './auth.store.js'
import { workspaceStore } from './workspace.store.js'

const itemRepository = new SyncedCollectionRepository(`${APP_CONFIG.storageKey}:wardrobe-items`, [] as WardrobeItem[], 'wardrobe_items', { toRow: itemToRow, fromRow: itemFromRow })
const lookRepository = new SyncedCollectionRepository(`${APP_CONFIG.storageKey}:wardrobe-looks`, [] as WardrobeLook[], 'wardrobe_looks', { toRow: lookToRow, fromRow: lookFromRow })

const items = computed<WardrobeItem[]>(() => itemRepository.items.value
  .filter((item: WardrobeItem) => isVisible(item))
  .sort(sortFavorites))
const looks = computed<WardrobeLook[]>(() => lookRepository.items.value
  .filter((look: WardrobeLook) => isVisible(look))
  .sort(sortFavorites))

async function createItem(payload: Omit<WardrobeItem, 'id' | 'workspaceId' | 'ownerId' | 'createdAt' | 'updatedAt'>) {
  const identity = currentIdentity()
  if (!identity) return { ok: false, message: 'Пространство не выбрано' }
  const now = new Date().toISOString()
  return itemRepository.createAndWait({ ...payload, ...identity, id: crypto.randomUUID(), createdAt: now, updatedAt: now })
}

async function updateItem(id: string, payload: Partial<WardrobeItem>) {
  if (!canEdit(itemRepository.findById(id))) return { ok: false, message: 'Изменять вещь может только её владелец' }
  return itemRepository.updateAndWait(id, { ...payload, updatedAt: new Date().toISOString() })
}

async function removeItem(id: string) {
  if (!canEdit(itemRepository.findById(id))) return { ok: false, message: 'Удалить вещь может только её владелец' }
  const result = await itemRepository.deleteAndWait(id)
  if (!result.ok) return result
  await Promise.all(looks.value
    .filter((look) => canEdit(look) && look.itemIds.includes(id))
    .map((look) => {
      const itemIds = look.itemIds.filter((itemId) => itemId !== id)
      return itemIds.length
        ? lookRepository.updateAndWait(look.id, { itemIds, layout:normalizeLookLayout(look.layout).filter(placement=>placement.itemId!==id), updatedAt: new Date().toISOString() })
        : lookRepository.deleteAndWait(look.id)
    }))
  return result
}

async function createLook(payload: Omit<WardrobeLook, 'id' | 'workspaceId' | 'ownerId' | 'createdAt' | 'updatedAt'>) {
  const identity = currentIdentity()
  if (!identity) return { ok: false, message: 'Пространство не выбрано' }
  const now = new Date().toISOString()
  return lookRepository.createAndWait({ ...payload, ...identity, id: crypto.randomUUID(), itemIds: uniqueIds(payload.itemIds), createdAt: now, updatedAt: now })
}

async function updateLook(id: string, payload: Partial<WardrobeLook>) {
  if (!canEdit(lookRepository.findById(id))) return { ok: false, message: 'Изменять образ может только его владелец' }
  const updates: Partial<WardrobeLook> = { ...payload, updatedAt: new Date().toISOString() }
  if (payload.itemIds) updates.itemIds = uniqueIds(payload.itemIds)
  return lookRepository.updateAndWait(id, updates)
}

async function removeLook(id: string) {
  if (!canEdit(lookRepository.findById(id))) return { ok: false, message: 'Удалить образ может только его владелец' }
  return lookRepository.deleteAndWait(id)
}

async function loadWorkspace(workspaceId: string) {
  const results = await Promise.all([itemRepository.loadWorkspace(workspaceId), lookRepository.loadWorkspace(workspaceId)])
  return results.some((result) => result === null) ? null : results
}

function currentIdentity() {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  const ownerId = authStore.currentUserId.value
  return workspaceId && ownerId ? { workspaceId, ownerId } : null
}

function isVisible(entity: WardrobeItem | WardrobeLook) {
  return entity.workspaceId === workspaceStore.activeWorkspaceId.value && (entity.visibility === 'shared' || entity.ownerId === authStore.currentUserId.value)
}

function canEdit(entity?: WardrobeItem | WardrobeLook | null) {
  return Boolean(entity && entity.ownerId === authStore.currentUserId.value)
}

function sortFavorites(first: WardrobeItem | WardrobeLook, second: WardrobeItem | WardrobeLook) {
  return Number(second.favorite) - Number(first.favorite) || second.updatedAt.localeCompare(first.updatedAt)
}

function uniqueIds(value: string[]) { return [...new Set(value.filter(Boolean))].slice(0, 30) }
function strings(value: unknown) { return Array.isArray(value) ? value.map(String).filter(Boolean) : [] }
function visibility(value: unknown): WardrobeItem['visibility'] { return value === 'shared' ? 'shared' : 'private' }

function itemToRow(item: WardrobeItem) { return { id:item.id,workspace_id:item.workspaceId,owner_id:item.ownerId,name:item.name,category:item.category,color:item.color,seasons:item.seasons,brand:item.brand,size:item.size,note:item.note,image_path:item.imagePath,status:item.status,visibility:item.visibility,favorite:item.favorite,created_at:item.createdAt,updated_at:item.updatedAt } }
function itemFromRow(row: Record<string, unknown>): WardrobeItem { return { id:String(row.id||''),workspaceId:String(row.workspace_id||''),ownerId:String(row.owner_id||''),name:String(row.name||''),category:['bottom','outerwear','shoes','accessory','onepiece'].includes(String(row.category))?String(row.category) as WardrobeItem['category']:'top',color:String(row.color||'#64748b'),seasons:strings(row.seasons),brand:String(row.brand||''),size:String(row.size||''),note:String(row.note||''),imagePath:String(row.image_path||''),status:['laundry','archived'].includes(String(row.status))?String(row.status) as WardrobeItem['status']:'available',visibility:visibility(row.visibility),favorite:row.favorite===true,createdAt:String(row.created_at||new Date().toISOString()),updatedAt:String(row.updated_at||new Date().toISOString()) } }
function lookToRow(look: WardrobeLook) { return { id:look.id,workspace_id:look.workspaceId,owner_id:look.ownerId,title:look.title,item_ids:look.itemIds,layout:look.layout,occasion:look.occasion,note:look.note,visibility:look.visibility,favorite:look.favorite,created_at:look.createdAt,updated_at:look.updatedAt } }
function lookFromRow(row: Record<string, unknown>): WardrobeLook { return { id:String(row.id||''),workspaceId:String(row.workspace_id||''),ownerId:String(row.owner_id||''),title:String(row.title||''),itemIds:strings(row.item_ids),layout:normalizeLookLayout(row.layout),occasion:['work','outing','sport','home','other'].includes(String(row.occasion))?String(row.occasion) as WardrobeLook['occasion']:'everyday',note:String(row.note||''),visibility:visibility(row.visibility),favorite:row.favorite===true,createdAt:String(row.created_at||new Date().toISOString()),updatedAt:String(row.updated_at||new Date().toISOString()) } }

export const wardrobeStore = { items, looks, createItem, updateItem, removeItem, createLook, updateLook, removeLook, loadWorkspace }
