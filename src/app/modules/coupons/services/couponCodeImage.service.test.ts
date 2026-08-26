import { describe, expect, it } from 'vitest'
import { mapDetectedCouponCode } from './couponCodeImage.service'

describe('mapDetectedCouponCode', () => {
  it('maps a QR code to the QR coupon type', () => {
    expect(mapDetectedCouponCode({ rawValue: 'https://example.com', format: 'qr_code' })).toEqual({
      value: 'https://example.com',
      codeType: 'qr',
      barcodeFormat: 'code128',
    })
  })

  it('keeps the detected EAN-13 format', () => {
    expect(mapDetectedCouponCode({ rawValue: '4601234567893', format: 'ean_13' })).toEqual({
      value: '4601234567893',
      codeType: 'barcode',
      barcodeFormat: 'ean13',
    })
  })

  it('uses Code 128 for other supported linear formats', () => {
    expect(mapDetectedCouponCode({ rawValue: 'ABC-123', format: 'code_39' })).toEqual({
      value: 'ABC-123',
      codeType: 'barcode',
      barcodeFormat: 'code128',
    })
  })
})
