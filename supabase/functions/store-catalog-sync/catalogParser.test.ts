import { describe, expect, it, vi } from 'vitest'
import { parseCatalogContext, parseMagnitCatalogPage } from './catalogParser'
import { fetchMagnitCatalog } from './magnitCatalogClient'
import { isStorePriceCurrent } from '../_shared/storePrice'

const source = { url: 'https://magnit.ru/catalog/64121-testmmbakaleya?shopCode=780171&shopType=express', store_code: '780171' }
const context = parseCatalogContext(source)
const product = {
  id: '1000166506', name: 'Макароны Barilla спагетти Баветте 450-500г',
  storeCode: '780171', service: 'express', catalogType: '2',
  price: 11999, promotion: { oldPrice: null }, quantity: 25, weighted: { isWeighted: false },
  gallery: [{ type: 'IMAGE', url: 'https://images-foodtech.magnit.ru/pasta.webp' }],
}
const page = (items: unknown[], offset = 0, hasMore = false) => ({ items, pagination: { offset, hasMore, nextOffset: null } })

describe('Magnit store-scoped prices', () => {
  it.each([
    ['9072651210', 'Картофель', 10000, 2000, 5000, 100],
    ['1445100062', 'Картофель фасованный', 12397, 2480, 4999, 123.97],
    ['9072651204', 'Лук репчатый', 4830, 700, 6900, 48.3],
  ])('imports shelf price and weight for %s without treating them as a kg price', (id, name, price, grams, unitPrice, expected) => {
    const result = parseMagnitCatalogPage(page([{ ...product, id, name, price,
      weighted: { isWeighted: true, shelfWeight: grams, step: grams, minStep: 1, unitLabel: '1кг', unitPrice },
    }]), context).products[0]
    expect(result).toMatchObject({ price: expected, isWeighted: true, shelfWeight: grams, weightStep: grams, weightMinimum: grams, unitPrice: unitPrice / 100 })
  })
  it.each([
    { shelfWeight: null }, { step: 0 }, { minStep: null }, { unitLabel: '1шт' }, { unitPrice: null },
  ])('does not guess missing weighted price units: %s', changes => {
    const result = parseMagnitCatalogPage(page([{ ...product, weighted: {
      isWeighted: true, shelfWeight: 2000, step: 2000, minStep: 1, unitLabel: '1кг', unitPrice: 5000, ...changes,
    } }]), context).products[0]
    expect(result.price).toBeNull()
  })
  it.each([[11999, 119.99], [9999, 99.99], [6999, 69.99], [2600, 26], [10000, 100], [1200000, 12000]])(
    'converts %s kopecks to %s rubles without magnitude guessing', (minor, rubles) => {
      const [result] = parseMagnitCatalogPage(page([{ ...product, price: minor }]), context).products
      expect(result.price).toBe(rubles)
      expect(result.productUrl).toBe('https://magnit.ru/product/1000166506?shopCode=780171&shopType=express&catalogType=2')
    },
  )
  it('keeps the ordinary price, not cashback or conditional discounts', () => {
    const [result] = parseMagnitCatalogPage(page([{ ...product, cashback: 599, promotion: { oldPrice: 14999 }, badges: [{ text: '-10% от 2 шт' }] }]), context).products
    expect(result).toMatchObject({ price: 119.99, oldPrice: 149.99, name: product.name })
  })
  it.each([{ storeCode: '992301' }, { storeCode: undefined }, { service: 'dostavka' }, { catalogType: '3' }])(
    'rejects a different or missing store context: %s', (changes) => {
      expect(() => parseMagnitCatalogPage(page([{ ...product, ...changes }]), context)).toThrow('другого магазина')
    },
  )
  it.each([{ price: null }, { price: 0 }, { quantity: 0 }, { quantity: undefined }, { isMissing: true }, { weighted: { isWeighted: true } }])(
    'does not estimate unavailable or weighted packages: %s', (changes) => {
      expect(parseMagnitCatalogPage(page([{ ...product, ...changes }]), context).products[0].price).toBeNull()
    },
  )
  it.each([-11999, '11999', '119.99', NaN, Infinity, 119.99])('rejects an unrecognized price %s', (price) => {
    expect(() => parseMagnitCatalogPage(page([{ ...product, price }]), context)).toThrow('формат цены')
  })
  it('does not accept SEO or dehydrated numeric references as products', () => {
    for (const payload of [{ '@type': 'OfferCatalog', itemListElement: [] }, { rows: [{ id: 265, name: 265, price: 0 }] }]) {
      expect(() => parseMagnitCatalogPage(payload, context)).toThrow('формат каталога')
    }
  })
  it('validates URLs and explicit store settings before fetching', () => {
    expect(context).toEqual({ storeCode: '780171', storeType: 'express', catalogType: '2', categoryId: 64121 })
    expect(parseCatalogContext({ ...source, url: source.url + '&catalogType=3' }).catalogType).toBe('3')
    for (const changed of [
      { url: source.url.replace('magnit.ru', 'localhost') }, { url: source.url.replace('https:', 'http:') },
      { store_code: '992301' }, { url: source.url.replace('&shopType=express', '') },
      { url: source.url + '&catalogType=1' },
    ]) expect(() => parseCatalogContext({ ...source, ...changed })).toThrow()
  })
})

