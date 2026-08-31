import { describe, expect, it } from 'vitest'
import { parseCouponPhotoText } from './couponPhotoParser'

describe('parseCouponPhotoText', () => {
  it('extracts coupon fields from a Magnit receipt', () => {
    const result = parseCouponPhotoText(`
      МАГНИТ
      Магазин Магнит Ротонда
      780171102436001012
      ЗАМОРОЖЕННЫЕ ПЕЛЬМЕНИ, КРОМЕ ТОВАРОВ НА РАЗВЕС
      31.08 - 02.09.2026 В ДАННОМ МАГАЗИНЕ МАГНИТ
      НА ВСЕ ЦЕННИКИ, КРОМЕ АКЦИИ 1+1 / 2+1
      ПОЗИЦИИ ТОВАРОВ ОДНОЙ МАРКИ. ТОЛЬКО НА 1 ТОВАР В ЧЕКЕ.
      000790191224169591
    `)

    expect(result).toMatchObject({
      merchant: 'Магнит',
      title: 'Замороженные пельмени, кроме товаров на развес',
      description: 'Замороженные пельмени, кроме товаров на развес',
      expiresOn: '2026-09-02',
      discountType: 'text',
      discountValue: 0,
      discountLabel: '1+1 / 2+1',
    })
    expect(result.terms).toContain('ТОЛЬКО НА 1 ТОВАР В ЧЕКЕ')
    expect(result.terms).not.toContain('000790191224169591')
  })

  it('joins a product title split across receipt lines', () => {
    expect(parseCouponPhotoText(`
      МАГНИТ
      ИАН НИНЫ НН НН
      ЗАМОРОЖЕННЫЕ ПЕЛЬМЕНИ, КРОМЕ ТОВАРОВ НА
      РАЗВЕС
      31.08 - 02.09.2026 В ДАННОМ МАГАЗИНЕ
    `)).toMatchObject({
      title: 'Замороженные пельмени, кроме товаров на развес',
      description: 'Замороженные пельмени, кроме товаров на развес',
      expiresOn: '2026-09-02',
    })
  })

  it('extracts percent discounts', () => {
    expect(parseCouponPhotoText('Пятёрочка\nСКИДКА 25% НА КОФЕ\nДО 12.09.2026')).toMatchObject({
      merchant: 'Пятёрочка',
      discountType: 'percent',
      discountValue: 25,
      expiresOn: '2026-09-12',
    })
  })

  it('extracts a named date range and merchant from an Ulybka Radugi receipt', () => {
    expect(parseCouponPhotoText(`
      КУПОН
      25%
      на 1 саный дорогой товар
      в чеке
      в магазинах Улыбка радуги
      Купон действует с 1 по 30 сентября 2026 года
      Купон применяется только 1 раз
    `)).toMatchObject({
      merchant: 'Улыбка радуги',
      title: 'На 1 самый дорогой товар в чеке',
      expiresOn: '2026-09-30',
      discountType: 'percent',
      discountValue: 25,
    })
  })

  it('returns an empty result for unreadable text', () => {
    expect(parseCouponPhotoText('')).toEqual({})
  })

  it('does not create terms without a reliable date or terms anchor', () => {
    const result = parseCouponPhotoText(`
      ЧЕК. ТИИИИННННННННИНМ КИ
      МАГНИТ
      ЗАНОРОЗЕННЫЕ ПСНЬМЕ НИ. КРОМЕ БАНЕ
      08 - по.9. 268 Анн В Ки Ни все ЦЕННИКИ
      ПОЗИЦИЙ ТОРГОВОЙ манки только на 1 товар В ЧЕКВ
    `)

    expect(result.terms).toBeUndefined()
  })

  it('drops QR art, numeric noise and a repeated OCR block from text fields', () => {
    const result = parseCouponPhotoText(`
      @
      66° @@
      0006
      [=] [=]
      на 1 саный дорогой товар
      в чеке
      в магазинах Улыбка радуги
      Купон действует с 1 по 30 сентября 2026 года
      * Купон применяется только 1 раз
      99° e606
      КУПОН
      на 1 самый дорогой товар
      в чеке
      Купон действует с 1 по 30 сентября 2026 года
    `)

    expect(result.title).toBe('На 1 самый дорогой товар в чеке')
    expect(result.terms).not.toMatch(/(?:0006|e606|\[=\]|@)/)
    expect(result.terms?.match(/Купон действует/gi)).toHaveLength(1)
  })
})
