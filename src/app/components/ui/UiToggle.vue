<template>
  <button
    class="ui-toggle"
    :class="{ 'ui-toggle--checked': modelValue }"
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label || (modelValue ? 'Выключить' : 'Включить')"
    :disabled="disabled"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span class="ui-toggle__slider">
      <span class="ui-toggle__handle" />
    </span>
  </button>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: '' },
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.ui-toggle {
  display: inline-flex;
  align-items: center;
  width: 44px;
  height: 26px;
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  padding: 0;
  background: transparent;
  outline: 0;
  vertical-align: middle;
  -webkit-tap-highlight-color: transparent;
}

.ui-toggle__slider {
  position: relative;
  display: block;
  width: 44px;
  height: 26px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: var(--bg-hover);
  transition:
    background-color .2s var(--ease-out),
    border-color .2s var(--ease-out),
    box-shadow .2s var(--ease-out);
}

.ui-toggle__handle {
  position: absolute;
  top: 50%;
  left: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .38);
  transform: translateY(-50%);
  transition: transform .22s var(--ease-out);
}

.ui-toggle--checked .ui-toggle__slider {
  border-color: var(--accent);
  background: var(--accent);
}

.ui-toggle--checked .ui-toggle__handle {
  transform: translate(18px, -50%);
}

.ui-toggle:hover:not(:disabled) .ui-toggle__slider {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border-strong));
}

.ui-toggle:focus-visible .ui-toggle__slider {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--info) 24%, transparent);
}

.ui-toggle:active:not(:disabled) .ui-toggle__handle {
  width: 20px;
}

.ui-toggle--checked:active:not(:disabled) .ui-toggle__handle {
  transform: translate(16px, -50%);
}

.ui-toggle:disabled {
  cursor: not-allowed;
  opacity: .5;
}

html[data-theme='light'] .ui-toggle__slider {
  background: var(--bg-secondary);
}

html[data-theme='light'] .ui-toggle--checked .ui-toggle__slider {
  background: var(--accent);
}

@media (prefers-reduced-motion: reduce) {
  .ui-toggle__slider,
  .ui-toggle__handle {
    transition: none;
  }
}
</style>
