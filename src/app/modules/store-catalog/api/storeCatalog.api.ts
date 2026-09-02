import { requireAuthenticatedSupabase, requireSupabase } from '../../../api/supabase/client.js'
import { isStorePriceCurrent } from '../../../../../supabase/functions/_shared/storePrice'
import { normalizeStoreSourceDraft } from '../services/storeSourceDraft'
import type {
  IngredientProductLink,
  StoreCatalogSource,
  StorePackageUnit,
  StoreProduct,
  StoreSourceDraft,
} from '../types/storeCatalog.types'

export async function listStoreSources(workspaceId: string): Promise<StoreCatalogSource[]> {
  const { data, error } = await requireSupabase()
    .from('store_catalog_sources')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name')
  if (error) throw error
  return (data || []).map(mapSource)
}

export async function listStoreProducts(workspaceId: string): Promise<StoreProduct[]> {
  const products: StoreProduct[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await requireSupabase()
      .from('store_products').select('*,store_source_products(source_id)')
      .eq('workspace_id', workspaceId).order('id').range(offset, offset + 499)
    if (error) throw error
    products.push(...(data || []).map(mapProduct))
    if (!data || data.length < 500) break
  }
  return products.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export async function listIngredientLinks(workspaceId: string): Promise<IngredientProductLink[]> {
  const { data, error } = await requireSupabase()
    .from('meal_ingredient_product_links')
    .select('*')
    .eq('workspace_id', workspaceId)
  if (error) throw error
  return (data || []).map(mapLink)
}

export async function createStoreSource(workspaceId: string, draft: StoreSourceDraft): Promise<StoreCatalogSource> {
  const { name, url, storeCode } = normalizeStoreSourceDraft(draft)
  const { data, error } = await requireSupabase()
    .from('store_catalog_sources')
    .insert({
      workspace_id: workspaceId,
      store: 'magnit',
      store_code: storeCode,
      url,
      name,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.code === '23505' ? 'Источник с такой ссылкой уже добавлен в это пространство.' : error.message)
  return mapSource(data)
}

export async function setStoreSourceEnabled(sourceId: string, enabled: boolean): Promise<void> {
  const { error } = await requireSupabase()
    .from('store_catalog_sources')
    .update({ enabled })
    .eq('id', sourceId)
  if (error) throw error
}

export async function updateStoreSource(workspaceId: string, sourceId: string, draft: StoreSourceDraft): Promise<StoreCatalogSource> {
  const normalized = normalizeStoreSourceDraft(draft)
  const result = await manageStoreSource(workspaceId, sourceId, 'update', normalized)
  return mapSource(result.source)
}

export async function deleteStoreSource(workspaceId: string, sourceId: string, deleteProducts = true): Promise<string[]> {
  if (!workspaceId || !sourceId) throw new Error('Не выбран источник или рабочее пространство.')
  const { data, error } = await requireSupabase().rpc('delete_store_catalog_source', {
    p_workspace_id: workspaceId, p_source_id: sourceId, p_delete_products: deleteProducts,
  })
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new Error('Удаление источника с товарами ещё не установлено в базе. Примените миграцию 20260903000000_store_catalog_source_delete_products.sql.')
    }
    throw new Error(error.message || 'Не удалось удалить источник.')
  }
  return (data as { deleted_product_ids: string[] }).deleted_product_ids
}

export async function clearStoreSourceProducts(workspaceId: string, sourceId: string) {
  const result = await manageStoreSource(workspaceId, sourceId, 'clear_products')
  return { source: mapSource(result.source), deletedProductIds: result.deleted_product_ids || [] }
}

export async function deleteStoreProducts(workspaceId: string, productIds: string[]) {
  if (!workspaceId || !productIds.length || productIds.some(id => !id)) throw new Error('Выберите товары и рабочее пространство.')
  const { data, error } = await requireSupabase().rpc('delete_store_catalog_products', {
    p_workspace_id: workspaceId, p_product_ids: [...new Set(productIds)],
  })
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new Error('Удаление товаров ещё не установлено в базе. Примените миграцию 20260903010000_store_catalog_delete_products.sql.')
    }
    throw new Error(error.message || 'Не удалось удалить товары.')
  }
  const result = data as { deleted_product_ids: string[]; sources: Record<string, unknown>[] }
  return { deletedProductIds: result.deleted_product_ids, sources: result.sources.map(mapSource) }
}

async function manageStoreSource(workspaceId: string, sourceId: string, action: 'update' | 'delete' | 'clear_products', draft?: StoreSourceDraft) {
  if (!workspaceId || !sourceId) throw new Error('Не выбран источник или рабочее пространство.')
  const { data, error } = await requireSupabase().rpc('manage_store_catalog_source', {
    p_workspace_id: workspaceId, p_source_id: sourceId, p_action: action,
    p_name: draft?.name ?? null, p_url: draft?.url ?? null, p_store_code: draft?.storeCode ?? null,
  })
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new Error('Управление источниками ещё не установлено в базе. Примените миграцию store_catalog_source_management.')
    }
    throw new Error(error.message || 'Не удалось изменить источник.')
  }
  return data as { source: Record<string, unknown>; deleted_product_ids?: string[] }
}

