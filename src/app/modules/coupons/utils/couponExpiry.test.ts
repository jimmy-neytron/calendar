import { describe, expect, it } from 'vitest'
import { formatCouponExpiry, getCouponDaysLeft, getCouponStatus } from './couponExpiry'

const now = new Date(2026, 7, 31, 12)

describe('coupon expiry', () => {
  it('formats days, weeks and months left', () => {
    expect(formatCouponExpiry('2026-08-31', now)).toBe('Истекает сегодня')
    expect(formatCouponExpiry('2026-09-01', now)).toBe('Остался 1 день')
    expect(formatCouponExpiry('2026-09-05', now)).toBe('Осталось 5 дней')
    expect(formatCouponExpiry('2026-09-20', now)).toBe('Осталось 3 недели')
    expect(formatCouponExpiry('2026-11-15', now)).toBe('Осталось 3 месяца')
  })

  it('formats an expired coupon and a coupon without a deadline', () => {
    expect(formatCouponExpiry('2026-08-30', now)).toBe('Истёк вчера')
    expect(formatCouponExpiry('2026-08-10', now)).toBe('Истёк 3 недели назад')
    expect(formatCouponExpiry('', now)).toBe('Без срока')
  })

  it('provides status from the same calendar-day calculation', () => {
    expect(getCouponDaysLeft('2026-09-07', now)).toBe(7)
    expect(getCouponStatus({ isUsed: false, expiresOn: '2026-09-07' }, now)).toBe('expiring')
    expect(getCouponStatus({ isUsed: true, expiresOn: '2026-08-01' }, now)).toBe('used')
  })
})
