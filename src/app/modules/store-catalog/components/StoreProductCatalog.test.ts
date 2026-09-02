import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import StoreProductCatalog from './StoreProductCatalog.vue'
import StorePurchasesToday from './StorePurchasesToday.vue'
import type { StoreProduct } from '../types/storeCatalog.types'

const product: StoreProduct = {
  id: 'p1', workspaceId: 'w1', store: 'magnit', productCode: '1000166506',
  name: 'Макароны Barilla 450-500г', normalizedName: 'макароны barilla 450-500г', imageUrl: '',
  productUrl: 'https://magnit.ru/product/1000166506?shopCode=780171&shopType=express&catalogType=2',
  packageAmount: null, packageUnit: null, currentPrice: 119.99, oldPrice: null,
  priceUpdatedAt: '2026-09-02T12:00:00Z', priceVerified: true, priceSourceId: 's1', priceStoreCode: '780171',
  priceStoreType: 'express', priceCatalogType: '2', sourceIds: ['s1'],
}

describe('nutrition catalog price presentation', () => {
  it('shows precise rubles, shop context, product link and ambiguous packaging', async () => {
    const html = await renderToString(createSSRApp(StoreProductCatalog, { products: [product], sources: [], requirements: [] }))
    expect(html).toContain('119,99 ₽')
    expect(html).toContain('780171')
    expect(html).toContain('Доставка · express')
    expect(html).toContain('Уточните фасовку')
    expect(html).toContain('shopCode=780171&amp;shopType=express&amp;catalogType=2')
  })
  it('keeps the product grid paginated for large catalogs', async () => {
    const products = Array.from({ length: 25 }, (_, i) => ({ ...product, id: String(i) }))
    const html = await renderToString(createSSRApp(StoreProductCatalog, { products, sources: [], requirements: [] }))
    expect(html.match(/class="product-card"/g)).toHaveLength(24)
  })
  it('does not present an entirely unresolved purchase as free', async () => {
    const html = await renderToString(createSSRApp(StorePurchasesToday, {
      products: [], purchases: [{ name: 'Картофель', normalizedName: 'картофель', amount: 100, unit: 'g', product: null, link: null, packageAmount: null, packages: null, lineTotal: null, confirmed: false }], total: 0, unresolvedCount: 1,
    }))
    expect(html).toContain('Нужны цены')
    expect(html).not.toContain('0 ₽')
  })
})
