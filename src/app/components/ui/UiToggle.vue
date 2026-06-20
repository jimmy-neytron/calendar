<template>
  <button class="ui-toggle" :class="{ 'ui-toggle--active': modelValue }" type="button" @click="$emit('update:modelValue', !modelValue)">
    <span />
  </button>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.ui-toggle {
  width: 42px;
  height: 24px;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  background: var(--field-bg-focus);
  transition: all 0.2s var(--ease-out);
}

.ui-toggle span {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s var(--ease-out);
}

.ui-toggle--active {
  background: var(--accent);
}

.ui-toggle--active span {
  transform: translateX(22px);
}
</style>
