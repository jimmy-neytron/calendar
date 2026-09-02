import { effectScope, ref, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStoreCatalog } from './useStoreCatalog'
import type { IngredientProductLink, StoreCatalogSource, StoreProduct } from '../types/storeCatalog.types'

const api = vi.hoisted(() => ({ listStoreSources: vi.fn(), listStoreProducts: vi.fn(), listIngredientLinks: vi.fn(), updateStoreSource: vi.fn(), deleteStoreSource: vi.fn(), clearStoreSourceProducts: vi.fn(), deleteStoreProducts: vi.fn() }))
vi.mock('../api/storeCatalog.api', () => api)
vi.mock('../../../stores/workspace.store.js', () => ({ workspaceStore: { activeWorkspaceId: ref('w1') } }))
vi.mock('../../meals/stores/mealPlan.store', () => ({ mealPlanStore: { week: ref(null), recipeById: ref(new Map()) } }))
const source: StoreCatalogSource = { id: 's1', workspaceId: 'w1', store: 'magnit', storeCode: '780171', name: 'Бакалея', url: 'https://magnit.ru/catalog/64121-bakaleya?shopCode=780171&shopType=express', enabled: true, lastSyncedAt: null, nextSyncAt: '', status: 'success', lastError: '', productCount: 2 }
const product: StoreProduct = { id: 'p1', workspaceId: 'w1', store: 'magnit', productCode: '100001', name: 'Рис', normalizedName: 'рис', imageUrl: '', productUrl: '', packageAmount: 500, packageUnit: 'g', currentPrice: 100, oldPrice: null, priceUpdatedAt: new Date().toISOString(), priceVerified: true, priceSourceId: 's1', priceStoreCode: '780171', priceStoreType: 'express', priceCatalogType: '2', sourceIds: ['s1'] }
const link: IngredientProductLink = { id: 'l1', workspaceId: 'w1', ingredientName: 'Рис', normalizedIngredientName: 'рис', ingredientUnit: 'g', productId: 'p1', packageAmountOverride: null }
let scope: EffectScope
beforeEach(() => {
  vi.resetAllMocks()
  api.listStoreSources.mockResolvedValue([{ ...source }, { ...source, id: 's2' }])
  api.listStoreProducts.mockResolvedValue([product, { ...product, id: 'shared', sourceIds: ['s1', 's2'] }])
  api.listIngredientLinks.mockResolvedValue([link, { ...link, id: 'l2', productId: 'shared' }])
  api.deleteStoreSource.mockResolvedValue([])
  scope = effectScope()
})
afterEach(() => scope.stop())
async function setup() { const catalog = scope.run(useStoreCatalog)!; await catalog.loadCatalog(); return catalog }

