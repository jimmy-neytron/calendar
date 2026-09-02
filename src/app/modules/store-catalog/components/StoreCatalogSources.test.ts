// @vitest-environment jsdom
import { createApp, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StoreCatalogSources from './StoreCatalogSources.vue'
import type { StoreCatalogSource } from '../types/storeCatalog.types'

const source: StoreCatalogSource = {
  id: 's1', workspaceId: 'w1', store: 'magnit', storeCode: '780171', name: 'Бакалея',
  url: 'https://magnit.ru/catalog/64121-bakaleya?shopCode=780171&shopType=express',
  enabled: false, lastSyncedAt: null, nextSyncAt: '2026-09-03T12:00:00Z', status: 'idle', lastError: '', productCount: 0,
}
let app: App | undefined
afterEach(() => { app?.unmount(); app = undefined; document.body.replaceChildren() })
function mount(syncingSourceId = '') {
  const onSync = vi.fn(), onToggle = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(StoreCatalogSources, { sources: [source], saving: false, syncingSourceId, onSync, onToggle })
  app.mount(host)
  const button = [...host.querySelectorAll('button')].find(item => item.textContent?.includes('Обновить сейчас'))!
  return { host, button, onSync, onToggle }
}
describe('manual source sync UI', () => {
  it('allows a manual run without enabling auto', () => {
    const { host, button, onSync, onToggle } = mount()
    expect(host.textContent).toContain('Авто выключено')
    expect(button.disabled).toBe(false)
    button.click()
    expect(onSync).toHaveBeenCalledExactlyOnceWith('s1')
    expect(onToggle).not.toHaveBeenCalled()
    expect(host.querySelector('[role="switch"]')?.getAttribute('aria-checked')).toBe('false')
  })
  it.each(['s1', 'another-source'])('prevents duplicate launches while %s is syncing', syncingSourceId => {
    const { button, onSync } = mount(syncingSourceId)
    expect(button.disabled).toBe(true)
    button.click()
    expect(onSync).not.toHaveBeenCalled()
  })
})
