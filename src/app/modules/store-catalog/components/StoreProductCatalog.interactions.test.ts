// @vitest-environment jsdom
import { createApp, nextTick, ref, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StoreProductCatalog from './StoreProductCatalog.vue'
import type { StoreProduct } from '../types/storeCatalog.types'

const product: StoreProduct = { id: 'p1', workspaceId: 'w1', store: 'magnit', productCode: '123', name: 'Молоко', normalizedName: 'молоко', imageUrl: '', productUrl: '', packageAmount: 500, packageUnit: 'ml', currentPrice: 99, oldPrice: null, priceUpdatedAt: new Date().toISOString(), priceVerified: true, priceSourceId: 's1', priceStoreCode: 'shop', priceStoreType: 'express', priceCatalogType: '2', sourceIds: ['s1'] }
let app: App | undefined
afterEach(() => { app?.unmount(); app = undefined; document.body.replaceChildren() })
async function settle() { await nextTick(); await nextTick() }
function mount(initial: StoreProduct[] = [product]) {
  const products = ref(initial), saving = ref(false)
  const onPackage = vi.fn(), onLink = vi.fn(), onSources = vi.fn(), onRemove = vi.fn()
  const host = document.createElement('div'); document.body.append(host)
  app = createApp({ components: { StoreProductCatalog }, setup: () => ({ products, saving, onPackage, onLink, onSources, onRemove, requirements: [{ name: 'Молоко', normalizedName: 'молоко', amount: 800, unit: 'ml' }] }), template: '<StoreProductCatalog :products="products" :sources="[]" :requirements="requirements" :saving="saving" @set-package="onPackage" @link="onLink" @sources="onSources" @remove="onRemove" />' })
  app.mount(host)
  return { host, products, saving, onPackage, onLink, onSources, onRemove }
}

describe('catalog list and side panel', () => {
  it('selects only the current page and replaces a previous cross-page selection', async () => {
    const { host, onRemove } = mount(Array.from({ length: 25 }, (_, i) => ({ ...product, id: String(i) })))
    const pageCheckbox = () => host.querySelector<HTMLInputElement>('[aria-label="Выбрать товары на текущей странице"]')!
    const action = (text: string) => [...host.querySelectorAll<HTMLButtonElement>('.catalog-selection button')].find(button => button.textContent?.includes(text))!
    pageCheckbox().click(); await settle()
    expect(host.querySelectorAll('.product-checkbox:checked')).toHaveLength(24)
    expect(host.querySelector('.catalog-selection')?.textContent).toContain('24 выбрано')
    action('Удалить').click()
    expect(onRemove.mock.calls[0][0].map((item: StoreProduct) => item.id)).toEqual(Array.from({ length: 24 }, (_, i) => String(i)))
    action('Выбрать все 25').click(); await settle()
    host.querySelector<HTMLButtonElement>('[title="Следующая страница"]')!.click(); await settle()
    pageCheckbox().click(); await settle()
    pageCheckbox().click(); await settle()
    expect(host.querySelector('.catalog-selection')?.textContent).toContain('1 выбрано')
    action('Удалить').click()
    expect(onRemove.mock.calls[1][0].map((item: StoreProduct) => item.id)).toEqual(['24'])
    action('Отменить').click(); await settle()
    expect(host.querySelectorAll('.product-checkbox:checked')).toHaveLength(0)
    expect(host.querySelector('.catalog-selection')).toBeNull()
  })
  it('disables page selection while saving', async () => {
    const { host, saving } = mount()
    saving.value = true; await settle()
    const checkbox = host.querySelector<HTMLInputElement>('[aria-label="Выбрать товары на текущей странице"]')!
    expect(checkbox.disabled).toBe(true)
    checkbox.click()
    expect(host.querySelectorAll('.product-checkbox:checked')).toHaveLength(0)
  })
  it('requests single-product deletion without opening the drawer', async () => {
    const { host, onRemove } = mount()
    host.querySelector<HTMLButtonElement>('.product-remove')!.click(); await settle()
    expect(onRemove).toHaveBeenCalledExactlyOnceWith([product])
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
  it('selects all filtered products across pages, then removes hidden selections when searching', async () => {
    const { host, onRemove } = mount(Array.from({ length: 25 }, (_, i) => ({ ...product, id: String(i), name: `Товар ${i}` })))
    const buttons = () => [...host.querySelectorAll<HTMLButtonElement>('.catalog-selection button')]
    host.querySelector<HTMLInputElement>('[aria-label="Выбрать товары на текущей странице"]')!.click(); await settle()
    buttons().find(button => button.textContent?.includes('Выбрать все 25'))!.click(); await settle()
    expect(host.querySelector('.catalog-selection')?.textContent).toContain('25 выбрано')
    buttons().find(button => button.textContent?.includes('Удалить'))!.click()
    expect(onRemove.mock.calls[0][0]).toHaveLength(25)
    const search = host.querySelector<HTMLInputElement>('input[type="search"]')!
    search.value = 'Товар 24'; search.dispatchEvent(new Event('input')); await settle()
    expect(host.querySelector('.catalog-selection')?.textContent).toContain('1 выбрано')
    buttons().find(button => button.textContent?.includes('Удалить'))!.click()
    expect(onRemove.mock.calls[1][0].map((item: StoreProduct) => item.id)).toEqual(['24'])
  })
  it('filters orphaned products separately from linked products', async () => {
    const { host } = mount([product, { ...product, id: 'orphan', name: 'Остаток', sourceIds: [], priceSourceId: '' }])
    host.querySelector<HTMLButtonElement>('[aria-label="Раздел каталога"]')!.click(); await settle()
    ;[...document.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(item => item.textContent?.trim() === 'Без источника')!.click(); await settle()
    expect(host.querySelectorAll('.product-row')).toHaveLength(1)
    expect(host.querySelector('.product-row')?.textContent).toContain('Остаток')
  })
  it('does not open details when selecting and disables deletion while saving', async () => {
    const { host, saving, onRemove } = mount()
    host.querySelector<HTMLInputElement>('.product-checkbox')!.click(); await settle()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(host.querySelector('.catalog-selection')?.textContent).toContain('1 выбрано')
    saving.value = true; await settle()
    host.querySelector<HTMLButtonElement>('.product-remove')!.click()
    expect(onRemove).not.toHaveBeenCalled()
    expect(host.querySelector<HTMLInputElement>('.product-checkbox')!.disabled).toBe(true)
  })
  it('requests deletion from the drawer and closes it', async () => {
    const { host, onRemove } = mount()
    host.querySelector<HTMLButtonElement>('.product-row')!.click(); await settle()
    ;[...document.querySelectorAll<HTMLButtonElement>('.product-details__footer button')].find(button => button.textContent?.includes('Удалить товар'))!.click(); await settle()
    expect(onRemove).toHaveBeenCalledExactlyOnceWith([product])
    expect(document.body.style.overflow).toBe('')
  })
  it('opens product details outside the list and closes with Escape, restoring focus', async () => {
    const { host } = mount()
    const row = host.querySelector<HTMLButtonElement>('.product-row')!
    row.focus(); row.click(); await settle()
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.getAttribute('aria-label')).toBe('Карточка товара')
    expect(document.body.style.overflow).toBe('hidden')
    expect(host.contains(dialog)).toBe(false)
    expect(dialog.textContent).toContain('Молоко')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await settle()
    expect(document.activeElement).toBe(row)
    expect(document.body.style.overflow).toBe('')
  })
  it('saves packaging in the drawer and retains it until server data updates', async () => {
    const { host, products, onPackage, saving } = mount()
    host.querySelector<HTMLButtonElement>('.product-row')!.click(); await settle()
    const input = document.querySelector<HTMLInputElement>('[aria-label="Количество в упаковке"]')!
    input.value = '900'; input.dispatchEvent(new Event('input', { bubbles: true }))
    const form = document.querySelector<HTMLFormElement>('.product-details__package')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settle()
    expect(onPackage).toHaveBeenCalledWith('p1', 900, 'ml')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    products.value = [{ ...product, packageAmount: 900 }]; await settle()
    expect(host.querySelector('.product-row__package')?.textContent).toContain('900 мл')
    saving.value = true; await settle()
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    expect(onPackage).toHaveBeenCalledTimes(1)
  })
  it('links an ingredient without opening another modal', async () => {
    const { host, onLink } = mount()
    host.querySelector<HTMLButtonElement>('.product-row')!.click(); await settle()
    document.querySelector<HTMLButtonElement>('[aria-label="Ингредиент для товара"]')!.click(); await settle()
    ;[...document.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(item => item.textContent?.includes('800 мл'))!.click(); await settle()
    document.querySelector('form.product-details__link')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settle()
    expect(onLink).toHaveBeenCalledExactlyOnceWith('Молоко', 'ml', 'p1')
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
  })
  it('shows only price issues in the notification, opens a named item and navigates to sources', async () => {
    const { host, onSources } = mount([{ ...product, id: 'missing', name: 'Хлеб', currentPrice: null }, { ...product, id: 'pack', name: 'Сыр', packageAmount: null }])
    const notice = host.querySelector('.price-notice')!
    expect(notice.textContent).toContain('Хлеб')
    expect(notice.textContent).not.toContain('Сыр')
    notice.querySelector<HTMLButtonElement>('.price-notice__products button')!.click(); await settle()
    expect(document.querySelector('.product-details__hero')?.textContent).toContain('Хлеб')
    ;[...document.querySelectorAll<HTMLButtonElement>('.product-details button')].find(button => button.textContent?.includes('Перейти к источникам'))!.click(); await settle()
    expect(onSources).toHaveBeenCalledOnce()
  })
  it('reveals the complete missing-price list and resets conflicting filters', async () => {
    const { host } = mount(Array.from({ length: 5 }, (_, index) => ({ ...product, id: String(index), name: `Продукт ${index}`, currentPrice: null })))
    expect(host.querySelectorAll('.price-notice__products button')).toHaveLength(3)
    ;[...host.querySelectorAll<HTMLButtonElement>('.price-notice footer button')].find(button => button.textContent?.includes('Показать все'))!.click(); await settle()
    expect(host.querySelectorAll('.price-notice__products button')).toHaveLength(5)
    const input = host.querySelector<HTMLInputElement>('input[type="search"]')!
    input.value = 'ничего'; input.dispatchEvent(new Event('input', { bubbles: true })); await settle()
    expect(host.querySelectorAll('.product-row')).toHaveLength(0)
    ;[...host.querySelectorAll<HTMLButtonElement>('.price-notice footer button')].find(button => button.textContent?.includes('Показать в каталоге'))!.click(); await settle()
    expect(host.querySelectorAll('.product-row')).toHaveLength(5)
    expect(input.value).toBe('')
  })
  it('clamps pagination after catalog shrink and disallows editing weighted packaging', async () => {
    const { host, products } = mount(Array.from({ length: 25 }, (_, index) => ({ ...product, id: String(index) })))
    host.querySelector<HTMLButtonElement>('[title="Следующая страница"]')!.click(); await settle()
    expect(host.querySelectorAll('.product-row')).toHaveLength(1)
    products.value = [{ ...product, isWeighted: true, packageUnit: 'g', weightStep: 100, weightMinimum: 200 }]; await settle()
    expect(host.querySelectorAll('.product-row')).toHaveLength(1)
    host.querySelector<HTMLButtonElement>('.product-row')!.click(); await settle()
    expect(document.querySelector('.product-details__package')).toBeNull()
    expect(document.querySelector('.product-details')?.textContent).toContain('Шаг заказа')
  })
})
