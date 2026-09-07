import { inject, provide, shallowRef, type InjectionKey } from 'vue'

export interface ContextEvent {
  id: string
  title: string
  parentId?: string
  repeat?: string
}
export interface EventMenuState {
  event: ContextEvent
  x: number
  y: number
  trigger: HTMLElement | null
}
type OpenEventMenu = (event: ContextEvent, pointer: MouseEvent) => void
const eventMenuKey: InjectionKey<OpenEventMenu> = Symbol('calendar-event-menu')

export function provideEventContextMenu() {
  const menu = shallowRef<EventMenuState | null>(null)
  provide(eventMenuKey, (event, pointer) => {
    pointer.preventDefault()
    pointer.stopPropagation()
    const trigger = pointer.currentTarget instanceof HTMLElement ? pointer.currentTarget : null
    const rect = trigger?.getBoundingClientRect()
    menu.value = { event, x: pointer.clientX || rect?.left || 0, y: pointer.clientY || rect?.bottom || 0, trigger }
  })
  function closeMenu(restoreFocus = true) {
    if (restoreFocus) menu.value?.trigger?.focus({ preventScroll: true })
    menu.value = null
  }
  return { menu, closeMenu }
}

export function useEventContextMenu() {
  return inject(eventMenuKey, () => {})
}
