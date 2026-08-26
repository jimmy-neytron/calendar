import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import type { InvestmentHolding, InvestmentSnapshot, InvestmentSource, InvestmentTransaction } from '../types/investment'
import { authStore } from './auth.store.js'
import { workspaceStore } from './workspace.store.js'

const sourceRepository = new SyncedCollectionRepository(`${APP_CONFIG.storageKey}:investment-sources`, [], 'investment_sources')
const holdingRepository = new SyncedCollectionRepository(`${APP_CONFIG.storageKey}:investment-holdings`, [], 'investment_holdings')
const snapshotRepository = new SyncedCollectionRepository(`${APP_CONFIG.storageKey}:investment-snapshots`, [], 'investment_snapshots')
const transactionRepository = new SyncedCollectionRepository(`${APP_CONFIG.storageKey}:investment-transactions`, [], 'investment_transactions')

const belongsToCurrentContext = (item: { workspaceId: string; userId: string }) => item.workspaceId === workspaceStore.activeWorkspaceId.value && item.userId === authStore.currentUserId.value
const sources = computed<InvestmentSource[]>(() => sourceRepository.items.value.filter(belongsToCurrentContext).sort((a: InvestmentSource, b: InvestmentSource) => a.createdAt.localeCompare(b.createdAt)))
const holdings = computed<InvestmentHolding[]>(() => holdingRepository.items.value.filter(belongsToCurrentContext).sort((a: InvestmentHolding, b: InvestmentHolding) => a.name.localeCompare(b.name, 'ru')))
const snapshots = computed<InvestmentSnapshot[]>(() => snapshotRepository.items.value.filter(belongsToCurrentContext).sort((a: InvestmentSnapshot, b: InvestmentSnapshot) => a.capturedOn.localeCompare(b.capturedOn)))
const transactions = computed<InvestmentTransaction[]>(() => transactionRepository.items.value.filter(belongsToCurrentContext).sort((a: InvestmentTransaction, b: InvestmentTransaction) => b.spentOn.localeCompare(a.spentOn) || b.createdAt.localeCompare(a.createdAt)))

function context() {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  const userId = authStore.currentUserId.value
  return workspaceId && userId ? { workspaceId, userId } : null
}

async function createSource(payload: Pick<InvestmentSource, 'name' | 'type' | 'color' | 'note'>) {
  const current = context()
  if (!current) return { ok: false, message: 'Пространство не выбрано' }
  const now = new Date().toISOString()
  return sourceRepository.createAndWait({ id: crypto.randomUUID(), ...current, ...payload, createdAt: now, updatedAt: now })
}

async function updateSource(id: string, payload: Partial<InvestmentSource>) {
  return sourceRepository.updateAndWait(id, { ...payload, updatedAt: new Date().toISOString() })
}

async function removeSource(id: string) {
  const nested = holdings.value.filter((item) => item.sourceId === id)
  for (const holding of nested) {
    const result = await holdingRepository.deleteAndWait(holding.id)
    if (!result.ok) return result
  }
  return sourceRepository.deleteAndWait(id)
}

async function createHolding(payload: Omit<InvestmentHolding, 'id' | 'workspaceId' | 'userId' | 'createdAt' | 'updatedAt'>) {
  const current = context()
  if (!current) return { ok: false, message: 'Пространство не выбрано' }
  const duplicate = holdings.value.find((item) => item.sourceId === payload.sourceId && item.assetType === payload.assetType && item.assetId === payload.assetId && item.network.toLowerCase() === payload.network.toLowerCase())
  if (duplicate) return { ok: false, message: 'Этот актив уже добавлен в источник — измени существующую позицию' }
  const now = new Date().toISOString()
  return holdingRepository.createAndWait({ id: crypto.randomUUID(), ...current, ...payload, createdAt: now, updatedAt: now })
}

async function updateHolding(id: string, payload: Partial<InvestmentHolding>) {
  const current = holdings.value.find((item) => item.id === id)
  if (!current) return { ok: false, message: 'Позиция не найдена' }
  const next = { ...current, ...payload }
  const duplicate = holdings.value.find((item) => item.id !== id && item.sourceId === next.sourceId && item.assetType === next.assetType && item.assetId === next.assetId && item.network.toLowerCase() === next.network.toLowerCase())
  if (duplicate) return { ok: false, message: 'Этот актив уже есть в выбранном источнике' }
  return holdingRepository.updateAndWait(id, { ...payload, updatedAt: new Date().toISOString() })
}

