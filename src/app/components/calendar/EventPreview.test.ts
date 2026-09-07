// @vitest-environment jsdom
import { createApp, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EventPreview from './EventPreview.vue'

let app: App | undefined
afterEach(() => { app?.unmount(); document.body.replaceChildren() })

describe('просмотр события', () => {
  it('показывает дату выбранного повторения и передаёт событие в редактор', () => {
    const event = { id: 'series::2026-09-12', parentId: 'series', title: 'Урок', date: '2026-09-12', startTime: '14:00', endTime: '15:00', memberIds: ['anna'], notes: 'Взять тетрадь', linkedEntityType: 'course-lesson', linkedEntityId: 'lesson' }
    const onEdit = vi.fn()
    const onOpenLinked = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    app = createApp(EventPreview, { modelValue: true, event, members: [{ id: 'anna', name: 'Анна' }], calendars: [], onEdit, onOpenLinked })
    app.mount(host)
    expect(document.body.textContent).toContain('Анна')
    expect(document.body.textContent).toContain('Взять тетрадь')
    expect(document.body.textContent).toContain('ко всей серии')
    expect(document.querySelector('.event-preview__time')?.textContent).toContain('12')
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')]
    buttons.find(button => button.textContent?.includes('Изменить'))!.click()
    expect(onEdit).toHaveBeenCalledWith(event)
    buttons.find(button => button.textContent?.includes('Открыть урок'))!.click()
    expect(onOpenLinked).toHaveBeenCalledWith(event)
    expect(document.querySelector('input')).toBeNull()
  })
})
