import { describe, expect, it } from 'vitest'
import { formatStoreDate, formatStoreUpdateAge, getStoreProductIssues } from './storeProductPresentation'
import type { StoreProduct } from '../types/storeCatalog.types'

const now = Date.parse('2026-09-02T12:00:00Z')
export const productFixture: StoreProduct = { id: 'p1', workspaceId: 'w1', store: 'magnit', productCode: '123', name: 'Молоко', normalizedName: 'молоко', imageUrl: '', productUrl: '', packageAmount: 500, packageUnit: 'ml', currentPrice: 99, oldPrice: null, priceUpdatedAt: '2026-09-02T10:00:00Z', priceVerified: true, priceSourceId: 's1', priceStoreCode: 'shop', priceStoreType: 'express', priceCatalogType: '2', sourceIds: ['s1'] }
describe('catalog issue explanations', () => {
  it('accepts a current verified price and complete packaging', () => {
    expect(getStoreProductIssues(productFixture, now)).toEqual([])
  })
  it('keeps older verified prices and distinguishes missing and unconfirmed prices', () => {
    expect(getStoreProductIssues({ ...productFixture, priceUpdatedAt: '2026-08-30T10:00:00Z' }, now)).toEqual([])
    expect(getStoreProductIssues({ ...productFixture, currentPrice: null }, now)[0].title).toBe('Нет актуальной цены')
    expect(getStoreProductIssues({ ...productFixture, priceVerified: false }, now)[0].title).toBe('Цена не подтверждена')
    expect(getStoreProductIssues({ ...productFixture, currentPrice: 0 }, now)[0].kind).toBe('price')
  })
  it('does not confuse a packaging issue with a missing price', () => {
    expect(getStoreProductIssues({ ...productFixture, packageUnit: null }, now).map(issue => issue.kind)).toEqual(['package'])
    expect(getStoreProductIssues({ ...productFixture, currentPrice: null, packageAmount: null }, now).map(issue => issue.kind)).toEqual(['price', 'package'])
  })
  it('validates weighted step, unit and minimum and tolerates invalid dates', () => {
    expect(getStoreProductIssues({ ...productFixture, isWeighted: true, packageUnit: 'g' }, now)[0].title).toBe('Неполные данные о весе')
    expect(getStoreProductIssues({ ...productFixture, isWeighted: true, packageUnit: 'g', weightStep: 100, weightMinimum: 200 }, now)).toEqual([])
    expect(formatStoreDate('bad-date')).toBe('Нет данных об обновлении')
  })
  it('shows how many full days ago the catalog information was updated', () => {
    expect(formatStoreUpdateAge('2026-09-02T10:00:00Z', now)).toBe('Сегодня')
    expect(formatStoreUpdateAge('2026-09-01T10:00:00Z', now)).toBe('1 день назад')
    expect(formatStoreUpdateAge('2026-08-30T10:00:00Z', now)).toBe('3 дня назад')
    expect(formatStoreUpdateAge('2026-08-23T10:00:00Z', now)).toBe('10 дней назад')
    expect(formatStoreUpdateAge(null, now)).toBe('Нет данных')
  })
})
