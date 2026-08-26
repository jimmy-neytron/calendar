<template>
  <UiModal :model-value="modelValue" :title="holding ? 'Настроить позицию' : 'Добавить криптоактив'" width="620px" @update:model-value="emit('update:modelValue', $event)">
    <form class="holding-form" @submit.prevent="submit">
      <label class="holding-field"><span>Источник</span><UiSelect v-model="form.sourceId"><option v-for="source in sources" :key="source.id" :value="source.id">{{ source.name }}</option></UiSelect></label>

      <template>
        <div v-if="holding" class="replace-hint"><UiIcon name="refresh" /><span><strong>Можно заменить токен</strong><small>Найди другой актив ниже. Количество и сумма покупки сохранятся — их можно скорректировать перед сохранением.</small></span></div>
        <UiInput v-model="query" type="search" :label="holding ? 'Найти токен для замены' : 'Найти актив'" :placeholder="holding ? 'Название или тикер нового токена' : 'BTC, Bitcoin, USDT…'" />
        <div v-if="isSearching" class="holding-form__status">Ищу активы…</div>
        <div v-else-if="results.length" class="asset-results">
          <button v-for="item in results" :key="item.id" type="button" :class="{ active: form.assetId === item.id }" @click="selectCrypto(item)">
            <span>{{ item.symbol.slice(0, 3) }}</span><div><strong>{{ item.name }}</strong><small>{{ item.symbol }}<template v-if="item.rank"> · #{{ item.rank }}</template></small></div><UiIcon v-if="form.assetId === item.id" name="check" />
          </button>
        </div>
        <div v-else-if="query.length >= 2" class="holding-form__status">Ничего не найдено</div>
      </template>

      <div v-if="holding && isReplacing" class="replacement-preview">
        <span><small>Было</small><strong>{{ holding.name }} · {{ holding.symbol }}</strong></span><UiIcon name="right" /><span><small>Станет</small><strong>{{ form.name }} · {{ form.symbol }}</strong></span>
      </div>
      <div v-else-if="form.assetId" class="selected-asset"><span>{{ form.symbol.slice(0, 3) }}</span><div><small>{{ holding ? 'Текущий токен' : 'Выбранный актив' }}</small><strong>{{ form.name }} · {{ form.symbol }}</strong></div></div>
      <div class="holding-form__grid">
        <UiInput v-model="form.quantity" type="number" min="0" step="any" label="Количество" required />
        <div class="cost-field"><UiInput v-model="form.costAmount" type="number" min="0" step="any" label="Сумма покупки" placeholder="Необязательно" /><small>Сколько суммарно потрачено на эту позицию. Нужно только для расчёта прибыли.</small></div>
        <label class="holding-field"><span>Валюта вложений</span><UiSelect v-model="form.costCurrency"><option v-for="currency in fiatCurrencies" :key="currency.code" :value="currency.code">{{ currency.code }}</option></UiSelect></label>
        <UiInput v-model="form.network" label="Сеть" placeholder="Например, TRON или TON" />
      </div>
      <details class="holding-form__details"><summary>Адрес контракта</summary><UiInput v-model="form.contractAddress" label="Контракт токена" placeholder="Необязательно" /></details>
      <p v-if="error" class="holding-form__error">{{ error }}</p>
      <footer><UiButton type="button" variant="secondary" @click="emit('update:modelValue', false)">Отмена</UiButton><UiButton type="submit">{{ isReplacing ? 'Заменить токен' : 'Сохранить' }}</UiButton></footer>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { CryptoAssetSearchResult, InvestmentHolding, InvestmentSource } from '../../../types/investment'
import { searchCryptoAssets } from '../api/investmentMarket.api'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'

interface FormState { sourceId: string; assetId: string; name: string; symbol: string; network: string; contractAddress: string; quantity: number | string; costAmount: number | string; costCurrency: string }
const props = defineProps<{ modelValue: boolean; sources: InvestmentSource[]; holding?: InvestmentHolding | null; preferredSourceId?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; save: [payload: Omit<InvestmentHolding, 'id' | 'workspaceId' | 'userId' | 'createdAt' | 'updatedAt'>] }>()
const fiatCurrencies = [{ code: 'RUB', name: 'Российский рубль' }, { code: 'USD', name: 'Доллар США' }, { code: 'EUR', name: 'Евро' }, { code: 'CNY', name: 'Китайский юань' }, { code: 'KZT', name: 'Казахстанский тенге' }]
const form = reactive<FormState>(emptyForm())
const query = ref('')
const results = ref<CryptoAssetSearchResult[]>([])
const isSearching = ref(false)
const error = ref('')
const isReplacing = computed(() => Boolean(props.holding && form.assetId && form.assetId !== props.holding.assetId))
let timer = 0

