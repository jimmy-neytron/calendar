<template>
  <UiModal :model-value="modelValue" title="Записать результат" width="440px" @update:model-value="$emit('update:modelValue', $event)">
    <form class="result-form" @submit.prevent="submit">
      <header><strong>{{ challenge?.title }}</strong><span>{{ formattedDate }}</span></header>
      <label><span>Результат, {{ challenge?.unit || 'раз' }}</span><input ref="inputRef" v-model.number="value" type="number" min="0" step="any" required></label>
      <div class="result-form__quick">
        <button v-for="amount in suggestions" :key="amount" type="button" @click="value = amount">{{ amount }}</button>
      </div>
      <p v-if="previousValue">Было записано: {{ previousValue }} {{ challenge?.unit }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <footer><UiButton variant="secondary" @click="$emit('update:modelValue', false)">Отмена</UiButton><UiButton type="submit">Сохранить</UiButton></footer>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiModal from '../ui/UiModal.vue'
import { DateHelper } from '../../utils/date/dateHelper.js'

const props = defineProps<{ modelValue: boolean; challenge?: Record<string, unknown> | null; dateKey: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; save: [value: { date: string; value: number }] }>()
const value = ref<number | null>(null)
const error = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const dailyValues = computed(() => (props.challenge?.dailyValues || {}) as Record<string, number>)
const previousValue = computed(() => Number(dailyValues.value[props.dateKey] || 0))
const suggestions = computed(() => {
  const target = Number(props.challenge?.targetValue || 10)
  const days = Number(props.challenge?.targetDays || 30)
  if (props.challenge?.progressDirection === 'decrease') {
    const start = Number(props.challenge?.startValue || target)
    const range = Math.max(0, start - target)
    return [...new Set([start, start - range * .25, start - range * .5, target].map(roundValue))]
  }
  const base = props.challenge?.goalType === 'total' ? Math.max(1, Math.ceil(target / days)) : Math.max(1, Math.round(target * .75))
  return [...new Set([Math.max(1, Math.round(base * .75)), base, Math.max(1, Math.round(base * 1.25)), target])].slice(0, 4)
})
function roundValue(value: number) { return Math.round(value * 10) / 10 }
const formattedDate = computed(() => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(DateHelper.parseKey(props.dateKey)))
watch(() => props.modelValue, async (open) => {
  if (!open) return
  value.value = previousValue.value || suggestions.value[1] || suggestions.value[0]
  error.value = ''
  await nextTick()
  inputRef.value?.select()
})
function submit() {
  if (!value.value || value.value <= 0) { error.value = 'Укажи результат больше нуля'; return }
  emit('save', { date: props.dateKey, value: value.value })
}
</script>

<style scoped>
.result-form { display: grid; gap: 12px; }.result-form header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }.result-form header span, .result-form > p { color: var(--text-muted); font-size: 10px; }.result-form label { display: grid; gap: 6px; }.result-form label span { color: var(--text-secondary); font-size: 10px; font-weight: 700; }.result-form input { width: 100%; min-height: 52px; border: 1px solid var(--border-color); border-radius: 10px; padding: 0 14px; color: var(--text-primary); background: var(--field-bg); font-size: 22px; }.result-form__quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }.result-form__quick button { border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; color: var(--text-secondary); background: var(--control-bg); }.result-form__quick button:hover { border-color: var(--accent); }.result-form > p { margin: 0; }.result-form > p.error { color: var(--danger); }.result-form footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 12px; }
</style>
