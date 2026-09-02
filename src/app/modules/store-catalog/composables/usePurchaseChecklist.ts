import { computed, ref, watch, type Ref } from 'vue'
import { normalizeIngredientName } from '../services/storeCatalog.service'
import type { DailyPurchase } from '../types/storeCatalog.types'

export type PurchaseFilter = 'all' | 'remaining' | 'bought' | 'unresolved'
export const purchaseKey = (item: DailyPurchase) => `${item.normalizedName}:${item.unit}`
export const formatPurchaseAmount = (item: Pick<DailyPurchase, 'amount' | 'unit'>) =>
  `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(item.amount)} ${item.unit === 'piece' ? 'шт.' : item.unit === 'ml' ? 'мл' : 'г'}`

/** Device-local checkmarks, scoped to a workspace, week and selected period. */
export function usePurchaseChecklist(purchases: Ref<DailyPurchase[]>, scope: Ref<string>) {
  const checked = ref<Record<string, number>>({})
  const query = ref('')
  const filter = ref<PurchaseFilter>('all')
  const storageUnavailable = ref(false)
  const storageKey = computed(() => scope.value ? `meal-purchase-checklist:v1:${scope.value}` : '')
  watch(storageKey, (key) => {
    checked.value = {}
    query.value = ''
    filter.value = 'all'
    storageUnavailable.value = false
    if (!key) return
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) || '{}')
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        checked.value = Object.fromEntries(Object.entries(saved).filter(([, value]) => typeof value === 'number' && Number.isFinite(value)))
      }
    } catch { storageUnavailable.value = true }
  }, { immediate: true, flush: 'sync' })
  // A changed quantity needs checking again; price updates do not reset a purchase.
  const isBought = (item: DailyPurchase) => checked.value[purchaseKey(item)] === item.amount
  const boughtCount = computed(() => purchases.value.filter(isBought).length)
  const remaining = computed(() => purchases.value.filter(item => !isBought(item)))
  const visiblePurchases = computed(() => purchases.value.filter(item => {
    const matchesStatus = filter.value === 'all'
      || (filter.value === 'remaining' && !isBought(item))
      || (filter.value === 'bought' && isBought(item))
      || (filter.value === 'unresolved' && !item.confirmed)
    return matchesStatus && normalizeIngredientName(`${item.name} ${item.product?.name || ''}`).includes(normalizeIngredientName(query.value))
  }))
  function persist() {
    if (!storageKey.value) return
    try { localStorage.setItem(storageKey.value, JSON.stringify(checked.value)); storageUnavailable.value = false }
    catch { storageUnavailable.value = true }
  }
  function toggle(item: DailyPurchase) {
    const next = { ...checked.value }
    if (isBought(item)) delete next[purchaseKey(item)]
    else next[purchaseKey(item)] = item.amount
    checked.value = next
    persist()
  }
  function reset() { checked.value = {}; persist() }
  function clearFilters() { query.value = ''; filter.value = 'all' }
  const copyText = (title: string) => [title, ...remaining.value.map(item => `☐ ${item.name} — ${formatPurchaseAmount(item)}`)].join('\n')
  return { query, filter, storageUnavailable, isBought, boughtCount, remaining, visiblePurchases, toggle, reset, clearFilters, copyText }
}
