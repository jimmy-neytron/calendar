<template>
  <UiModal :model-value="modelValue" title="Заменить токен" width="560px" @update:model-value="emit('update:modelValue', $event)">
    <form class="replace-token" @submit.prevent="submit">
      <div v-if="holding" class="current-token">
        <span>{{ holding.symbol.slice(0, 3) }}</span>
        <div><small>Сейчас в позиции</small><strong>{{ holding.name }} · {{ holding.symbol }}</strong><em>{{ formatQuantity(holding.quantity) }} {{ holding.symbol }}</em></div>
      </div>

      <div class="replace-token__notice"><UiIcon name="refresh" /><span>Количество, источник и сумма покупки сохранятся. Изменится только сам токен.</span></div>

      <UiInput v-model="query" type="search" label="Новый токен" placeholder="Например: Bitcoin, BTC или USDT" />
      <div class="token-results" aria-live="polite">
        <div v-if="isSearching" class="token-status">Ищу токены…</div>
        <button v-for="item in visibleResults" v-else :key="item.id" type="button" :class="{ selected: selected?.id === item.id }" @click="selected = item">
          <span>{{ item.symbol.slice(0, 3) }}</span>
          <div><strong>{{ item.name }}</strong><small>{{ item.symbol }}<template v-if="item.rank"> · рейтинг #{{ item.rank }}</template></small></div>
          <UiIcon :name="selected?.id === item.id ? 'check' : 'right'" />
        </button>
        <div v-if="!isSearching && !visibleResults.length" class="token-status">Ничего не найдено. Попробуй название или тикер.</div>
      </div>

      <div v-if="holding && selected" class="replacement-summary">
        <span><small>Было</small><strong>{{ holding.symbol }}</strong></span>
        <UiIcon name="right" />
        <span><small>Будет</small><strong>{{ selected.symbol }}</strong></span>
      </div>

      <p v-if="error" class="replace-token__error">{{ error }}</p>
      <footer>
        <UiButton type="button" variant="secondary" @click="emit('update:modelValue', false)">Отмена</UiButton>
        <UiButton type="submit" :disabled="!canReplace">Заменить на {{ selected?.symbol || 'другой токен' }}</UiButton>
      </footer>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import type { CryptoAssetSearchResult, InvestmentHolding } from '../../../types/investment'
import { searchCryptoAssets } from '../api/investmentMarket.api'

const props = defineProps<{ modelValue: boolean; holding?: InvestmentHolding | null }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  replace: [asset: CryptoAssetSearchResult]
}>()

const popularAssets: CryptoAssetSearchResult[] = [
  { id: 'btc-bitcoin', name: 'Bitcoin', symbol: 'BTC', rank: 1, type: 'coin' },
  { id: 'eth-ethereum', name: 'Ethereum', symbol: 'ETH', rank: 2, type: 'coin' },
  { id: 'usdt-tether', name: 'Tether', symbol: 'USDT', rank: 3, type: 'token' },
  { id: 'usdc-usd-coin', name: 'USDC', symbol: 'USDC', rank: 6, type: 'token' },
  { id: 'bnb-binance-coin', name: 'BNB', symbol: 'BNB', rank: 5, type: 'coin' },
  { id: 'sol-solana', name: 'Solana', symbol: 'SOL', rank: 7, type: 'coin' },
  { id: 'xrp-xrp', name: 'XRP', symbol: 'XRP', rank: 4, type: 'coin' },
  { id: 'toncoin-the-open-network', name: 'Toncoin', symbol: 'TON', rank: 12, type: 'coin' },
  { id: 'doge-dogecoin', name: 'Dogecoin', symbol: 'DOGE', rank: 8, type: 'coin' },
]
const query = ref('')
const results = ref<CryptoAssetSearchResult[]>([])
const selected = ref<CryptoAssetSearchResult | null>(null)
const isSearching = ref(false)
const error = ref('')
let searchTimer = 0
let searchRequest = 0

