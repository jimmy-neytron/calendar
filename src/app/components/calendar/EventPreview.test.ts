// @vitest-environment jsdom
import { createApp, nextTick, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EventPreview from './EventPreview.vue'

let app: App | undefined
afterEach(() => { app?.unmount(); document.body.replaceChildren() })

describe('просмотр события', () => {
  it('показывает дату выбранного повторения и передаёт событие в редактор', async () => {
    const event = { id: 'series::2026-09-12', parentId: 'series', title: 'Урок', date: '2026-09-12', startTime: '14:00', endTime: '15:00', memberIds: ['anna'], notes: 'Взять тетрадь', linkedEntityType: 'course-lesson', linkedEntityId: 'lesson' }
    const onEdit = vi.fn()
    const onOpenLinked = vi.fn()
    const onDelete = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    app = createApp(EventPreview, { modelValue: true, event, members: [{ id: 'anna', name: 'Анна' }], calendars: [], onEdit, onOpenLinked, onDelete })
    app.mount(host)
    expect(document.body.textContent).toContain('Анна')
    expect(document.body.textContent).toContain('Взять тетрадь')
    expect(document.body.textContent).toContain('ко всей серии')
    expect(document.querySelector('.event-preview__time')?.textContent).toContain('12')
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')]
    buttons.find(button => button.textContent?.includes('Изменить'))!.click()
    expect(onEdit).toHaveBeenCalledWith(event)
    buttons.find(button => button.getAttribute('aria-label') === 'Открыть урок')!.click()
    expect(onOpenLinked).toHaveBeenCalledWith(event)
    buttons.find(button => button.textContent?.trim() === 'Удалить')!.click()
    await nextTick()
    expect(document.body.textContent).toContain('вся серия будут удалены')
    ;[...document.querySelectorAll<HTMLButtonElement>('button')].filter(button => button.textContent?.trim() === 'Удалить').at(-1)!.click()
    expect(onDelete).toHaveBeenCalledWith(event)
    expect(document.querySelector('input')).toBeNull()
  })
})

it.each([
  ['birthday', 'Дни рождения', 'Открыть день рождения'],
  ['birthday-reminder', 'Дни рождения', 'Открыть день рождения'],
  ['movie-watchlist', 'Фильмы и сериалы', 'Открыть фильм'],
  ['budget-payment', 'Бюджет', 'Открыть платёж'],
  ['idea', 'Идеи', 'Открыть идею'],
])('показывает источник %s и открывает связанную запись', (type, label, action) => {
  const event = { id: 'event', title: 'Планы', date: '2026-09-12', linkedEntityType: type, linkedEntityId: 'record' }
  const onOpenLinked = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(EventPreview, { modelValue: true, event, members: [], calendars: [], onOpenLinked })
  app.mount(host)
  expect(document.querySelector('.event-preview__source')?.textContent).toContain(label)
  const button = document.querySelector<HTMLButtonElement>('.event-preview__source')!
  expect(button.getAttribute('aria-label')).toBe(action)
  button.click()
  expect(onOpenLinked).toHaveBeenCalledWith(event)
})

it.each([undefined, 'unknown-source'])('не предлагает неработающий переход для %s', (type) => {
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(EventPreview, { modelValue: true, event: { id: 'event', title: 'Встреча', date: '2026-09-12', linkedEntityType: type }, members: [], calendars: [] })
  app.mount(host)
  expect(document.querySelector('button.event-preview__source')).toBeNull()
  if (!type) expect(document.querySelector('.event-preview__source')).toBeNull()
})