describe('complete catalog retrieval', () => {
  it('paginates beyond 200 products and sends store context on every request', async () => {
    const request = vi.fn<typeof fetch>(async (_url, init) => {
      const body = JSON.parse(String(init?.body))
      expect(body).toMatchObject({ storeCode: '780171', storeType: 'express', catalogType: '2', categories: [64121] })
      const offset = body.pagination.offset
      expect(body.pagination.limit).toBe(36)
      return Response.json(page(Array.from({ length: 36 }, (_, i) => ({ ...product, id: String(1000000000 + offset + i) })), offset, offset < 216))
    })
    expect((await fetchMagnitCatalog(source, request)).products).toHaveLength(252)
    expect(request).toHaveBeenCalledTimes(7)
  })
  it('rejects repeated pages instead of reporting a truncated success', async () => {
    const request = vi.fn<typeof fetch>(async (_url, init) => {
      const { pagination } = JSON.parse(String(init?.body))
      return Response.json(page([product], pagination.offset, true))
    })
    await expect(fetchMagnitCatalog(source, request)).rejects.toThrow('повторяет страницу')
    expect(request).toHaveBeenCalledTimes(2)
  })
  it('does not fall back to default-store HTML on API failure', async () => {
    const request = vi.fn<typeof fetch>(async () => new Response('unavailable', { status: 503 }))
    await expect(fetchMagnitCatalog(source, request)).rejects.toThrow('HTTP 503')
    expect(request).toHaveBeenCalledTimes(1)
  })
  it('rejects an empty catalogue and a partial failed load', async () => {
    await expect(fetchMagnitCatalog(source, async () => Response.json(page([])))).rejects.toThrow('нет товаров')
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(page([product], 0, true)))
      .mockResolvedValueOnce(new Response('failure', { status: 500 }))
    await expect(fetchMagnitCatalog(source, request)).rejects.toThrow('HTTP 500')
  })
})

describe('price freshness', () => {
  const now = Date.parse('2026-09-02T12:00:00Z')
  it('accepts a positive verified price within 24 hours', () => {
    expect(isStorePriceCurrent('119.99', true, '2026-09-02T11:00:00Z', now)).toBe(true)
  })
  it.each([
    [null, true, '2026-09-02T11:00:00Z'], [0, true, '2026-09-02T11:00:00Z'],
    [99.99, false, '2026-09-02T11:00:00Z'], [119.99, true, '2026-09-01T11:59:59Z'],
    [119.99, true, null], [119.99, true, 'bad date'], [119.99, true, '2026-09-03T12:00:00Z'],
  ])('rejects unknown, old or unverified prices', (price, verified, date) => {
    expect(isStorePriceCurrent(price, verified, date, now)).toBe(false)
  })
})