watch(() => props.modelValue, (open) => {
  if (!open) return
  Object.assign(form, props.holding ? { ...props.holding, costAmount: props.holding.costAmount || '' } : emptyForm(props.preferredSourceId || props.sources[0]?.id))
  query.value = ''
  results.value = []
  error.value = ''
})
watch(query, (value) => {
  window.clearTimeout(timer)
  if (value.trim().length < 2) { results.value = []; return }
  timer = window.setTimeout(() => runSearch(value), 350)
})
async function runSearch(value: string) { isSearching.value = true; try { results.value = await searchCryptoAssets(value) } catch (caught) { error.value = caught instanceof Error ? caught.message : 'Ошибка поиска' } finally { isSearching.value = false } }
function selectCrypto(item: CryptoAssetSearchResult) {
  const assetChanged = form.assetId !== item.id
  Object.assign(form, { assetId: item.id, name: item.name, symbol: item.symbol, ...(assetChanged ? { network: '', contractAddress: '' } : {}) })
}
function submit() {
  const quantity = Number(form.quantity)
  if (!form.sourceId) { error.value = 'Сначала создай или выбери источник'; return }
  if (!form.assetId) { error.value = 'Выбери актив'; return }
  if (!Number.isFinite(quantity) || quantity <= 0) { error.value = 'Укажи количество больше нуля'; return }
  emit('save', { sourceId: form.sourceId, assetType: 'crypto', assetId: form.assetId, name: form.name, symbol: form.symbol, network: form.network.trim(), contractAddress: form.contractAddress.trim(), quantity, costAmount: Math.max(0, Number(form.costAmount) || 0), costCurrency: form.costCurrency })
}
function emptyForm(sourceId = ''): FormState { return { sourceId, assetId: '', name: '', symbol: '', network: '', contractAddress: '', quantity: '', costAmount: '', costCurrency: 'RUB' } }
</script>

<style scoped>
.holding-form { display: grid; gap: 13px; }.holding-field { display: grid; gap: 5px; }.holding-field > span { color: var(--text-secondary); font-size: 10px; font-weight: 700; }.replace-hint { display: grid; grid-template-columns: 32px 1fr; align-items: center; gap: 9px; border: 1px solid color-mix(in srgb, var(--info) 22%, var(--border-color)); border-radius: 10px; padding: 10px; color: var(--info); background: color-mix(in srgb, var(--info) 7%, var(--card-soft)); }.replace-hint > svg { font-size: 17px; }.replace-hint > span { display: grid; gap: 3px; }.replace-hint strong { color: var(--text-primary); font-size: 10px; }.replace-hint small { color: var(--text-muted); font-size: 8px; line-height: 1.45; }.asset-results { max-height: 220px; display: grid; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 10px; padding: 4px; }.asset-results button { display: grid; grid-template-columns: 34px 1fr 16px; align-items: center; gap: 9px; border: 0; border-radius: 8px; padding: 7px; color: inherit; background: transparent; text-align: left; }.asset-results button:hover, .asset-results button.active { background: var(--control-bg); }.asset-results button > span, .selected-asset > span { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; color: var(--accent); background: var(--accent-soft); font-size: 8px; font-weight: 900; }.asset-results button div { display: grid; gap: 2px; }.asset-results small, .selected-asset small { color: var(--text-muted); font-size: 8px; }.asset-results button > svg { color: var(--success); }.holding-form__status { padding: 14px; color: var(--text-muted); font-size: 10px; text-align: center; }.selected-asset { display: grid; grid-template-columns: 38px 1fr; align-items: center; gap: 9px; border: 1px solid var(--border-color); border-radius: 10px; padding: 9px; background: var(--card-soft); }.selected-asset div { display: grid; gap: 3px; }.replacement-preview { display: grid; grid-template-columns: 1fr 20px 1fr; align-items: center; gap: 8px; border: 1px solid color-mix(in srgb, var(--success) 25%, var(--border-color)); border-radius: 10px; padding: 10px 12px; background: color-mix(in srgb, var(--success) 7%, var(--card-soft)); }.replacement-preview > span { min-width: 0; display: grid; gap: 4px; }.replacement-preview small { color: var(--text-muted); font-size: 8px; }.replacement-preview strong { overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.replacement-preview > svg { color: var(--success); }.holding-form__grid { display: grid; grid-template-columns: 1fr 1fr; align-items: start; gap: 10px 9px; }.cost-field { display: grid; gap: 4px; }.cost-field > small { color: var(--text-muted); font-size: 8px; line-height: 1.35; }.holding-form__details { border-top: 1px solid var(--border-color); padding-top: 10px; }.holding-form__details summary { margin-bottom: 8px; color: var(--text-muted); font-size: 9px; cursor: pointer; }.holding-form__error { margin: 0; color: var(--danger); font-size: 10px; }.holding-form footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 12px; }
@media (max-width: 560px) { .holding-form__grid { grid-template-columns: 1fr; } }
</style>
