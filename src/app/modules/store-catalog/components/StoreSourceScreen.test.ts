// @vitest-environment jsdom
import { createApp, nextTick, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StoreCatalogSources from './StoreCatalogSources.vue'
import StoreSourceEditorModal from './StoreSourceEditorModal.vue'
import { useStoreSourceForm } from '../composables/useStoreSourceForm'
import type { StoreCatalogSource } from '../types/storeCatalog.types'

const source: StoreCatalogSource = { id: 's1', workspaceId: 'w1', store: 'magnit', storeCode: '780171', name: 'Овощи', url: 'https://magnit.ru/catalog/64121-bakaleya?shopCode=780171&shopType=express', enabled: true, lastSyncedAt: null, nextSyncAt: '', status: 'idle', lastError: '', productCount: 12 }
let app: App | undefined
afterEach(() => { app?.unmount(); app = undefined; document.body.replaceChildren() })
function mount(instance: App) { app = instance; const host = document.createElement('div'); document.body.append(host); app.mount(host); return host }
function button(text: string) { return [...document.querySelectorAll('button')].find(item => item.textContent?.trim() === text)! }

describe('redesigned source screen', () => {
  it('starts with a guided empty state and opens creation only on request', () => {
    const onCreate = vi.fn()
    const host = mount(createApp(StoreCatalogSources, { sources: [], saving: false, syncingSourceId: '', onCreate }))
    expect(host.querySelector('form')).toBeNull()
    expect(host.querySelectorAll('.sources-steps li')).toHaveLength(3)
    button('Добавить первый источник').click()
    expect(onCreate).toHaveBeenCalledOnce()
  })
  it('searches by name and store code, combines status filters and resets them', async () => {
    const host = mount(createApp(StoreCatalogSources, { sources: [source, { ...source, id: 's2', name: 'Молоко', storeCode: '123456', enabled: false, status: 'error' }], saving: false, syncingSourceId: '' }))
    const input = host.querySelector<HTMLInputElement>('[aria-label="Найти источник"]')!
    input.value = '123456'; input.dispatchEvent(new Event('input')); await nextTick()
    expect(host.querySelectorAll('.source-item')).toHaveLength(1)
    expect(host.querySelector('.source-item h3')?.textContent).toBe('Молоко')
    host.querySelector<HTMLButtonElement>('[aria-label="Фильтр источников"]')!.click(); await nextTick()
    ;[...document.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(item => item.textContent?.trim() === 'С автообновлением')!.click(); await nextTick()
    expect(host.querySelectorAll('.source-item')).toHaveLength(0)
    button('Сбросить фильтры').click(); await nextTick()
    expect(input.value).toBe('')
    expect(host.querySelectorAll('.source-item')).toHaveLength(2)
  })
  it('keeps destructive actions in a closed management panel and handles malformed dates', async () => {
    const onRemove = vi.fn()
    const host = mount(createApp(StoreCatalogSources, { sources: [{ ...source, lastSyncedAt: 'bad-date' }], saving: false, syncingSourceId: '', onRemove }))
    const details = host.querySelector<HTMLDetailsElement>('.source-management')!
    expect(details.open).toBe(false)
    expect(host.textContent).toContain('Не назначено')
    details.querySelector('summary')!.click(); await nextTick()
    expect(details.open).toBe(true)
    button('Удалить источник').click()
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }))
  })
})

describe('shared source creation form', () => {
  it('previews and submits a physical-store URL without substituting delivery', async () => {
    const onSave = vi.fn()
    mount(createApp(StoreSourceEditorModal, { saving: false, onSave }))
    const url = document.querySelector<HTMLInputElement>('[aria-label="Ссылка Магнита"]')!
    const offlineUrl = source.url.replace('shopType=express', 'shopType=1')
    url.value = offlineUrl; url.dispatchEvent(new Event('input'))
    const name = document.querySelector<HTMLInputElement>('[aria-label="Название раздела"]')!
    name.value = 'Овощи'; name.dispatchEvent(new Event('input')); await nextTick()
    expect(document.querySelector('.source-editor__preview')?.textContent).toContain('В магазине · Цены на полке')
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(onSave).toHaveBeenCalledExactlyOnceWith({ name: 'Овощи', url: offlineUrl, storeCode: '780171' })
  })
  it('focuses the URL, previews its context and submits without clearing the draft', async () => {
    const onSave = vi.fn()
    mount(createApp(StoreSourceEditorModal, { saving: false, onSave }))
    await nextTick()
    const url = document.querySelector<HTMLInputElement>('[aria-label="Ссылка Магнита"]')!
    expect(document.activeElement).toBe(url)
    expect(document.querySelector<HTMLDetailsElement>('.source-editor__advanced')!.open).toBe(false)
    url.value = source.url; url.dispatchEvent(new Event('input'))
    const name = document.querySelector<HTMLInputElement>('[aria-label="Название раздела"]')!
    name.value = ' Овощи '; name.dispatchEvent(new Event('input')); await nextTick()
    expect(document.querySelector('.source-editor__preview')?.textContent).toContain('780171')
    expect(document.querySelector('.source-editor__preview')?.textContent).toContain('Доставка')
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(onSave).toHaveBeenCalledExactlyOnceWith({ name: 'Овощи', url: source.url, storeCode: '780171' })
    expect(url.value).toBe(source.url)
  })
  it('rejects mismatched store codes and removes the valid preview', () => {
    const form = useStoreSourceForm(source)
    expect(form.context.value?.storeCode).toBe('780171')
    form.draft.storeCode = '123456'
    expect(form.context.value).toBeNull()
    expect(form.validate()).toBeNull()
    expect(form.error.value).toContain('отличается')
    expect(form.draft.storeCode).toBe('123456')
  })
  it('displays a server error and blocks dismissal and submit while saving', () => {
    const onClose = vi.fn(), onSave = vi.fn()
    mount(createApp(StoreSourceEditorModal, { source, saving: true, serverError: 'Источник уже добавлен', onClose, onSave }))
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('Источник уже добавлен')
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).not.toHaveBeenCalled(); expect(onSave).not.toHaveBeenCalled()
    for (const input of document.querySelectorAll('input')) expect(input.disabled).toBe(true)
  })
})
