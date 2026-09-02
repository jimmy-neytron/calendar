<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="modelValue" class="ui-modal" :class="[overlayClass, { 'ui-modal--fullscreen': fullscreen }]" @mousedown.self="handleOverlayClick">
        <transition name="modal" appear>
          <section
            ref="dialog"
            class="ui-modal__dialog"
            :class="dialogClass"
            :style="{ '--ui-modal-width': width }"
            role="dialog"
            aria-modal="true"
            :aria-label="title"
            tabindex="-1"
          >
            <header class="ui-modal__header">
              <div>
                <p v-if="eyebrow" class="ui-modal__eyebrow">{{ eyebrow }}</p>
                <slot name="header-badge" />
                <h2>{{ title }}</h2>
              </div>
              <UiIconButton v-if="!hideClose" icon="close" label="Закрыть" @click="close" />
            </header>
            <div class="ui-modal__body">
              <slot />
            </div>
          </section>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiIconButton from './UiIconButton.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
  closeOnOverlay: { type: Boolean, default: true },
  closeOnEscape: { type: Boolean, default: true },
  hideClose: { type: Boolean, default: false },
  width: { type: String, default: '560px' },
  fullscreen: { type: Boolean, default: false },
  overlayClass: { type: [String, Array, Object], default: '' },
  dialogClass: { type: [String, Array, Object], default: '' },
})

const emit = defineEmits(['update:modelValue', 'close'])
const dialog = ref(null)
let previouslyFocused = null

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) close()
}

const handleKeydown = (event) => {
  if (!props.modelValue) return
  if (event.key === 'Escape' && props.closeOnEscape) {
    close()
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return

  const focusable = [...dialog.value.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.offsetParent !== null)
  if (!focusable.length) {
    event.preventDefault()
    dialog.value.focus()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(() => props.modelValue, async (opened) => {
  if (typeof document === 'undefined') return
  if (opened) {
    previouslyFocused = document.activeElement
    await nextTick()
    const preferred = dialog.value?.querySelector('[autofocus]')
    const fallback = dialog.value?.querySelector('input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])')
    ;(preferred || fallback || dialog.value)?.focus()
    return
  }
  if (previouslyFocused?.isConnected) previouslyFocused.focus()
  previouslyFocused = null
}, { immediate: true })

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (previouslyFocused?.isConnected) previouslyFocused.focus()
})
</script>

<style scoped>
.ui-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  width: 100%;
  max-width: 100vw;
  display: grid;
  place-items: center;
  padding: 16px;
  overflow-x: hidden;
  background: rgba(3, 4, 9, 0.72);
  backdrop-filter: blur(12px);
}

.ui-modal__dialog {
  width: min(100%, var(--ui-modal-width, 560px));
  min-width: 0;
  max-height: min(760px, calc(100vh - 32px));
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-xl);
  background: var(--panel-bg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.ui-modal__header {
  min-width: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 16px 10px;
  border-bottom: 1px solid var(--border-color);
}

.ui-modal__header h2 {
  margin: 0;
  overflow-wrap: anywhere;
}

.ui-modal__header :slotted(.global-admin-modal__badge) {
  margin-bottom: 8px;
}

.ui-modal__eyebrow {
  margin-bottom: 3px;
  color: var(--accent-light, var(--accent-hover));
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.ui-modal__body {
  min-width: 0;
  padding: 16px;
  overflow: auto;
  overflow-x: hidden;
}

.ui-modal--fullscreen { padding: 0; }
.ui-modal--fullscreen .ui-modal__dialog {
  width: 100%;
  height: 100dvh;
  max-height: none;
  border: 0;
  border-radius: 0;
}
.ui-modal--fullscreen .ui-modal__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

@media (min-width: 600px) and (max-width: 1180px), (min-width: 600px) and (max-height: 900px) {
  .ui-modal { padding: 8px; }
  .ui-modal__dialog { max-height: calc(100dvh - 16px); border-radius: var(--radius-lg); }
  .ui-modal__header { padding: 11px 12px 8px; }
  .ui-modal__header h2 { font-size: 16px; }
  .ui-modal__eyebrow { margin-bottom: 1px; font-size: 8px; }
  .ui-modal__body { padding: 11px 12px; }
}

@media (max-width: 720px) {
  .ui-modal--fullscreen .ui-modal__body { overflow: auto; }
}

@media (max-width: 599px) {
  .ui-modal { padding: 8px; }
  .ui-modal__dialog {
    max-height: calc(100dvh - 16px);
    border-radius: var(--radius-lg);
  }
  .ui-modal__header { padding: 12px 12px 9px; }
  .ui-modal__body { padding: 12px; }
}
</style>
