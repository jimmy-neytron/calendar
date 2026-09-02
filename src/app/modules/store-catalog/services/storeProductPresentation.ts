import { isStorePriceCurrent } from '../../../../../supabase/functions/_shared/storePrice'
import type { StorePackageUnit, StoreProduct } from '../types/storeCatalog.types'

export interface StoreProductIssue { kind: 'price' | 'package'; title: string; description: string }

export function getStoreProductIssues(product: StoreProduct, now = Date.now()): StoreProductIssue[] {
  const issues: StoreProductIssue[] = []
  const receivedAt = Date.parse(product.priceUpdatedAt || '')
  if (!isStorePriceCurrent(product.currentPrice, product.priceVerified, product.priceUpdatedAt, now)) {
    const expired = Number.isFinite(receivedAt) && now - receivedAt > 24 * 3600000
    issues.push({ kind: 'price', title: expired ? 'Цена устарела' : product.currentPrice == null ? 'Нет актуальной цены' : 'Цена не подтверждена',
      description: expired ? 'Снимок цены старше суток. Обнови источник, чтобы получить актуальную цену.' : 'Источник не подтвердил актуальную цену для этого магазина. Обнови источник; доступность товара уточни в магазине.' })
  }
  if (!product.packageUnit || !Number.isFinite(product.packageAmount) || (product.packageAmount || 0) <= 0) {
    issues.push({ kind: 'package', title: 'Не указана фасовка', description: 'Нужны количество и единица в одной упаковке, чтобы рассчитать закупку.' })
  } else if (product.isWeighted && (product.packageUnit !== 'g' || !Number.isFinite(product.weightStep) || (product.weightStep || 0) <= 0 || !Number.isFinite(product.weightMinimum) || (product.weightMinimum || 0) <= 0)) {
    issues.push({ kind: 'package', title: 'Неполные данные о весе', description: 'Обнови источник: для весового товара нужны шаг заказа и минимальный вес в граммах.' })
  }
  return issues
}

export const formatStoreMoney = (value: number | null) => value == null || !Number.isFinite(value) ? 'Нет цены' : `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} ₽`
export const formatStoreAmount = (value: number, unit: StorePackageUnit | null) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} ${unit === 'piece' ? 'шт.' : unit === 'ml' ? 'мл' : 'г'}`
export function formatStoreDate(value: string | null) {
  const date = value ? new Date(value) : null
  return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date) : 'Нет данных об обновлении'
}
export const hasStoreDiscount = (product: StoreProduct) => product.oldPrice != null && product.currentPrice != null && product.oldPrice > product.currentPrice
