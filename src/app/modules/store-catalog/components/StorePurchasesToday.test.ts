// @vitest-environment jsdom
import { createApp, nextTick, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StorePurchasesToday from './StorePurchasesToday.vue'
import type { DailyPurchase } from '../types/storeCatalog.types'

const purchase: DailyPurchase = { name: 'Молоко', normalizedName: 'молоко', amount: 500, unit: 'ml', link: null, product: null, packageAmount: null, packages: null, lineTotal: null, confirmed: false }
let app: App | undefined
afterEach(() => { app?.unmount(); document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function mount(pricingEnabled = true, purchases = [purchase]) {
  const host = document.createElement('div'); document.body.append(host)
  app = createApp(StorePurchasesToday, { purchases, products: [], total: 0, unresolvedCount: purchases.length, pricingEnabled, showDatePicker: false })
  app.mount(host)
  return host
}
function button(host: HTMLElement, text: string) { return [...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.includes(text))! }

describe('shopping list interactions', () => {
  it('checks a product, updates progress and filters without affecting the estimate', async () => {
    const host = mount()
    host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(); await nextTick()
    expect(host.querySelector('progress')?.value).toBe(1)
    button(host, 'Купить').click(); await nextTick()
    expect(host.querySelectorAll('.ingredient-purchase')).toHaveLength(0)
    expect(host.textContent).toContain('Всё куплено. Можно готовить!')
    button(host, 'Куплено').click(); await nextTick()
    expect(host.querySelectorAll('.ingredient-purchase')).toHaveLength(1)
    button(host, 'Снять отметки').click(); await nextTick()
    expect(host.querySelector('progress')?.value).toBe(0)
  })
  it('keeps a simple checklist without store controls for non-admins', () => {
    const host = mount(false)
    expect(host.querySelector('input[type="checkbox"]')).not.toBeNull()
    expect(host.querySelector('.ingredient-purchase__summary')).toBeNull()
    expect(host.textContent).not.toContain('Без расчёта')
    expect(host.textContent).toContain('500 мл')
  })
  it('copies unchecked ingredients and reports clipboard failures', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const host = mount()
    button(host, 'Копировать список').click(); await nextTick(); await nextTick()
    expect(writeText).toHaveBeenCalledWith('Что нужно купить\n☐ Молоко — 500 мл')
    expect(host.querySelector('[role="status"]')?.textContent).toContain('скопирован')
    writeText.mockRejectedValueOnce(new Error('Denied'))
    button(host, 'Копировать список').click(); await nextTick(); await nextTick()
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Не удалось')
  })
  it('provides an empty state and disables copying an empty list', () => {
    const host = mount(false, [])
    expect(host.textContent).toContain('Начнём со списка')
    expect(button(host, 'Копировать список').disabled).toBe(true)
  })
})
