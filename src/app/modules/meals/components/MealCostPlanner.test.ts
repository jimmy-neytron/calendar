// @vitest-environment jsdom
import { createApp, nextTick, ref, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MealCostPlanner from './MealCostPlanner.vue'
import type { MealWeek } from '../types/meals.types'
import type { StoreCatalogSource, StoreProduct } from '../../store-catalog/types/storeCatalog.types'

const actions = vi.hoisted(() => ({ load: vi.fn(), addSource: vi.fn(), removeSource: vi.fn(), removeProducts: vi.fn(), notify: vi.fn(), withSources: false, withProducts: false, error: '' }))
vi.mock('../../store-catalog/composables/useStoreCatalog', () => ({
  useStoreCatalog: () => ({ products: ref(actions.withProducts ? [catalogProduct, { ...catalogProduct, id: 'p2', name: 'Хлеб' }] : []), sources: ref(actions.withSources ? [source] : []), links: ref([]), loading: ref(false), saving: ref(false), syncingSourceId: ref(''), error: ref(actions.error), loadCatalog: actions.load, addSource: actions.addSource, removeSource: actions.removeSource, removeProducts: actions.removeProducts }),
}))
vi.mock('../../../composables/ui/useNotification.js', () => ({ useNotification: () => ({ notify: actions.notify }) }))
vi.mock('../stores/mealPlan.store', () => ({ mealPlanStore: { recipeById: ref(new Map()) } }))
const source: StoreCatalogSource = { id: 's1', workspaceId: 'test-planner', store: 'magnit', storeCode: '780171', name: 'Бакалея', url: 'https://magnit.ru/catalog/64121-bakaleya?shopCode=780171&shopType=express', enabled: false, lastSyncedAt: null, nextSyncAt: '', status: 'idle', lastError: '', productCount: 2 }
const catalogProduct: StoreProduct = { id: 'p1', workspaceId: 'test-planner', store: 'magnit', productCode: '123', name: 'Молоко', normalizedName: 'молоко', imageUrl: '', productUrl: '', packageAmount: 500, packageUnit: 'ml', currentPrice: null, oldPrice: null, priceUpdatedAt: null, priceVerified: false, priceSourceId: '', priceStoreCode: '', priceStoreType: '', priceCatalogType: '', sourceIds: [] }
const week: MealWeek = { id: 'week', workspaceId: 'test-planner', weekStart: '2026-08-31', plan: {}, shoppingItems: [
  { id: 'milk', name: 'Молоко', amount: 500, unit: 'ml', date: '2026-09-02' },
  { id: 'rice', name: 'Рис', amount: 200, unit: 'g', date: '2026-09-03' },
], calorieTarget: null, createdAt: '', updatedAt: '' }
const days = [
  { key: '2026-09-01', weekday: 'вт', dayLabel: '1 сент.', isToday: false },
  { key: '2026-09-02', weekday: 'ср', dayLabel: '2 сент.', isToday: true },
  { key: '2026-09-03', weekday: 'чт', dayLabel: '3 сент.', isToday: false },
]
let app: App | undefined
beforeEach(() => { actions.error = ''; actions.withSources = false; actions.withProducts = false; actions.load.mockClear(); actions.addSource.mockReset(); actions.removeSource.mockReset(); actions.removeProducts.mockReset(); actions.notify.mockClear(); localStorage.clear() })
afterEach(() => { app?.unmount(); document.body.replaceChildren() })
function mount(pricingEnabled: boolean) {
  const host = document.createElement('div'); document.body.append(host)
  const onAdd = vi.fn()
  app = createApp(MealCostPlanner, { week, days, weekStart: week.weekStart, weekLabel: '31 авг. — 6 сент.', pricingEnabled, canAdd: true, shoppingMinDate: '2026-09-02', onAdd })
  app.mount(host)
  return { host, onAdd }
}

describe('meal shopping periods', () => {
  it('shows a weekly checklist without fetching admin-only catalog data', () => {
    const { host } = mount(false)
    expect(actions.load).not.toHaveBeenCalled()
    expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(2)
    expect(host.querySelector('.cost-sections')).toBeNull()
  })
  it('filters daily ingredients and keeps period checkmarks separate', async () => {
    const { host, onAdd } = mount(false)
    host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(); await nextTick()
    host.querySelectorAll<HTMLButtonElement>('.period-picker button')[2].click(); await nextTick()
    expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(1)
    expect(host.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(false)
    host.querySelector<HTMLButtonElement>('.section-head__actions .ui-button--primary')!.click()
    expect(onAdd).toHaveBeenCalledWith('2026-09-02')
    host.querySelector<HTMLButtonElement>('.period-picker button')!.click(); await nextTick()
    expect(host.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true)
  })
  it('does not add purchases to past days', async () => {
    const { host } = mount(false)
    host.querySelectorAll<HTMLButtonElement>('.period-picker button')[1].click(); await nextTick()
    expect(host.querySelector<HTMLButtonElement>('.section-head__actions .ui-button--primary')?.disabled).toBe(true)
  })
  it('keeps the checklist usable when catalog loading fails', () => {
    actions.error = 'Сеть недоступна'
    const { host } = mount(true)
    expect(actions.load).toHaveBeenCalledOnce()
    expect(host.textContent).toContain('Сеть недоступна')
    expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(2)
  })
})

describe('source removal confirmation wiring', () => {
  async function openRemoval() {
    actions.withSources = true
    const { host } = mount(true)
    host.querySelectorAll<HTMLButtonElement>('.cost-sections button')[2].click()
    await nextTick()
    host.querySelector('summary')!.click()
    ;[...host.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Удалить источник')!.click()
    await nextTick()
  }
  it.each([true, false])('passes deleteProducts=%s from the confirmation to the catalog', async deleteProducts => {
    await openRemoval()
    expect(actions.removeSource).not.toHaveBeenCalled()
    if (!deleteProducts) {
      document.querySelector<HTMLInputElement>('[role="dialog"] input[type="checkbox"]')!.click()
      await nextTick()
    }
    document.querySelector<HTMLButtonElement>('.source-delete__confirm')!.click()
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull())
    expect(actions.removeSource).toHaveBeenCalledExactlyOnceWith('s1', deleteProducts)
    expect(actions.notify).toHaveBeenCalledWith(expect.stringContaining(deleteProducts ? 'Источник и его товары удалены' : 'Товары и привязки сохранены'), 'success')
  })
  it('keeps the confirmation and selection when deletion fails', async () => {
    actions.removeSource.mockRejectedValue(new Error('Сеть недоступна'))
    await openRemoval()
    document.querySelector<HTMLInputElement>('[role="dialog"] input[type="checkbox"]')!.click()
    await nextTick()
    document.querySelector<HTMLButtonElement>('.source-delete__confirm')!.click()
    await vi.waitFor(() => expect(actions.notify).toHaveBeenCalledWith('Сеть недоступна', 'danger'))
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.querySelector<HTMLInputElement>('[role="dialog"] input[type="checkbox"]')!.checked).toBe(false)
  })
})

describe('source creation in the new screen', () => {
  it('retains failed drafts and closes only after successful creation', async () => {
    const { host } = mount(true)
    host.querySelectorAll<HTMLButtonElement>('.cost-sections button')[2].click(); await nextTick()
    expect(document.querySelector('.source-editor')).toBeNull()
    ;[...host.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Добавить первый источник')!.click(); await nextTick()
    const url = document.querySelector<HTMLInputElement>('[aria-label="Ссылка Магнита"]')!
    const name = document.querySelector<HTMLInputElement>('[aria-label="Название раздела"]')!
    url.value = source.url; url.dispatchEvent(new Event('input'))
    name.value = 'Бакалея'; name.dispatchEvent(new Event('input'))
    actions.addSource.mockRejectedValueOnce({ message: 'Источник с такой ссылкой уже добавлен' })
    document.querySelector('form.source-editor')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await vi.waitFor(() => expect(document.querySelector('.source-editor__error')?.textContent).toContain('уже добавлен'))
    expect(url.value).toBe(source.url); expect(name.value).toBe('Бакалея')
    expect(actions.notify).not.toHaveBeenCalledWith(expect.anything(), 'success')
    actions.addSource.mockResolvedValueOnce(undefined)
    document.querySelector('form.source-editor')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await vi.waitFor(() => expect(document.querySelector('.source-editor')).toBeNull())
    expect(actions.addSource).toHaveBeenLastCalledWith({ name: 'Бакалея', url: source.url, storeCode: '780171' })
    expect(actions.notify).toHaveBeenCalledWith(expect.stringContaining('Обновить сейчас'), 'success')
  })
})

describe('direct product removal confirmation', () => {
  async function openCatalog() {
    actions.withProducts = true
    const { host } = mount(true)
    host.querySelectorAll<HTMLButtonElement>('.cost-sections button')[1].click()
    await nextTick()
    return host
  }
  it('waits for confirmation and passes the exact selected IDs', async () => {
    const host = await openCatalog()
    host.querySelector<HTMLInputElement>('[aria-label="Выбрать товары на текущей странице"]')!.click()
    await nextTick()
    ;[...host.querySelectorAll<HTMLButtonElement>('.catalog-selection button')].find(button => button.textContent?.includes('Удалить'))!.click()
    await nextTick()
    expect(actions.removeProducts).not.toHaveBeenCalled()
    expect(document.querySelectorAll('.products-delete li')).toHaveLength(2)
    expect(document.querySelector('.products-delete')?.textContent).toContain('товар может появиться снова')
    document.querySelector<HTMLButtonElement>('.products-delete__confirm')!.click()
    await vi.waitFor(() => expect(document.querySelector('.products-delete')).toBeNull())
    expect(actions.removeProducts).toHaveBeenCalledExactlyOnceWith(['p1', 'p2'])
  })
  it('cancels a single deletion without modifying the catalog', async () => {
    const host = await openCatalog()
    host.querySelector<HTMLButtonElement>('.product-remove')!.click(); await nextTick()
    ;[...document.querySelectorAll<HTMLButtonElement>('.products-delete button')].find(button => button.textContent?.trim() === 'Отмена')!.click()
    await nextTick()
    expect(actions.removeProducts).not.toHaveBeenCalled()
    expect(host.querySelectorAll('.product-row')).toHaveLength(2)
  })
  it('keeps the exact confirmation list after an API failure', async () => {
    actions.removeProducts.mockRejectedValue(new Error('Сеть недоступна'))
    const host = await openCatalog()
    host.querySelector<HTMLButtonElement>('.product-remove')!.click(); await nextTick()
    document.querySelector<HTMLButtonElement>('.products-delete__confirm')!.click()
    await vi.waitFor(() => expect(actions.notify).toHaveBeenCalledWith('Сеть недоступна', 'danger'))
    expect(document.querySelectorAll('.products-delete li')).toHaveLength(1)
    expect(host.querySelectorAll('.product-row')).toHaveLength(2)
  })
})
