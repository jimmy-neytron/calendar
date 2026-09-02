// @vitest-environment jsdom
import { createApp, nextTick, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StorePurchasesToday from './StorePurchasesToday.vue'
import StoreProductCatalog from './StoreProductCatalog.vue'
import type { DailyPurchase, StoreProduct } from '../types/storeCatalog.types'

const fish: StoreProduct = {
  id: 'fish', workspaceId: 'w1', store: 'magnit', productCode: '1001234',
  name: 'Сельдь копчёная 300 г', normalizedName: 'сельдь копченая 300 г', imageUrl: '', productUrl: '',
  packageAmount: 300, packageUnit: 'g', currentPrice: 119.99, oldPrice: null,
  priceUpdatedAt: new Date().toISOString(), priceVerified: true, priceSourceId: 's1', priceStoreCode: '780171',
  priceStoreType: 'express', priceCatalogType: '2', sourceIds: [],
}
const milk: StoreProduct = { ...fish, id: 'milk', name: 'Молоко 1 л', productCode: '1005678', packageUnit: 'ml' }
const purchase: DailyPurchase = {
  name: 'Сельдь', normalizedName: 'сельдь', amount: 100, unit: 'g',
  link: null, product: null, packageAmount: null, packages: null, lineTotal: null, confirmed: false,
}
let app: App | undefined
afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.replaceChildren()
})

async function settle() { await nextTick(); await nextTick() }
async function search(value: string) {
  const input = document.querySelector<HTMLInputElement>('.ui-select__search input')!
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await settle()
  return input
}
function mountPurchases() {
  const onLink = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(StorePurchasesToday, { purchases: [purchase], products: [fish, milk], total: 0, unresolvedCount: 1, onLink })
  app.mount(host)
  return { host, onLink }
}

describe('project selects in nutrition purchases', () => {
  it('searches compatible products by name and code and emits the chosen product ID', async () => {
    const { host, onLink } = mountPurchases()
    expect(host.querySelector('select')).toBeNull()
    const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
    trigger.click()
    await settle()
    expect(trigger.getAttribute('aria-label')).toContain('Сельдь')
    const panel = document.querySelector('.ui-select__panel')!
    expect(host.contains(panel)).toBe(false) // Teleport keeps the dropdown outside table overflow.
    expect(panel.textContent).not.toContain('Молоко')
    expect(document.activeElement).toBe(panel.querySelector('input'))
    await search('КОПЧЕНАЯ')
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(1)
    expect(panel.textContent).toContain('Сельдь копчёная')
    await search('нет такого товара')
    expect(panel.textContent).toContain('Ничего не найдено')
    await search('1001234')
    document.querySelector<HTMLButtonElement>('[role="option"]')!.click()
    await settle()
    expect(onLink).toHaveBeenCalledExactlyOnceWith('Сельдь', 'g', 'fish')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('supports keyboard selection after searching', async () => {
    const { host, onLink } = mountPurchases()
    host.querySelector<HTMLButtonElement>('[role="combobox"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await settle()
    const input = await search('сельдь')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await settle()
    expect(onLink).toHaveBeenCalledExactlyOnceWith('Сельдь', 'g', 'fish')
  })

  it('edits package quantity inline and allows removing the product link', async () => {
    const onLink = vi.fn(), onSetPackage = vi.fn()
    const host = document.createElement('div'); document.body.append(host)
    app = createApp(StorePurchasesToday, { purchases: [{ ...purchase, product: fish, packageAmount: 300 }], products: [fish], total: 0, unresolvedCount: 1, onLink, 'onSet-package': onSetPackage }); app.mount(host)
    ;[...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.includes('Уточнить фасовку'))!.click(); await settle()
    const input = host.querySelector<HTMLInputElement>('input[type="number"]')!
    input.value = '500'; input.dispatchEvent(new Event('input', { bubbles: true }))
    host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settle()
    expect(onSetPackage).toHaveBeenCalledWith('fish', 500, 'g')
    host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click(); await settle()
    ;[...document.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(b => b.textContent?.includes('Выберите товар'))!.click(); await settle()
    expect(onLink).toHaveBeenCalledWith('Сельдь', 'g', '')
  })

  it('uses project controls for catalog filters and saves the selected package unit', async () => {
    const onSetPackage = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    app = createApp(StoreProductCatalog, { products: [fish], sources: [], requirements: [], 'onSet-package': onSetPackage })
    app.mount(host)
    expect(host.querySelectorAll('[role="combobox"]')).toHaveLength(2)
    const editButton = [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Фасовка'))!
    editButton.click()
    await settle()
    expect(host.querySelector('select')).toBeNull()
    host.querySelector<HTMLButtonElement>('[aria-label="Единица фасовки"]')!.click()
    await settle()
    const unit = [...document.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(option => option.textContent?.trim() === 'мл')!
    unit.click()
    await settle()
    host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await settle()
    expect(onSetPackage).toHaveBeenCalledExactlyOnceWith('fish', 300, 'ml')
  })
})
