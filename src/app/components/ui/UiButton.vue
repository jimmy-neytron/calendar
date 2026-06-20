<template>
  <button
    class="ui-button"
    :class="[`ui-button--${variant}`, `ui-button--${size}`, { 'ui-button--icon-only': iconOnly }]"
    :disabled="disabled || loading"
    :type="type"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="ui-button__spinner" />
    <span v-else-if="icon" class="ui-button__icon">{{ icon }}</span>
    <span v-if="$slots.default" class="ui-button__content"><slot /></span>
  </button>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  icon: { type: String, default: '' },
  iconOnly: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
})

defineEmits(['click'])
</script>

<style scoped>
.ui-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  transition: transform 0.2s var(--ease-out), background 0.2s var(--ease-out), border 0.2s var(--ease-out), opacity 0.2s var(--ease-out);
}

.ui-button:hover:not(:disabled) {
  transform: translateY(-0.5px);
}

.ui-button:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.ui-button--sm {
  min-height: 28px;
  padding: 0 10px;
  font-size: 11px;
}

.ui-button--md {
  min-height: 34px;
  padding: 0 13px;
  font-size: 12px;
}

.ui-button--lg {
  min-height: 40px;
  padding: 0 16px;
  font-size: 13px;
}

.ui-button--primary {
  color: var(--text-inverse);
  background: var(--accent);
  box-shadow: none;
}

.ui-button--secondary {
  color: var(--text-primary);
  border-color: var(--border-color);
  background: var(--control-bg);
}

.ui-button--ghost {
  color: var(--text-secondary);
  border-color: transparent;
  background: transparent;
}

.ui-button--danger {
  color: #fff;
  background: rgba(239, 68, 68, 0.13);
  border-color: rgba(239, 68, 68, 0.26);
}

.ui-button--icon-only {
  width: 34px;
  padding: 0;
}

.ui-button:disabled {
  opacity: 0.55;
}

.ui-button__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid color-mix(in srgb, currentColor 28%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>