async function replaceHoldingAsset(id: string, asset: { assetId: string; name: string; symbol: string }) {
  const current = holdings.value.find((item) => item.id === id)
  if (!current) return { ok: false, message: 'Позиция не найдена' }
  if (!asset.assetId.trim() || !asset.name.trim() || !asset.symbol.trim()) return { ok: false, message: 'Выбери новый токен' }
  if (current.assetId === asset.assetId) return { ok: false, message: 'Этот токен уже выбран' }

  return updateHolding(id, {
    assetType: 'crypto',
    assetId: asset.assetId.trim(),
    name: asset.name.trim(),
    symbol: asset.symbol.trim().toUpperCase(),
    network: '',
    contractAddress: '',
  })
}

async function removeHolding(id: string) { return holdingRepository.deleteAndWait(id) }

async function recordExpense(payload: Omit<InvestmentTransaction, 'id' | 'workspaceId' | 'userId' | 'createdAt' | 'updatedAt' | 'sourceId' | 'assetId' | 'assetType' | 'name' | 'symbol'>) {
  const current = context()
  if (!current) return { ok: false, message: 'Пространство не выбрано' }
  const holding = holdings.value.find((item) => item.id === payload.holdingId)
  if (!holding) return { ok: false, message: 'Позиция не найдена' }
  const quantity = Number(payload.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, message: 'Укажи сумму списания' }
  if (quantity > holding.quantity) return { ok: false, message: `Доступно только ${holding.quantity} ${holding.symbol}` }

  const remainingQuantity = Math.max(0, holding.quantity - quantity)
  const remainingCost = holding.quantity > 0 ? holding.costAmount * remainingQuantity / holding.quantity : 0
  const holdingResult = await holdingRepository.updateAndWait(holding.id, { quantity: remainingQuantity, costAmount: remainingCost, updatedAt: new Date().toISOString() })
  if (!holdingResult.ok) return holdingResult

  const now = new Date().toISOString()
  const transaction = { id: crypto.randomUUID(), ...current, ...payload, sourceId: holding.sourceId, assetId: holding.assetId, assetType: holding.assetType, name: holding.name, symbol: holding.symbol, quantity, createdAt: now, updatedAt: now }
  const transactionResult = await transactionRepository.createAndWait(transaction)
  if (transactionResult.ok) return transactionResult

  await holdingRepository.updateAndWait(holding.id, { quantity: holding.quantity, costAmount: holding.costAmount, updatedAt: new Date().toISOString() })
  return transactionResult
}

async function captureSnapshot(totalRub: number, totalUsd: number, positions: InvestmentSnapshot['positions']) {
  const current = context()
  if (!current || totalRub <= 0 && totalUsd <= 0) return { ok: false, message: 'Нет данных для снимка' }
  const capturedOn = getMoscowDate()
  const existing = snapshots.value.find((item) => item.capturedOn === capturedOn)
  const now = new Date().toISOString()
  if (existing) return snapshotRepository.updateAndWait(existing.id, { totalRub, totalUsd, positions, updatedAt: now })
  return snapshotRepository.createAndWait({ id: crypto.randomUUID(), ...current, capturedOn, totalRub, totalUsd, positions, createdAt: now, updatedAt: now })
}

async function loadWorkspace(workspaceId: string) {
  const results = await Promise.all([sourceRepository.loadWorkspace(workspaceId), holdingRepository.loadWorkspace(workspaceId), snapshotRepository.loadWorkspace(workspaceId), transactionRepository.loadWorkspace(workspaceId)])
  return results.some((result) => result === null) ? null : results
}

function getMoscowDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const value = (type: 'year' | 'month' | 'day') => parts.find((part) => part.type === type)?.value || ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export const investmentStore = { sources, holdings, snapshots, transactions, createSource, updateSource, removeSource, createHolding, updateHolding, replaceHoldingAsset, removeHolding, recordExpense, captureSnapshot, loadWorkspace }
