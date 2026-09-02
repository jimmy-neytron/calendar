import { describe, expect, it } from 'vitest'
import { getCurrentStoreProducts } from './storeCatalog.service'
import type { StoreCatalogSource, StoreProduct } from '../types/storeCatalog.types'

const now = Date.parse('2026-09-02T12:00:00Z')
const source: StoreCatalogSource = {
  id: 's1', workspaceId: 'w1', store: 'magnit', storeCode: '780171', name: 'Бакалея',
  url: 'https://magnit.ru/catalog/64121-bakaleya?shopCode=780171&shopType=express',
  enabled: true, lastSyncedAt: '2026-09-02T11:00:00Z', nextSyncAt: '2026-09-02T23:00:00Z',
  status: 'success', lastError: '', productCount: 1,
}
const product: StoreProduct = {
  id: 'p1', workspaceId: 'w1', store: 'magnit', productCode: '1001234', name: 'Макароны 500 г', normalizedName: 'макароны 500 г',
  imageUrl: '', productUrl: '', packageAmount: 500, packageUnit: 'g', currentPrice: 119.99, oldPrice: null,
  priceUpdatedAt: source.lastSyncedAt, priceVerified: true, priceSourceId: 's1',
  priceStoreCode: '780171', priceStoreType: 'express', priceCatalogType: '2', sourceIds: ['s1'],
}

describe('price validity is independent of auto updates', () => {
  it('does not reuse delivery prices after switching to shelf prices', () => {
    const offline = { ...source, url: source.url.replace('shopType=express', 'shopType=1') }
    expect(getCurrentStoreProducts([product], [offline], now)[0]).toMatchObject({ currentPrice: null, priceVerified: false })
    const shelfProduct = { ...product, priceStoreType: '1', priceCatalogType: '1' }
    expect(getCurrentStoreProducts([shelfProduct], [offline], now)[0]).toEqual(shelfProduct)
    expect(getCurrentStoreProducts([shelfProduct], [source], now)[0]).toMatchObject({ currentPrice: null, priceVerified: false })
  })
  it.each([true, false])('retains a verified price when auto=%s', enabled => {
    expect(getCurrentStoreProducts([product], [{ ...source, enabled }], now)[0]).toEqual(product)
  })
  it('does not let an unrelated disabled source hide the latest shop prices', () => {
    expect(getCurrentStoreProducts([product], [source, { ...source, id: 's2', enabled: false, storeCode: '992301' }], now)[0]).toEqual(product)
  })
  it('still expires prices after 24 hours with auto off', () => {
    expect(getCurrentStoreProducts([product], [{ ...source, enabled: false }], now + 86400000)[0])
      .toMatchObject({ currentPrice: null, oldPrice: null, priceVerified: false })
  })
  it('still rejects a changed or deleted originating source', () => {
    for (const sources of [[], [{ ...source, storeCode: '992301' }], [{ ...source, url: source.url + '&catalogType=3' }]]) {
      expect(getCurrentStoreProducts([product], sources, now)[0]).toMatchObject({ currentPrice: null, priceVerified: false })
    }
  })
})
