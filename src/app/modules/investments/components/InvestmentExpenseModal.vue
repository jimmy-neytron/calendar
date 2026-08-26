<template>
  <UiModal :model-value="modelValue" title="Списать средства" width="560px" @update:model-value="emit('update:modelValue', $event)">
    <form class="expense-form" @submit.prevent="submit">
      <label class="expense-field"><span>Актив и источник</span><UiSelect v-model="form.holdingId"><option value="" disabled>Выбери позицию</option><option v-for="item in holdings" :key="item.id" :value="item.id">{{ item.name }} · {{ formatQuantity(item.quantity) }} {{ item.symbol }} · {{ sourceName(item.sourceId) }}</option></UiSelect></label>

      <div v-if="selectedHolding" class="expense-balance"><span>{{ selectedHolding.symbol.slice(0, 3) }}</span><div><small>Доступно</small><strong>{{ formatQuantity(selectedHolding.quantity) }} {{ selectedHolding.symbol }}</strong></div><button type="button" @click="form.quantity = selectedHolding.quantity">Списать всё</button></div>

      <UiInput v-model="form.quantity" type="number" min="0" :max="selectedHolding?.quantity" step="any" :label="selectedHolding ? `Сколько списать, ${selectedHolding.symbol}` : 'Сколько списать'" placeholder="0" required />

      <div><span class="expense-form__label">Назначение</span><div class="expense-categories"><button v-for="category in categories" :key="category.value" type="button" :class="{ active: form.category === category.value }" @click="form.category = category.value"><UiIcon :name="category.icon" />{{ category.label }}</button></div></div>

      <div class="expense-form__grid"><UiInput v-model="form.spentOn" type="date" label="Дата" required /><UiInput v-model="form.note" label="Комментарий" placeholder="Например, оплата покупки" /></div>
      <p class="expense-form__hint">Остаток актива уменьшится, а операция сохранится в истории.</p>
      <p v-if="error" class="expense-form__error">{{ error }}</p>
      <footer><UiButton type="button" variant="secondary" @click="emit('update:modelValue', false)">Отмена</UiButton><UiButton type="submit">Списать</UiButton></footer>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import type { InvestmentExpenseCategory, InvestmentHolding, InvestmentSource } from '../../../types/investment'

interface ExpenseForm { holdingId: string; quantity: number | string; category: InvestmentExpenseCategory; spentOn: string; note: string }
interface ExpensePayload extends ExpenseForm { quantity: number; valueRub: number; valueUsd: number }

const props = defineProps<{ modelValue: boolean; holdings: InvestmentHolding[]; sources: InvestmentSource[]; preferredHoldingId?: string; prices: Record<string, { rub: number; usd: number }> }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; save: [payload: ExpensePayload] }>()
const categories: Array<{ value: InvestmentExpenseCategory; label: string; icon: string }> = [{ value: 'purchase', label: 'Покупка', icon: 'wallet' }, { value: 'transfer', label: 'Перевод', icon: 'activity' }, { value: 'fee', label: 'Комиссия', icon: 'chart' }, { value: 'other', label: 'Другое', icon: 'grid' }]
const form = reactive<ExpenseForm>(emptyForm())
const error = ref('')
const selectedHolding = computed(() => props.holdings.find((item) => item.id === form.holdingId))

watch(() => props.modelValue, (open) => { if (!open) return; Object.assign(form, emptyForm(props.preferredHoldingId || '')); error.value = '' })

function submit() {
  const holding = selectedHolding.value
  const quantity = Number(form.quantity)
  if (!holding) { error.value = 'Выбери актив'; return }
  if (!Number.isFinite(quantity) || quantity <= 0) { error.value = 'Укажи сумму больше нуля'; return }
  if (quantity > holding.quantity) { error.value = `Доступно только ${formatQuantity(holding.quantity)} ${holding.symbol}`; return }
  const price = props.prices[holding.id] || { rub: 0, usd: 0 }
  emit('save', { ...form, quantity, note: form.note.trim(), valueRub: quantity * price.rub, valueUsd: quantity * price.usd })
}
function sourceName(id: string) { return props.sources.find((item) => item.id === id)?.name || 'Источник удалён' }
function formatQuantity(value: number) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 8 }).format(value) }
function emptyForm(holdingId = ''): ExpenseForm { return { holdingId, quantity: '', category: 'purchase', spentOn: new Date().toISOString().slice(0, 10), note: '' } }
</script>

<style scoped>
.expense-form { display: grid; gap: 14px; }.expense-field { display: grid; gap: 5px; }.expense-field > span, .expense-form__label { display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 10px; font-weight: 700; }.expense-balance { display: grid; grid-template-columns: 38px 1fr auto; align-items: center; gap: 9px; border: 1px solid var(--border-color); border-radius: 10px; padding: 9px; background: var(--card-soft); }.expense-balance > span { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; color: var(--accent); background: var(--accent-soft); font-size: 8px; font-weight: 900; }.expense-balance > div { display: grid; gap: 2px; }.expense-balance small { color: var(--text-muted); font-size: 8px; }.expense-balance button { border: 0; padding: 5px; color: var(--accent); background: transparent; font-size: 9px; }.expense-categories { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }.expense-categories button { display: flex; align-items: center; justify-content: center; gap: 5px; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 5px; color: var(--text-muted); background: var(--control-bg); font-size: 9px; }.expense-categories button.active { border-color: var(--accent-border); color: var(--text-primary); background: var(--accent-soft); }.expense-form__grid { display: grid; grid-template-columns: 1fr 1.5fr; align-items: start; gap: 9px; }.expense-form__hint { margin: -5px 0 0; color: var(--text-muted); font-size: 9px; }.expense-form__error { margin: 0; color: var(--danger); font-size: 10px; }.expense-form footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 12px; }
@media (max-width: 520px) { .expense-categories { grid-template-columns: repeat(2, 1fr); }.expense-form__grid { grid-template-columns: 1fr; } }
</style>
