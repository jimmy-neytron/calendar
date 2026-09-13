// @vitest-environment jsdom
import { createApp, nextTick, type App } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import FlexibleSchedulePanel from './FlexibleSchedulePanel.vue'
vi.mock('../../composables/calendar/useFlexibleSchedule', async () => {
  const { ref } = await import('vue')
  return { useFlexibleSchedule: () => ({ events: ref([]), flexibleEvents: ref([]), conflicts: ref([]), alternatives: () => [], apply: vi.fn(async () => true), undo: vi.fn(), toggleLock: vi.fn(), busy: ref(false), message: ref(''), undoEntries: ref([]) }) }
})
vi.mock('../../stores/workspace.store.js', async () => { const { ref } = await import('vue'); return { workspaceStore: { activeWorkspaceId: ref('test') } } })
let app: App | undefined
afterEach(() => { app?.unmount(); document.body.replaceChildren(); vi.useRealTimers() })
it('предпросмотр требует согласия на неполную неделю и сбрасывается при изменении условий', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-11T09:00:00'))
  const host = document.createElement('div'); document.body.append(host)
  app = createApp(FlexibleSchedulePanel, { selectedDate: '2026-09-11', calendars: [{ id: 'main', name: 'Личный' }] })
  app.mount(host)
  const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.trim() === text)!
  button('Подобрать расписание').click(); await nextTick()
  const title = document.querySelector<HTMLInputElement>('input[placeholder="Например, английский"]')!
  title.value = 'Английский'; title.dispatchEvent(new Event('input')); await nextTick()
  document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true })); await nextTick()
  expect(document.querySelectorAll('.flexible-preview__card')).toHaveLength(1)
  expect(document.body.textContent).toContain('не удалось разместить 2')
  expect(button('Применить').disabled).toBe(true)
  document.querySelector<HTMLInputElement>('input[type=checkbox]')!.click(); await nextTick()
  expect(button('Применить').disabled).toBe(false)
  title.value = 'Другой урок'; title.dispatchEvent(new Event('input')); await nextTick()
  expect(document.querySelector('.flexible-preview')).toBeNull()
})

