import type { Coupon } from '../../../types/coupon'
import { pluralizeRu } from '../../../utils/formatters/pluralizeRu.js'

export type CouponStatus = 'active' | 'expiring' | 'used' | 'expired'

export function getCouponDaysLeft(expiresOn: string, now = new Date()) {
  if (!expiresOn) return null
  const [year, month, day] = expiresOn.split('-').map(Number)
  const expiry = new Date(year, month - 1, day)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000)
}

export function getCouponStatus(coupon: Pick<Coupon, 'isUsed' | 'expiresOn'>, now = new Date()): CouponStatus {
  if (coupon.isUsed) return 'used'
  const days = getCouponDaysLeft(coupon.expiresOn, now)
  if (days === null) return 'active'
  if (days < 0) return 'expired'
  return days <= 7 ? 'expiring' : 'active'
}

export function formatCouponExpiry(expiresOn: string, now = new Date()) {
  const days = getCouponDaysLeft(expiresOn, now)
  if (days === null) return 'Без срока'
  if (days === 0) return 'Истекает сегодня'
  if (days === 1) return 'Остался 1 день'
  if (days === -1) return 'Истёк вчера'

  const past = days < 0
  const amount = Math.abs(days)
  if (amount < 14) return past
    ? `Истёк ${amount} ${pluralizeRu(amount, ['день', 'дня', 'дней'])} назад`
    : `Осталось ${amount} ${pluralizeRu(amount, ['день', 'дня', 'дней'])}`

  if (amount < 60) {
    const weeks = Math.ceil(amount / 7)
    return past
      ? `Истёк ${weeks} ${pluralizeRu(weeks, ['неделю', 'недели', 'недель'])} назад`
      : `Осталось ${weeks} ${pluralizeRu(weeks, ['неделя', 'недели', 'недель'])}`
  }

  const months = Math.ceil(amount / 30)
  return past
    ? `Истёк ${months} ${pluralizeRu(months, ['месяц', 'месяца', 'месяцев'])} назад`
    : `Осталось ${months} ${pluralizeRu(months, ['месяц', 'месяца', 'месяцев'])}`
}

export function formatCouponExpiryDate(expiresOn: string) {
  if (!expiresOn) return 'Срок действия не ограничен'
  return `Действует до ${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${expiresOn}T00:00:00`))}`
}
