import type { CouponPayload } from '../../../types/coupon'

export function canAutofillCouponField<K extends keyof CouponPayload>(
  field: K,
  current: CouponPayload,
  initial: CouponPayload,
  isNewCoupon: boolean,
): boolean {
  const value = current[field]
  if (typeof value === 'string' && !value.trim()) return true
  return isNewCoupon && value === initial[field]
}
