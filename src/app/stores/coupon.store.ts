import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import type { Coupon, CouponBarcodeFormat, CouponCodeType, CouponDiscountType, CouponPayload } from '../types/coupon'
import { workspaceStore } from './workspace.store.js'

const repository = new SyncedCollectionRepository(
  `${APP_CONFIG.storageKey}:coupons`,
  [] as Coupon[],
  'coupons',
  { toRow: toDatabaseRow, fromRow: fromDatabaseRow },
)

const items = computed<Coupon[]>(() => repository.items.value
  .filter((item: Coupon) => item.workspaceId === workspaceStore.activeWorkspaceId.value)
  .sort((left: Coupon, right: Coupon) => Number(left.isUsed) - Number(right.isUsed)
    || expirySortValue(left.expiresOn) - expirySortValue(right.expiresOn)
    || right.createdAt.localeCompare(left.createdAt)))

async function create(payload: CouponPayload) {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId) return { ok: false, message: 'Пространство не выбрано' }
  const now = new Date().toISOString()
  return repository.createAndWait({ ...payload, id: crypto.randomUUID(), workspaceId, createdAt: now, updatedAt: now })
}

async function update(id: string, payload: Partial<CouponPayload>) {
  return repository.updateAndWait(id, { ...payload, updatedAt: new Date().toISOString() })
}

function remove(id: string) { return repository.deleteAndWait(id) }
function restore(coupon: Coupon) { return repository.createAndWait(coupon) }
function loadWorkspace(workspaceId: string) { return repository.loadWorkspace(workspaceId) }
function expirySortValue(value: string) { return value ? new Date(`${value}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER }

function toDatabaseRow(item: Coupon) {
  return {
    id: item.id, workspace_id: item.workspaceId, title: item.title, merchant: item.merchant, description: item.description,
    discount_type: item.discountType, discount_value: item.discountValue, discount_label: item.discountLabel,
    code_type: item.codeType, code_value: item.codeValue, barcode_format: item.barcodeFormat,
    secondary_code_value: item.secondaryCodeValue || '', secondary_barcode_format: item.secondaryBarcodeFormat || 'code128',
    expires_on: item.expiresOn || null, terms: item.terms, color: item.color, is_used: item.isUsed,
    created_at: item.createdAt, updated_at: item.updatedAt,
  }
}

function fromDatabaseRow(row: Record<string, unknown>): Coupon {
  return {
    id: String(row.id || ''), workspaceId: String(row.workspace_id || ''), title: String(row.title || ''), merchant: String(row.merchant || ''), description: String(row.description || ''),
    discountType: normalizeDiscountType(row.discount_type), discountValue: Math.max(0, Number(row.discount_value || 0)), discountLabel: String(row.discount_label || ''),
    codeType: normalizeCodeType(row.code_type), codeValue: String(row.code_value || ''), barcodeFormat: normalizeBarcodeFormat(row.barcode_format),
    secondaryCodeValue: String(row.secondary_code_value || ''), secondaryBarcodeFormat: normalizeBarcodeFormat(row.secondary_barcode_format),
    expiresOn: String(row.expires_on || ''), terms: String(row.terms || ''), color: String(row.color || '#7c8cf8'), isUsed: Boolean(row.is_used),
    createdAt: String(row.created_at || new Date().toISOString()), updatedAt: String(row.updated_at || new Date().toISOString()),
  }
}

function normalizeDiscountType(value: unknown): CouponDiscountType { return ['percent', 'amount', 'text'].includes(String(value)) ? String(value) as CouponDiscountType : 'percent' }
function normalizeCodeType(value: unknown): CouponCodeType { return ['qr', 'barcode', 'promo', 'none'].includes(String(value)) ? String(value) as CouponCodeType : 'promo' }
function normalizeBarcodeFormat(value: unknown): CouponBarcodeFormat { return ['code128', 'ean13', 'ean8', 'upca'].includes(String(value)) ? String(value) as CouponBarcodeFormat : 'code128' }

export const couponStore = { items, create, update, remove, restore, loadWorkspace }
