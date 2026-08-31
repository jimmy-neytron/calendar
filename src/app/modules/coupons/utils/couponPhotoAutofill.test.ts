import { describe, expect, it } from 'vitest'
import type { CouponPayload } from '../../../types/coupon'
import { canAutofillCouponField } from './couponPhotoAutofill'

const emptyCoupon = (): CouponPayload => ({
  title: '', merchant: '', description: '', discountType: 'percent', discountValue: 10,
  discountLabel: '', codeType: 'qr', codeValue: '', barcodeFormat: 'code128',
  secondaryCodeValue: '', secondaryBarcodeFormat: 'code128', expiresOn: '', terms: '',
  color: '#7c8cf8', isUsed: false,
})

describe('canAutofillCouponField', () => {
  it('fills empty fields and untouched defaults in a new coupon', () => {
    const initial = emptyCoupon()
    const current = emptyCoupon()
    expect(canAutofillCouponField('title', current, initial, true)).toBe(true)
    expect(canAutofillCouponField('discountValue', current, initial, true)).toBe(true)
  })

  it('protects values entered after the form was opened', () => {
    const initial = emptyCoupon()
    const current = { ...emptyCoupon(), title: 'Моё название', discountValue: 25 }
    expect(canAutofillCouponField('title', current, initial, true)).toBe(false)
    expect(canAutofillCouponField('discountValue', current, initial, true)).toBe(false)
  })

  it('protects existing coupon values even when they match defaults', () => {
    const initial = { ...emptyCoupon(), title: 'Старый купон' }
    expect(canAutofillCouponField('title', { ...initial }, initial, false)).toBe(false)
    expect(canAutofillCouponField('discountValue', { ...initial }, initial, false)).toBe(false)
  })
})
