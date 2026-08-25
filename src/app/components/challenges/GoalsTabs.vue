<template>
  <nav class="goals-tabs" aria-label="Разделы целей">
    <button v-for="tab in tabs" :key="tab.value" type="button" :class="{ active: active === tab.value }" @click="emit('select', tab.value)">{{ tab.label }}</button>
  </nav>
</template>

<script setup lang="ts">
type GoalsTab = 'goals' | 'records'

defineProps<{ active: GoalsTab }>()
const emit = defineEmits<{ select: [tab: GoalsTab] }>()

const tabs: { value: GoalsTab; label: string }[] = [
  { value: 'goals', label: 'Цели' },
  { value: 'records', label: 'Рекорды' },
]
</script>

<style scoped>
.goals-tabs { width: max-content; display: flex; gap: 3px; border: 1px solid var(--border-color); border-radius: 10px; padding: 3px; background: var(--control-bg); }
.goals-tabs button { border: 0; border-radius: 7px; padding: 7px 12px; color: var(--text-secondary); background: transparent; font-size: 10px; }
.goals-tabs button.active { color: var(--text-primary); background: var(--card-solid); }
</style>
