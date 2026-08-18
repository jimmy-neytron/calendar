<template>
  <UiModal
    :model-value="modelValue"
    :title="title"
    :eyebrow="eyebrow"
    width="440px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="ui-confirm">
      <div class="ui-confirm__message">
        <span :class="[`ui-confirm__icon--${variant}`]"><UiIcon name="warning" /></span>
        <p>{{ message }}</p>
      </div>
      <footer>
        <UiButton variant="secondary" @click="$emit('update:modelValue', false)">{{ cancelLabel }}</UiButton>
        <UiButton :variant="variant" @click="$emit('confirm')">{{ confirmLabel }}</UiButton>
      </footer>
    </div>
  </UiModal>
</template>

<script setup>
import UiButton from './UiButton.vue'
import UiIcon from './UiIcon.vue'
import UiModal from './UiModal.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Подтвердить действие' },
  eyebrow: { type: String, default: 'Подтверждение' },
  message: { type: String, required: true },
  confirmLabel: { type: String, default: 'Подтвердить' },
  cancelLabel: { type: String, default: 'Отмена' },
  variant: { type: String, default: 'danger' },
})

defineEmits(['update:modelValue', 'confirm'])
</script>

<style scoped>
.ui-confirm { display: grid; gap: 18px; }
.ui-confirm__message { display: grid; grid-template-columns: 38px 1fr; align-items: start; gap: 11px; }
.ui-confirm__message > span { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 12px; font-size: 18px; }
.ui-confirm__icon--danger { color: var(--danger); background: color-mix(in srgb, var(--danger) 12%, transparent); }
.ui-confirm__icon--primary { color: var(--accent); background: var(--accent-soft); }
.ui-confirm__message p { margin: 2px 0 0; color: var(--text-secondary); line-height: 1.55; }
.ui-confirm footer { display: flex; justify-content: flex-end; gap: 8px; }
</style>
