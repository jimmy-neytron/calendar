<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="modelValue" class="ui-modal" @mousedown.self="handleOverlayClick">
        <transition name="modal" appear>
          <section class="ui-modal__dialog" :style="{ maxWidth: width }" role="dialog" aria-modal="true">
            <header class="ui-modal__header">
              <div>
                <p v-if="eyebrow" class="ui-modal__eyebrow">{{ eyebrow }}</p>
                <h2>{{ title }}</h2>
              </div>
              <UiButton variant="ghost" icon="✕" icon-only @click="close" />
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
import { onBeforeUnmount, onMounted } from 'vue'
import UiButton from './UiButton.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
  closeOnOverlay: { type: Boolean, default: true },
  width: { type: String, default: '560px' },
})

const emit = defineEmits(['update:modelValue', 'close'])

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) close()
}

const handleKeydown = (event) => {
  if (event.key === 'Escape' && props.modelValue) close()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.ui-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(3, 4, 9, 0.72);
  backdrop-filter: blur(12px);
}

.ui-modal__dialog {
  width: min(100%, 560px);
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
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 16px 10px;
  border-bottom: 1px solid var(--border-color);
}

.ui-modal__header h2 {
  margin: 0;
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
  padding: 16px;
  overflow: auto;
}
</style>
