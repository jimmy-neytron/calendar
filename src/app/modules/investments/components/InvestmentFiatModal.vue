<template>
  <UiModal :model-value="modelValue" :title="holding ? 'Изменить валюту' : 'Добавить валюту'" width="520px" @update:model-value="emit('update:modelValue', $event)">
    <form class="fiat-form" @submit.prevent="submit">
      <label class="fiat-field"><span>Где хранится</span><UiSelect v-model="form.sourceId"><option v-for="source in sources" :key="source.id" :value="source.id">{{ source.name }}</option></UiSelect></label>

      <div>
        <span class="fiat-form__label">Валюта</span>
        <div class="fiat-options">
          <button v-for="currency in fiatCurrencies" :key="currency.code" type="button" :class="{ active: form.assetId === currency.code }" @click="selectCurrency(currency)">
            <strong>{{ currency.code }}</strong><span>{{ currency.name }}</span><UiIcon v-if="form.assetId === currency.code" name="check" />
          </button>
        </div>
      </div>

      <UiInput v-model="form.quantity" type="number" min="0" step="any" :label="form.symbol ? `Сумма в ${form.symbol}` : 'Сумма'" placeholder="0" required />
      <p class="fiat-form__hint">Укажи текущий остаток. Курс и стоимость портфеля рассчитаются автоматически.</p>
      <p v-if="error" class="fiat-form__error">{{ error }}</p>
      <footer><UiButton type="button" variant="secondary" @click="emit('update:modelValue', false)">Отмена</UiButton><UiButton type="submit">Сохранить</UiButton></footer>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import type { InvestmentHolding, InvestmentSource } from '../../../types/investment'

interface CurrencyOption { code: string; name: string }
interface FiatForm { sourceId: string; assetId: string; name: string; symbol: string; quantity: number | string }

const props = defineProps<{ modelValue: boolean; sources: InvestmentSource[]; holding?: InvestmentHolding | null; preferredSourceId?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; save: [payload: Omit<InvestmentHolding, 'id' | 'workspaceId' | 'userId' | 'createdAt' | 'updatedAt'>] }>()
const fiatCurrencies: CurrencyOption[] = [{ code: 'RUB', name: 'Российский рубль' }, { code: 'USD', name: 'Доллар США' }, { code: 'EUR', name: 'Евро' }, { code: 'CNY', name: 'Китайский юань' }, { code: 'KZT', name: 'Казахстанский тенге' }]
const form = reactive<FiatForm>(emptyForm())
const error = ref('')

watch(() => props.modelValue, (open) => {
  if (!open) return
  Object.assign(form, props.holding ? { sourceId: props.holding.sourceId, assetId: props.holding.assetId, name: props.holding.name, symbol: props.holding.symbol, quantity: props.holding.quantity } : emptyForm(props.preferredSourceId || props.sources[0]?.id))
  error.value = ''
})

function selectCurrency(currency: CurrencyOption) { Object.assign(form, { assetId: currency.code, name: currency.name, symbol: currency.code }) }
function submit() {
  const quantity = Number(form.quantity)
  if (!form.sourceId) { error.value = 'Выбери источник'; return }
  if (!form.assetId) { error.value = 'Выбери валюту'; return }
  if (!Number.isFinite(quantity) || quantity <= 0) { error.value = 'Укажи сумму больше нуля'; return }
  emit('save', { sourceId: form.sourceId, assetType: 'fiat', assetId: form.assetId, name: form.name, symbol: form.symbol, network: '', contractAddress: '', quantity, costAmount: 0, costCurrency: form.symbol })
}
function emptyForm(sourceId = ''): FiatForm { return { sourceId, assetId: '', name: '', symbol: '', quantity: '' } }
</script>

<style scoped>
.fiat-form { display: grid; gap: 14px; }.fiat-field { display: grid; gap: 5px; }.fiat-field > span, .fiat-form__label { display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 10px; font-weight: 700; }
.fiat-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }.fiat-options button { position: relative; min-height: 58px; display: grid; gap: 3px; border: 1px solid var(--border-color); border-radius: 10px; padding: 9px; color: inherit; background: var(--control-bg); text-align: left; }.fiat-options button:hover, .fiat-options button.active { border-color: var(--accent-border); background: var(--accent-soft); }.fiat-options strong { font-size: 12px; }.fiat-options span { color: var(--text-muted); font-size: 8px; }.fiat-options svg { position: absolute; top: 8px; right: 8px; color: var(--success); }
.fiat-form__hint { margin: -6px 0 0; color: var(--text-muted); font-size: 9px; }.fiat-form__error { margin: 0; color: var(--danger); font-size: 10px; }.fiat-form footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 12px; }
@media (max-width: 480px) { .fiat-options { grid-template-columns: repeat(2, 1fr); } }
</style>
