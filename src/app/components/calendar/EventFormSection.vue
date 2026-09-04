<template>
  <section class="event-form-section">
    <button type="button" class="event-form-section__toggle" :aria-expanded="modelValue" :aria-controls="contentId" @click="$emit('update:modelValue', !modelValue)">
      <span><strong>{{ title }}</strong><small>{{ summary }}</small></span>
      <span aria-hidden="true">{{ modelValue ? '−' : '+' }}</span>
    </button>
    <div v-show="modelValue" :id="contentId" class="event-form-section__content"><slot /></div>
  </section>
</template>

<script setup lang="ts">
import { useId } from 'vue'
defineProps<{ modelValue: boolean; title: string; summary?: string }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
const contentId = useId()
</script>

<style scoped>
.event-form-section { min-width: 0; border: 1px solid var(--border-color); border-radius: 12px; }
.event-form-section__toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; text-align: left; color: var(--text-primary); background: transparent; border: 0; border-radius: 12px; cursor: pointer; }
.event-form-section__toggle:hover { background: var(--control-bg); }
.event-form-section__toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.event-form-section__toggle > span:first-child { min-width: 0; display: grid; gap: 4px; }
strong { font-size: 13px; }
small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted); font-size: 12px; }
.event-form-section__content { display: grid; gap: 12px; padding: 0 14px 14px; }
</style>
