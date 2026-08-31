import { describe, expect, it } from 'vitest'
import { mapDetectedCouponCode, normalizeDetectedCodes } from './couponCodeImage.service'

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

  it('removes a spurious non-digit prefix from a long numeric barcode', () => {
    expect(mapDetectedCouponCode({ rawValue: 'N780171102436001012', format: 'code_128' }).value)
      .toBe('780171102436001012')
  })
})

describe('normalizeDetectedCodes', () => {
  it('orders two barcodes from top to bottom and removes duplicates', () => {
    expect(normalizeDetectedCodes([
      { rawValue: 'BOTTOM', format: 'code_128', boundingBox: { y: 420 } },
      { rawValue: 'TOP', format: 'code_128', boundingBox: { y: 110 } },
      { rawValue: 'TOP', format: 'code_128', boundingBox: { y: 112 } },
    ]).map((code) => code.value)).toEqual(['TOP', 'BOTTOM'])
  })

  it('treats a one-character recognition error as the same barcode', () => {
    expect(normalizeDetectedCodes([
      { rawValue: 'N780171102436001012', format: 'code_128', imageY: 110 },
      { rawValue: '780171102436001012', format: 'code_128', imageY: 112 },
      { rawValue: '000790191224169591', format: 'code_128', imageY: 420 },
    ]).map((code) => code.value)).toEqual(['780171102436001012', '000790191224169591'])
  })
})