const visibleResults = computed(() => {
  const normalized = query.value.trim().toLocaleLowerCase('ru-RU')
  const source = normalized.length >= 2 && results.value.length ? results.value : popularAssets
  return source.filter((item) => item.id !== props.holding?.assetId && (!normalized || `${item.name} ${item.symbol}`.toLocaleLowerCase('ru-RU').includes(normalized))).slice(0, 12)
})
const canReplace = computed(() => Boolean(props.holding && selected.value && selected.value.id !== props.holding.assetId))

watch(() => props.modelValue, (open) => {
  if (!open) return
  query.value = ''
  results.value = []
  selected.value = null
  error.value = ''
})
watch(query, (value) => {
  window.clearTimeout(searchTimer)
  error.value = ''
  if (value.trim().length < 2) { results.value = []; isSearching.value = false; return }
  searchTimer = window.setTimeout(() => runSearch(value), 250)
})

async function runSearch(value: string) {
  const requestId = ++searchRequest
  isSearching.value = true
  try {
    const found = await searchCryptoAssets(value)
    if (requestId === searchRequest) results.value = found
  } catch {
    if (requestId === searchRequest) {
      results.value = []
      error.value = 'Онлайн-поиск временно недоступен. Популярные токены можно выбрать из списка.'
    }
  } finally {
    if (requestId === searchRequest) isSearching.value = false
  }
}
function submit() {
  if (!selected.value || !canReplace.value) return
  emit('replace', selected.value)
}
function formatQuantity(value: number) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 8 }).format(value) }
</script>

<style scoped>
.replace-token { display: grid; gap: 13px; }
.current-token { display: grid; grid-template-columns: 44px 1fr; align-items: center; gap: 11px; border: 1px solid var(--border-color); border-radius: 12px; padding: 11px; background: var(--card-soft); }
.current-token > span, .token-results button > span { display: grid; place-items: center; border-radius: 11px; color: var(--info); background: color-mix(in srgb, var(--info) 10%, var(--control-bg)); font-size: 9px; font-weight: 900; }
.current-token > span { width: 42px; height: 42px; }
.current-token > div { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 3px 10px; }
.current-token small { grid-column: 1 / -1; color: var(--text-muted); font-size: 8px; }
.current-token strong { font-size: 11px; }.current-token em { color: var(--text-secondary); font-size: 9px; font-style: normal; }
.replace-token__notice { display: flex; align-items: center; gap: 8px; border-radius: 9px; padding: 9px 10px; color: var(--text-secondary); background: color-mix(in srgb, var(--info) 7%, var(--control-bg)); font-size: 9px; line-height: 1.45; }.replace-token__notice > svg { flex: 0 0 auto; color: var(--info); }
.token-results { max-height: 260px; display: grid; gap: 3px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 11px; padding: 4px; }
.token-results button { display: grid; grid-template-columns: 36px 1fr 18px; align-items: center; gap: 9px; border: 1px solid transparent; border-radius: 8px; padding: 7px; color: inherit; background: transparent; text-align: left; }
.token-results button:hover { background: var(--control-bg); }.token-results button.selected { border-color: color-mix(in srgb, var(--success) 28%, var(--border-color)); background: color-mix(in srgb, var(--success) 8%, var(--control-bg)); }
.token-results button > span { width: 34px; height: 34px; }.token-results button > div { display: grid; gap: 3px; }.token-results strong { font-size: 10px; }.token-results small { color: var(--text-muted); font-size: 8px; }.token-results button > svg { color: var(--text-muted); }.token-results button.selected > svg { color: var(--success); }
.token-status { padding: 20px; color: var(--text-muted); font-size: 9px; text-align: center; }
.replacement-summary { display: grid; grid-template-columns: 1fr 22px 1fr; align-items: center; gap: 8px; border: 1px solid color-mix(in srgb, var(--success) 24%, var(--border-color)); border-radius: 11px; padding: 10px 12px; background: color-mix(in srgb, var(--success) 7%, var(--card-soft)); }.replacement-summary span { display: grid; gap: 3px; }.replacement-summary span:last-child { text-align: right; }.replacement-summary small { color: var(--text-muted); font-size: 8px; }.replacement-summary strong { font-size: 12px; }.replacement-summary > svg { color: var(--success); }
.replace-token__error { margin: 0; color: var(--warning); font-size: 9px; }.replace-token footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 12px; }
</style>