export async function syncStoreSource(sourceId: string): Promise<void> {
  const client = await requireAuthenticatedSupabase()
  const { error } = await client.functions.invoke('store-catalog-sync', { body: { sourceId } })
  if (error) throw await mapFunctionError(error)
}

export async function saveIngredientLink(
  workspaceId: string,
  ingredientName: string,
  ingredientUnit: StorePackageUnit,
  productId: string,
  normalizedIngredientName: string,
): Promise<IngredientProductLink> {
  const { data, error } = await requireSupabase()
    .from('meal_ingredient_product_links')
    .upsert({
      workspace_id: workspaceId,
      ingredient_name: ingredientName,
      normalized_ingredient_name: normalizedIngredientName,
      ingredient_unit: ingredientUnit,
      product_id: productId,
    }, { onConflict: 'workspace_id,normalized_ingredient_name,ingredient_unit' })
    .select('*')
    .single()
  if (error) throw error
  return mapLink(data)
}

export async function removeIngredientLink(workspaceId: string, normalizedName: string, unit: StorePackageUnit): Promise<void> {
  const { error } = await requireSupabase().from('meal_ingredient_product_links').delete()
    .eq('workspace_id', workspaceId).eq('normalized_ingredient_name', normalizedName).eq('ingredient_unit', unit)
  if (error) throw error
}

export async function updateProductPackage(productId: string, amount: number, unit: StorePackageUnit): Promise<void> {
  const { error } = await requireSupabase()
    .from('store_products')
    .update({ package_amount: amount, package_unit: unit, package_is_manual: true })
    .eq('id', productId)
    .eq('is_weighted', false)
    .select('id')
    .single()
  if (error) throw error
}

function mapSource(row: Record<string, unknown>): StoreCatalogSource {
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), store: String(row.store || 'magnit'),
    storeCode: String(row.store_code || ''), url: String(row.url || ''), name: String(row.name || ''),
    enabled: row.enabled !== false, lastSyncedAt: row.last_synced_at ? String(row.last_synced_at) : null,
    nextSyncAt: String(row.next_sync_at || ''), status: String(row.status || 'idle') as StoreCatalogSource['status'],
    lastError: String(row.last_error || ''), productCount: Number(row.product_count || 0),
  }
}

function mapProduct(row: Record<string, unknown>): StoreProduct {
  const relations = Array.isArray(row.store_source_products) ? row.store_source_products as Array<Record<string, unknown>> : []
  const current = isStorePriceCurrent(row.current_price, row.price_verified, row.price_updated_at)
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), store: String(row.store || 'magnit'),
    productCode: String(row.product_code || ''), name: String(row.name || ''), normalizedName: String(row.normalized_name || ''),
    imageUrl: String(row.image_url || ''), productUrl: String(row.product_url || ''),
    packageAmount: row.package_amount == null ? null : Number(row.package_amount),
    packageUnit: row.package_unit ? String(row.package_unit) as StorePackageUnit : null,
    currentPrice: current ? Number(row.current_price) : null,
    oldPrice: current && row.old_price != null ? Number(row.old_price) : null,
    priceUpdatedAt: row.price_updated_at ? String(row.price_updated_at) : null,
    priceVerified: current,
    priceSourceId: String(row.price_source_id || ''),
    priceStoreCode: String(row.price_store_code || ''),
    priceStoreType: String(row.price_store_type || ''),
    priceCatalogType: String(row.price_catalog_type || ''),
    sourceIds: relations.map((relation) => String(relation.source_id)),
    isWeighted: row.is_weighted === true,
    weightStep: row.weight_step == null ? null : Number(row.weight_step),
    weightMinimum: row.weight_minimum == null ? null : Number(row.weight_minimum),
    unitPrice: current && row.unit_price != null ? Number(row.unit_price) : null,
  }
}

function mapLink(row: Record<string, unknown>): IngredientProductLink {
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), ingredientName: String(row.ingredient_name || ''),
    normalizedIngredientName: String(row.normalized_ingredient_name || ''),
    ingredientUnit: String(row.ingredient_unit) as StorePackageUnit, productId: String(row.product_id),
    packageAmountOverride: row.package_amount_override == null ? null : Number(row.package_amount_override),
  }
}

async function mapFunctionError(reason: unknown) {
  const fallback = reason instanceof Error ? reason.message : 'Не удалось вызвать функцию синхронизации'
  const context = reason && typeof reason === 'object' ? (reason as { context?: unknown }).context : null
  if (!(context instanceof Response)) return new Error(fallback)
  try {
    const payload = await context.clone().json() as { error?: string; message?: string }
    return new Error(payload.error || payload.message || fallback)
  } catch {
    try { return new Error((await context.clone().text()).trim() || fallback) }
    catch { return new Error(fallback) }
  }
}
