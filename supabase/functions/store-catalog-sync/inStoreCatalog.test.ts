import { describe, expect, it, vi } from 'vitest'
import { parseCatalogContext, parseMagnitCatalogPage } from './catalogParser'
import { fetchMagnitCatalog } from './magnitCatalogClient'

const source = { url: 'https://magnit.ru/catalog/63905-testmmovoshchi_i_frukty?shopCode=780171&shopType=1', store_code: '780171' }
const context = parseCatalogContext(source)
// Public API shape observed for shop 780171 on 2026-09-03. Prices are test data.
const product = { id: '9072651501', name: 'Бананы', storeCode: '780171', service: 'core_mm', catalogType: '1',
  price: 13769, quantity: 100, weighted: { isWeighted: true, shelfWeight: 1000, step: 1000, minStep: 1, unitLabel: '1кг', unitPrice: 13769 } }
const page = (item: unknown) => ({ items: [item], pagination: { offset: 0, hasMore: false } })

describe('physical-store catalogue', () => {
  it.each(['', '&catalogType=1'])('keeps the physical store context with suffix %s', suffix => {
    expect(parseCatalogContext({ ...source, url: source.url + suffix })).toEqual({ storeCode: '780171', storeType: '1', catalogType: '1', categoryId: 63905 })
  })
  it.each(['1&catalogType=2', '1&catalogType=3', '2', 'core_mm', 'express&catalogType=1', 'dostavka&catalogType=1'])('rejects unsupported or mixed modes %s', mode => {
    expect(() => parseCatalogContext({ ...source, url: source.url.replace('shopType=1', `shopType=${mode}`) })).toThrow('Для цен в магазине')
  })
  it('accepts only the documented core_mm alias and retains offline product links and weight units', () => {
    expect(parseMagnitCatalogPage(page(product), context).products[0]).toMatchObject({ price: 137.69, shelfWeight: 1000, unitPrice: 137.69,
      productUrl: 'https://magnit.ru/product/9072651501?shopCode=780171&shopType=1&catalogType=1' })
  })
  it.each([{ service: 'express' }, { service: 'dostavka' }, { service: '1' }, { service: undefined }, { catalogType: '2' }, { storeCode: '992301' }])('rejects mismatched response %s', changes => {
    expect(() => parseMagnitCatalogPage(page({ ...product, ...changes }), context)).toThrow('другого магазина')
  })
  it('does not confirm unavailable products', () => {
    expect(parseMagnitCatalogPage(page({ ...product, quantity: 0 }), context).products[0].price).toBeNull()
  })
  it('sends numeric-string shop type and offline catalogue without rewriting the source', async () => {
    const request = vi.fn<typeof fetch>(async (_url, init) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({ storeCode: '780171', storeType: '1', catalogType: '1', categories: [63905] })
      return Response.json(page(product))
    })
    expect((await fetchMagnitCatalog(source, request)).products).toHaveLength(1)
    expect(request).toHaveBeenCalledOnce()
    expect(source.url).toContain('shopType=1')
  })
  it('does not retry with delivery or HTML when offline loading fails', async () => {
    const request = vi.fn<typeof fetch>(async () => new Response('', { status: 503 }))
    await expect(fetchMagnitCatalog(source, request)).rejects.toThrow('HTTP 503')
    expect(request).toHaveBeenCalledOnce()
  })
})
