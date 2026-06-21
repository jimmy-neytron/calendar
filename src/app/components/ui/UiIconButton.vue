<template>
  <button
    class="ui-icon-button"
    :class="[`ui-icon-button--${size}`, `ui-icon-button--${variant}`]"
    type="button"
    :title="label"
    :aria-label="label"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <UiIcon :name="icon" />
  </button>
</template>

<script setup>
import UiIcon from './UiIcon.vue'

defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  size: { type: String, default: 'md' },
  variant: { type: String, default: 'neutral' },
  disabled: { type: Boolean, default: false },
})
defineEmits(['click'])
</script>

<style scoped>
.ui-icon-button {
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0;
  color: var(--text-secondary);
  background: var(--control-bg);
  line-height: 0;
  transition: .16s var(--ease-out);
}
.ui-icon-button--sm{width:28px;height:28px;font-size:14px}.ui-icon-button--md{width:34px;height:34px;font-size:17px}.ui-icon-button--lg{width:40px;height:40px;font-size:19px}
.ui-icon-button:hover:not(:disabled){border-color:var(--border-strong);color:var(--text-primary);background:var(--control-bg-hover);transform:translateY(-1px)}
.ui-icon-button--danger{color:var(--danger);background:color-mix(in srgb,var(--danger) 7%,var(--control-bg))}
.ui-icon-button--accent{color:var(--info);background:color-mix(in srgb,var(--info) 8%,var(--control-bg))}
.ui-icon-button:disabled{opacity:.45;cursor:not-allowed}
</style>
