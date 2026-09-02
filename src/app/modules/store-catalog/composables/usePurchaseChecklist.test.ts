// @vitest-environment jsdom
import { effectScope, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePurchaseChecklist } from './usePurchaseChecklist'
import type { DailyPurchase } from '../types/storeCatalog.types'

const milk: DailyPurchase = { name: 'Молоко', normalizedName: 'молоко', amount: 500, unit: 'ml', link: null, product: null, packageAmount: null, packages: null, lineTotal: null, confirmed: false }
const rice: DailyPurchase = { ...milk, name: 'Рис', normalizedName: 'рис', amount: 200, unit: 'g', confirmed: true, lineTotal: 80 }
const scopes: ReturnType<typeof effectScope>[] = []
function setup(key = 'w1:2026-08-31:week') {
  const scope = effectScope(); scopes.push(scope)
  const items = ref([milk, rice])
  const keyRef = ref(key)
  const checklist = scope.run(() => usePurchaseChecklist(items, keyRef))!
  return { ...checklist, items, keyRef }
}
beforeEach(() => localStorage.clear())
afterEach(() => { scopes.splice(0).forEach(scope => scope.stop()); vi.restoreAllMocks() })

describe('purchase checklist', () => {
  it('persists checkmarks and keeps different weeks, days and workspaces separate', () => {
    const list = setup(); list.toggle(milk)
    expect(setup().isBought(milk)).toBe(true)
    for (const key of ['w2:2026-08-31:week', 'w1:2026-09-07:week', 'w1:2026-08-31:2026-09-02']) {
      list.keyRef.value = key
      expect(list.boughtCount.value).toBe(0)
    }
    list.keyRef.value = 'w1:2026-08-31:week'
    expect(list.boughtCount.value).toBe(1)
  })
  it('requires changed quantities to be checked again but preserves price-only changes', () => {
    const list = setup(); list.toggle(milk)
    expect(list.isBought({ ...milk, lineTotal: 90 })).toBe(true)
    expect(list.isBought({ ...milk, amount: 1000 })).toBe(false)
    expect(list.isBought({ ...milk, unit: 'g' })).toBe(false)
  })
  it('combines search and status filters and exports only remaining items', () => {
    const list = setup(); list.toggle(rice)
    list.filter.value = 'remaining'; list.query.value = '  МОЛОКО '
    expect(list.visiblePurchases.value).toEqual([milk])
    expect(list.copyText('Закупка')).toBe('Закупка\n☐ Молоко — 500 мл')
    list.filter.value = 'bought'
    expect(list.visiblePurchases.value).toEqual([])
    list.query.value = ''
    expect(list.visiblePurchases.value).toEqual([rice])
    list.filter.value = 'unresolved'
    expect(list.visiblePurchases.value).toEqual([milk])
    list.clearFilters(); list.reset()
    expect(list.visiblePurchases.value).toHaveLength(2)
    expect(list.boughtCount.value).toBe(0)
  })
  it('does not reuse filters after switching periods', () => {
    const list = setup(); list.query.value = 'рис'; list.filter.value = 'bought'
    list.keyRef.value = 'another-period'
    expect(list.query.value).toBe('')
    expect(list.filter.value).toBe('all')
  })
  it('handles malformed saved data and blocked storage without breaking the list', () => {
    localStorage.setItem('meal-purchase-checklist:v1:broken', '{')
    const list = setup('broken')
    expect(list.boughtCount.value).toBe(0)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
    list.toggle(milk)
    expect(list.storageUnavailable.value).toBe(true)
    expect(list.boughtCount.value).toBe(1)
  })
})
