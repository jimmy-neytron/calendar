// @vitest-environment jsdom
import { createApp, defineComponent, h, nextTick, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EventContextMenu from './EventContextMenu.vue'
import EventCard from './EventCard.vue'
import { provideEventContextMenu, type EventMenuState } from '../../composables/calendar/useEventContextMenu'

vi.mock('../../stores/calendarCollection.store.js', () => ({ calendarCollectionStore: { getCollection: () => null } }))
vi.mock('../../composables/calendar/useTouchEventDrag.js', () => ({ useTouchEventDrag: () => ({ beginTouchDrag: vi.fn(), shouldSuppressEventClick: () => false }) }))
let app: App | undefined
const event = { id: 'event', title: 'Встреча', date: '2026-09-12', memberIds: [] }
afterEach(() => { app?.unmount(); document.body.replaceChildren() })
function mountMenu(overrides: Partial<EventMenuState> = {}) {
  const onEdit = vi.fn(), onDelete = vi.fn(), onClose = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(EventContextMenu, { state: { event, x: 10000, y: 10000, trigger: null, ...overrides }, onEdit, onDelete, onClose })
  app.mount(host)
  return { onEdit, onDelete, onClose }
}

describe('меню события', () => {
  it('передаёт выбранное событие в редактирование и удаление', async () => {
    const { onEdit, onDelete } = mountMenu()
    await nextTick()
    const buttons = document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    buttons[0].click()
    expect(onEdit).toHaveBeenCalledWith(event)
    buttons[1].click()
    expect(onDelete).toHaveBeenCalledWith(event)
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!
    await vi.waitFor(() => expect(parseFloat(menu.style.left)).toBeLessThan(window.innerWidth))
    expect(parseFloat(menu.style.top)).toBeLessThan(window.innerHeight)
  })
  it('поддерживает стрелки, Escape и клик вне меню', async () => {
    const { onClose } = mountMenu()
    await nextTick()
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(document.activeElement?.textContent).toContain('Удалить')
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onClose).toHaveBeenCalledWith(true)
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(onClose).toHaveBeenCalledWith(false)
  })
  it('явно предупреждает об удалении всей серии', () => {
    mountMenu({ event: { ...event, parentId: 'series' } })
    expect(document.body.textContent).toContain('Удалить всю серию')
    expect(document.body.textContent).toContain('Изменить серию')
  })
  it('ПКМ на карточке открывает меню, не открывая просмотр', async () => {
    const preview = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    app = createApp(defineComponent({ setup() {
      const { menu, closeMenu } = provideEventContextMenu()
      return () => h('div', [h(EventCard, { event, onEdit: preview }), menu.value ? h(EventContextMenu, { state: menu.value, onClose: closeMenu }) : null])
    } }))
    app.mount(host)
    const card = document.querySelector<HTMLElement>('.event-card')!
    const click = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 30, clientY: 40 })
    card.dispatchEvent(click)
    await nextTick()
    expect(click.defaultPrevented).toBe(true)
    expect(document.querySelector('[role="menu"]')).not.toBeNull()
    expect(preview).not.toHaveBeenCalled()
  })
})
