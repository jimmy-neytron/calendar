// @vitest-environment jsdom
import { createApp, h, nextTick, ref, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EventDrawer from './EventDrawer.vue'
import { createEmptyEventForm } from './eventFormMapper.js'

vi.mock('../../stores/auth.store.js', () => ({ authStore: { currentUserId: ref('user'), currentUser: ref({ name: 'Анна' }) } }))
let app: App | undefined
afterEach(() => { app?.unmount(); document.body.replaceChildren() })

async function mount(editingEvent: Record<string, unknown> | null = null) {
  const open = ref(false)
  const onCreate = vi.fn()
  const onUpdate = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp({ setup: () => () => h(EventDrawer, { modelValue: open.value, editingEvent, selectedDateKey: '2026-09-05', initialStartTime: '14:00', calendars: [{ id: 'main', name: 'Основной' }], onCreate, onUpdate }) })
  app.mount(host)
  open.value = true
  await nextTick()
  await nextTick()
  return { onCreate, onUpdate }
}

function submit() { document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) }

describe('компактный редактор событий', () => {
  it('создаёт событие по названию с датой и временем выбранного интервала', async () => {
    const { onCreate } = await mount()
    const input = document.querySelector<HTMLInputElement>('input[autofocus]')!
    input.value = 'Встреча'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    submit()
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Встреча', date: '2026-09-05', startTime: '14:00', endTime: '15:00' }))
    expect(document.querySelectorAll('.event-form-section__toggle[aria-expanded="true"]')).toHaveLength(0)
  })

  it('сохраняет настройки закрытых блоков при редактировании', async () => {
    const event = { ...createEmptyEventForm(), id: 'event', title: 'Занятие', repeat: 'daily', notes: 'Взять тетрадь', location: 'Класс', responsibleId: 'user' }
    const { onUpdate } = await mount(event)
    submit()
    expect(onUpdate).toHaveBeenCalledWith('event', expect.objectContaining(event))
  })

  it('раскрывает повторение при ошибке в скрытых настройках', async () => {
    const { onUpdate } = await mount({ ...createEmptyEventForm(), id: 'event', title: 'Занятие', repeat: 'custom', repeatUnit: 'week', repeatWeekdays: [] })
    submit()
    await nextTick()
    expect(onUpdate).not.toHaveBeenCalled()
    expect(document.querySelector('.event-form-section__toggle')?.getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Выберите хотя бы один день недели')
  })
})
