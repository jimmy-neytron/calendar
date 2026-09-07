<template>
  <Teleport to="body">
    <div ref="menuElement" class="event-context-menu" role="menu" :aria-label="`Действия: ${state.event.title}`" :style="{ left: `${position.x}px`, top: `${position.y}px` }" @contextmenu.prevent @keydown="handleKeydown">
      <p v-if="isSeries">Повторяющееся событие</p>
      <button type="button" role="menuitem" @click="emit('edit', state.event)"><UiIcon name="edit" />{{ isSeries ? 'Изменить серию' : 'Изменить' }}</button>
      <button type="button" role="menuitem" class="event-context-menu__delete" @click="emit('delete', state.event)"><UiIcon name="trash" />{{ isSeries ? 'Удалить всю серию' : 'Удалить' }}</button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiIcon from '../ui/UiIcon.vue'
import type { ContextEvent, EventMenuState } from '../../composables/calendar/useEventContextMenu'

const props = defineProps<{ state: EventMenuState }>()
const emit = defineEmits<{ edit: [event: ContextEvent]; delete: [event: ContextEvent]; close: [restoreFocus: boolean] }>()
const menuElement = ref<HTMLElement | null>(null)
const position = ref({ x: props.state.x, y: props.state.y })
const isSeries = computed(() => props.state.event.parentId || (props.state.event.repeat && props.state.event.repeat !== 'none'))
async function positionMenu() {
  await nextTick()
  const rect = menuElement.value?.getBoundingClientRect()
  if (!rect) return
  position.value = { x: Math.max(8, Math.min(props.state.x, window.innerWidth - rect.width - 8)), y: Math.max(8, Math.min(props.state.y, window.innerHeight - rect.height - 8)) }
  menuElement.value?.querySelector<HTMLButtonElement>('button')?.focus()
}
function outsidePointer(event: PointerEvent) {
  if (!menuElement.value?.contains(event.target as Node)) emit('close', false)
}
function dismiss() { emit('close', false) }
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' || event.key === 'Tab') {
    if (event.key === 'Escape') event.preventDefault()
    emit('close', true)
    return
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const buttons = Array.from(menuElement.value?.querySelectorAll<HTMLButtonElement>('button') || [])
  const current = buttons.findIndex(button => button === document.activeElement)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
  buttons[next]?.focus()
}
watch(() => props.state, positionMenu)
onMounted(() => {
  void positionMenu()
  document.addEventListener('pointerdown', outsidePointer, true)
  window.addEventListener('resize', dismiss)
  window.addEventListener('scroll', dismiss, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outsidePointer, true)
  window.removeEventListener('resize', dismiss)
  window.removeEventListener('scroll', dismiss, true)
})
</script>

<style scoped>
.event-context-menu { position: fixed; z-index: 1000; width: 208px; max-width: calc(100vw - 16px); padding: 5px; border: 1px solid var(--border-strong); border-radius: 10px; background: var(--panel-bg); box-shadow: 0 8px 28px #0003; }
.event-context-menu p { margin: 5px 8px 7px; font-size: 11px; color: var(--text-muted); }
.event-context-menu button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px; border: 0; border-radius: 6px; background: transparent; color: var(--text-primary); font: inherit; font-size: 13px; text-align: left; cursor: pointer; }
.event-context-menu button:hover, .event-context-menu button:focus-visible { background: var(--control-bg-hover); outline: none; }
.event-context-menu .event-context-menu__delete { color: var(--danger); }
.event-context-menu :deep(svg) { font-size: 15px; }
</style>
