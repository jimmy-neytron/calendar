// @vitest-environment jsdom
import { createApp, nextTick, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StoreCatalogSources from './StoreCatalogSources.vue'
import StoreSourceEditorModal from './StoreSourceEditorModal.vue'
import StoreSourceDeleteModal from './StoreSourceDeleteModal.vue'
import type { StoreCatalogSource } from '../types/storeCatalog.types'
const source: StoreCatalogSource = { id: 's1', workspaceId: 'w1', store: 'magnit', storeCode: '780171', name: 'Бакалея', url: 'https://magnit.ru/catalog/64121-bakaleya?shopCode=780171&shopType=express', enabled: false, lastSyncedAt: null, nextSyncAt: '', status: 'idle', lastError: '', productCount: 12 }
let app: App
afterEach(() => { app?.unmount(); document.body.replaceChildren() })
function mountApp(instance: App) { app = instance; const host = document.createElement('div'); document.body.append(host); app.mount(host); return host }
function button(text: string) { return [...document.querySelectorAll('button')].find(item => item.textContent?.trim() === text)! }

describe('source editing and cleanup controls', () => {
  it('exposes separate edit, source removal and category cleanup actions', () => {
    const onEdit = vi.fn(), onRemove = vi.fn(), onClear = vi.fn()
    mountApp(createApp(StoreCatalogSources, { sources: [source], saving: false, syncingSourceId: '', onEdit, onRemove, onClear }))
    document.querySelector('summary')!.click()
    button('Редактировать').click(); button('Удалить источник').click(); button('Очистить товары категории').click()
    for (const handler of [onEdit, onRemove, onClear]) expect(handler).toHaveBeenCalledExactlyOnceWith(source)
  })
  it('blocks all three actions during a background sync', () => {
    mountApp(createApp(StoreCatalogSources, { sources: [{ ...source, status: 'syncing' }], saving: false, syncingSourceId: '' }))
    for (const label of ['Редактировать', 'Удалить источник', 'Очистить товары категории']) expect(button(label).disabled).toBe(true)
  })
  it('prefills source data and submits normalized edits without closing prematurely', async () => {
    const onSave = vi.fn(), onClose = vi.fn()
    mountApp(createApp(StoreSourceEditorModal, { source, saving: false, onSave, onClose }))
    await nextTick()
    const input = document.querySelector<HTMLInputElement>('[aria-label="Название раздела"]')!
    expect(input.value).toBe(source.name)
    expect(document.activeElement).toBe(input)
    input.value = ' Новое название '; input.dispatchEvent(new Event('input'))
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(onSave).toHaveBeenCalledWith({ name: 'Новое название', url: source.url, storeCode: source.storeCode })
    expect(onClose).not.toHaveBeenCalled()
    expect(input.value).toBe(' Новое название ')
  })
  it('keeps invalid edits in the form and shows an inline error', async () => {
    const onSave = vi.fn()
    mountApp(createApp(StoreSourceEditorModal, { source, saving: false, onSave }))
    const input = document.querySelector<HTMLInputElement>('input[type="url"]')!
    input.value = 'https://example.com'; input.dispatchEvent(new Event('input'))
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await nextTick()
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
    expect(onSave).not.toHaveBeenCalled()
    expect(input.value).toBe('https://example.com')
  })
  it('explains permanent cleanup and does nothing until confirmation', () => {
    const onConfirm = vi.fn()
    mountApp(createApp(StoreSourceDeleteModal, { source, saving: false, clearProducts: true, onConfirm }))
    expect(document.body.textContent).toContain('привязки удалённых товаров нужно будет настроить заново')
    expect(onConfirm).not.toHaveBeenCalled()
    button('Удалить товары категории').click()
    expect(onConfirm).toHaveBeenCalledOnce()
  })
  it('disables confirmation and dismissal while saving', () => {
    const onConfirm = vi.fn(), onClose = vi.fn()
    mountApp(createApp(StoreSourceDeleteModal, { source, saving: true, clearProducts: false, onConfirm, onClose }))
    expect(document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.disabled).toBe(true)
    button('Удалить источник и товары').click(); button('Отмена').click()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onConfirm).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled()
  })
  it('defaults to removing source products and explains the consequences', () => {
    const onConfirm = vi.fn()
    mountApp(createApp(StoreSourceDeleteModal, { source, saving: false, clearProducts: false, onConfirm }))
    expect(document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(true)
    expect(document.body.textContent).toContain('Общие товары других источников, меню и рецепты сохранятся')
    expect(onConfirm).not.toHaveBeenCalled()
    button('Удалить источник и товары').click()
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(true)
  })
  it('allows keeping products and updates the confirmation text', async () => {
    const onConfirm = vi.fn()
    mountApp(createApp(StoreSourceDeleteModal, { source, saving: false, clearProducts: false, onConfirm }))
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click()
    await nextTick()
    expect(document.body.textContent).toContain('Товары, история и привязки к ингредиентам сохранятся')
    button('Удалить только источник').click()
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(false)
  })
})
