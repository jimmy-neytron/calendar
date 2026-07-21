<template>
  <UiSelect
    v-bind="$attrs"
    :model-value="modelValue"
    searchable
    :search-placeholder="searchPlaceholder"
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
  >
    <slot />
  </UiSelect>
</template>

<script setup>
import UiSelect from './UiSelect.vue'

defineOptions({ inheritAttrs: false })

defineProps({
  modelValue: { type: [String, Number], default: '' },
  searchPlaceholder: { type: String, default: 'Найти…' },
})

defineEmits(['update:modelValue', 'change'])
</script>