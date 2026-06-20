<template>
  <button
    class="ui-chip"
    :class="[`ui-chip--${color}`, { 'ui-chip--selected': selected, 'ui-chip--clickable': clickable }]"
    type="button"
    :disabled="!clickable"
    @click="$emit('click', $event)"
  >
    <span v-if="dot" class="ui-chip__dot" :style="{ background: dot }" />
    {{ label }}
  </button>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  color: { type: String, default: 'default' },
  clickable: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  dot: { type: String, default: '' },
})

defineEmits(['click'])
</script>

<style scoped>
.ui-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 0 9px;
  color: var(--text-secondary);
  background: var(--control-bg);
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s var(--ease-out);
}

.ui-chip--clickable:hover,
.ui-chip--selected {
  color: var(--text-primary);
  border-color: var(--accent-border);
  background: var(--accent-soft);
  transform: translateY(-0.5px);
}

.ui-chip__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
</style>