describe('local source management state', () => {
  it('removes explicit products and links, including shared products, and updates source counts', async () => {
    const catalog = await setup()
    api.deleteStoreProducts.mockResolvedValue({ deletedProductIds: ['shared'], sources: [{ ...source, productCount: 1 }, { ...source, id: 's2', productCount: 0 }] })
    await catalog.removeProducts(['shared'])
    expect(api.deleteStoreProducts).toHaveBeenCalledExactlyOnceWith('w1', ['shared'])
    expect(catalog.products.value.map(item => item.id)).toEqual(['p1'])
    expect(catalog.links.value.map(item => item.productId)).toEqual(['p1'])
    expect(catalog.sources.value.map(item => item.productCount)).toEqual([1, 0])
  })
  it('can remove an orphan without a source', async () => {
    api.listStoreProducts.mockResolvedValue([{ ...product, sourceIds: [], priceSourceId: '' }])
    api.listStoreSources.mockResolvedValue([])
    const catalog = await setup()
    api.deleteStoreProducts.mockResolvedValue({ deletedProductIds: ['p1'], sources: [] })
    await catalog.removeProducts(['p1'])
    expect(catalog.products.value).toEqual([])
  })
  it('preserves catalog data after a failed product deletion', async () => {
    const catalog = await setup()
    api.deleteStoreProducts.mockRejectedValue(new Error('Сеть недоступна'))
    await expect(catalog.removeProducts(['p1'])).rejects.toThrow('Сеть недоступна')
    expect(catalog.products.value).toHaveLength(2)
    expect(catalog.links.value).toHaveLength(2)
    expect(catalog.sources.value[0].productCount).toBe(2)
    expect(catalog.saving.value).toBe(false)
  })
  it('blocks unrecognized products and product deletion during a sync', async () => {
    const catalog = await setup()
    await expect(catalog.removeProducts(['unknown'])).rejects.toThrow('не найдены')
    catalog.sources.value[0].status = 'syncing'
    await expect(catalog.removeProducts(['p1'])).rejects.toThrow('Дождитесь')
    expect(api.deleteStoreProducts).not.toHaveBeenCalled()
  })
  it('preserves prices when only the source name changes', async () => {
    const catalog = await setup()
    api.updateStoreSource.mockResolvedValue({ ...source, name: 'Новое имя' })
    await catalog.editSource('s1', { ...source, name: 'Новое имя' })
    expect(catalog.sources.value[0].name).toBe('Новое имя')
    expect(catalog.products.value[0].currentPrice).toBe(100)
  })
  it('invalidates prices on a category URL change even within the same shop', async () => {
    const catalog = await setup()
    const changed = { ...source, url: source.url.replace('64121', '64122') }
    api.updateStoreSource.mockResolvedValue(changed)
    await catalog.editSource('s1', changed)
    expect(catalog.products.value.every(item => item.currentPrice === null)).toBe(true)
    expect(catalog.links.value).toHaveLength(2)
  })
  it('removes a source without deleting products or ingredient links', async () => {
    const catalog = await setup()
    await catalog.removeSource('s1', false)
    expect(api.deleteStoreSource).toHaveBeenCalledExactlyOnceWith('w1', 's1', false)
    expect(catalog.sources.value.map(item => item.id)).toEqual(['s2'])
    expect(catalog.products.value).toHaveLength(2)
    expect(catalog.products.value[1]).toMatchObject({ sourceIds: ['s2'], priceVerified: false })
    expect(catalog.links.value).toHaveLength(2)
  })
  it('deletes unique products by default and retains shared products and their links', async () => {
    const catalog = await setup()
    api.deleteStoreSource.mockResolvedValue(['p1'])
    await catalog.removeSource('s1')
    expect(api.deleteStoreSource).toHaveBeenCalledExactlyOnceWith('w1', 's1', true)
    expect(catalog.sources.value.map(item => item.id)).toEqual(['s2'])
    expect(catalog.products.value.map(item => item.id)).toEqual(['shared'])
    expect(catalog.products.value[0]).toMatchObject({ sourceIds: ['s2'], priceVerified: false })
    expect(catalog.links.value.map(item => item.productId)).toEqual(['shared'])
  })
  it('retains the source, products and links if combined deletion fails', async () => {
    const catalog = await setup()
    api.deleteStoreSource.mockRejectedValue(new Error('Сеть недоступна'))
    await expect(catalog.removeSource('s1')).rejects.toThrow('Сеть недоступна')
    expect(catalog.sources.value).toHaveLength(2)
    expect(catalog.products.value).toHaveLength(2)
    expect(catalog.links.value).toHaveLength(2)
    expect(catalog.products.value[0].priceVerified).toBe(true)
    expect(catalog.saving.value).toBe(false)
  })
  it('clears only server-confirmed product IDs and their links, retaining shared products', async () => {
    const catalog = await setup()
    api.clearStoreSourceProducts.mockResolvedValue({ source: { ...source, enabled: false, productCount: 0 }, deletedProductIds: ['p1'] })
    await catalog.clearSourceProducts('s1')
    expect(catalog.products.value.map(item => item.id)).toEqual(['shared'])
    expect(catalog.products.value[0].sourceIds).toEqual(['s2'])
    expect(catalog.links.value.map(item => item.productId)).toEqual(['shared'])
    expect(catalog.sources.value[0]).toMatchObject({ enabled: false, productCount: 0 })
  })
  it('does not mutate data when the backend rejects a deletion', async () => {
    const catalog = await setup()
    api.clearStoreSourceProducts.mockRejectedValue(new Error('Сеть недоступна'))
    await expect(catalog.clearSourceProducts('s1')).rejects.toThrow('Сеть недоступна')
    expect(catalog.products.value).toHaveLength(2)
    expect(catalog.links.value).toHaveLength(2)
    expect(catalog.saving.value).toBe(false)
  })
  it('blocks mutations during synchronization', async () => {
    const catalog = await setup()
    catalog.syncingSourceId.value = 's2'
    await expect(catalog.removeSource('s1')).rejects.toThrow('Дождитесь')
    expect(api.deleteStoreSource).not.toHaveBeenCalled()
  })
})
