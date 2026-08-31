<template>
  <UiModal :model-value="modelValue" title="Записать результат" width="440px" @update:model-value="$emit('update:modelValue', $event)">
    <form class="result-form" @submit.prevent="submit">
      <header><strong>{{ challenge?.title }}</strong><span>{{ formattedDate }}</span></header>
      <label><span>{{ fieldLabel }}, {{ challenge?.unit || 'раз' }}</span><input ref="inputRef" v-model.number="value" type="number" min="0" step="any" required></label>
      <p class="result-form__hint">{{ hint }}</p>
      <div v-if="suggestions.length" class="result-form__quick">
        <button v-for="amount in suggestions" :key="amount" type="button" @click="value = amount">{{ amount }}</button>
      </div>
      <p v-if="previousValue !== null">За этот день записано: {{ previousValue }} {{ challenge?.unit }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <footer><UiButton v-if="previousValue !== null" variant="danger" class="result-form__delete" @click="$emit('remove', dateKey)">Удалить запись</UiButton><UiButton variant="secondary" @click="$emit('update:modelValue', false)">Отмена</UiButton><UiButton type="submit">Сохранить</UiButton></footer>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiModal from '../ui/UiModal.vue'
import { DateHelper } from '../../utils/date/dateHelper.js'
import { getInitialResult, getRecordedResult, getResultSuggestions, type ResultChallenge } from '../../utils/challenges/challengeResult'

const props = defineProps<{ modelValue: boolean; challenge?: ResultChallenge | null; dateKey: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; save: [value: { date: string; value: number }]; remove: [date: string] }>()
const value = ref<number | null>(null)
const error = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const previousValue = computed(() => getRecordedResult(props.challenge, props.dateKey))
const suggestions = computed(() => getResultSuggestions(props.challenge, props.dateKey))
const fieldLabel = computed(() => props.challenge?.progressDirection === 'decrease' ? 'Фактическое значение' : 'Результат')
const hint = computed(() => props.challenge?.progressDirection === 'decrease'
  ? 'Введи реальное значение на эту дату. Целевое значение не подставляется автоматически.'
  : props.challenge?.goalType === 'total' ? 'Укажи, сколько сделано именно за этот день.' : 'Укажи фактический результат на эту дату.')
const formattedDate = computed(() => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(DateHelper.parseKey(props.dateKey)))
watch(() => props.modelValue, async (open) => {
  if (!open) return
  value.value = getInitialResult(props.challenge, props.dateKey)
  error.value = ''
  await nextTick()
  inputRef.value?.select()
})
function submit() {
  const result = Number(value.value)
  if (!Number.isFinite(result) || result <= 0) { error.value = 'Укажи результат больше нуля'; return }
  emit('save', { date: props.dateKey, value: result })
}
</script>

<style scoped>
.result-form { display: grid; gap: 12px; }.result-form header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }.result-form header span, .result-form > p { color: var(--text-muted); font-size: 10px; }.result-form label { display: grid; gap: 6px; }.result-form label span { color: var(--text-secondary); font-size: 10px; font-weight: 700; }.result-form input { width: 100%; min-height: 52px; border: 1px solid var(--border-color); border-radius: 10px; padding: 0 14px; color: var(--text-primary); background: var(--field-bg); font-size: 22px; }.result-form__hint { margin: -5px 0 0 !important; line-height: 1.45; }.result-form__quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }.result-form__quick button { border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; color: var(--text-secondary); background: var(--control-bg); }.result-form__quick button:hover { border-color: var(--accent); }.result-form > p { margin: 0; }.result-form > p.error { color: var(--danger); }.result-form footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 12px; }.result-form__delete { margin-right: auto; }
</style>
