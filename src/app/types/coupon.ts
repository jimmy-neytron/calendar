export type CouponCodeType = 'qr' | 'barcode' | 'promo' | 'none'
export type CouponDiscountType = 'percent' | 'amount' | 'text'
export type CouponBarcodeFormat = 'code128' | 'ean13' | 'ean8' | 'upca'

export interface Coupon {
  id: string
  workspaceId: string
  title: string
  merchant: string
  description: string
  discountType: CouponDiscountType
  discountValue: number
  discountLabel: string
  codeType: CouponCodeType
  codeValue: string
  barcodeFormat: CouponBarcodeFormat
  secondaryCodeValue: string
  secondaryBarcodeFormat: CouponBarcodeFormat
  expiresOn: string
  terms: string
  color: string
  isUsed: boolean
  createdAt: string
  updatedAt: string
}

export type CouponPayload = Omit<Coupon, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>
