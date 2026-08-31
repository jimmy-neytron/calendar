import { describe, expect, it } from 'vitest'
import { filterCouponPhotoFieldsByConfidence } from './couponPhotoReliability'

describe('filterCouponPhotoFieldsByConfidence', () => {
  it('keeps reliable fields but drops terms for low-confidence OCR', () => {
    const result = filterCouponPhotoFieldsByConfidence({
      merchant: 'Магнит',
      title: 'Замороженные пельмени, кроме товаров на развес',
      terms: 'ТИИИИННННННННИНМ КИ МОГ ий',
      expiresOn: '2026-09-02',
    }, 49)

    expect(result.fields).toEqual({
      merchant: 'Магнит',
      title: 'Замороженные пельмени, кроме товаров на развес',
      expiresOn: '2026-09-02',
    })
    expect(result.warning).toContain('условия не заполнены')
  })

  it('keeps terms when OCR confidence is sufficient', () => {
    const fields = { title: 'Скидка на кофе', terms: 'Действует до конца месяца' }
    expect(filterCouponPhotoFieldsByConfidence(fields, 72)).toEqual({ fields })
  })
})
