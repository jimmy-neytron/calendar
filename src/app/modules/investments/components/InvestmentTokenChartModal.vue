<template>
  <UiModal :model-value="modelValue" :title="asset ? `${asset.name} · ${asset.symbol}` : 'График токена'" eyebrow="История цены" width="780px" @update:model-value="emit('update:modelValue', $event)">
    <div class="token-chart">
      <header class="token-chart__toolbar">
        <div class="token-chart__periods" aria-label="Период графика">
          <button v-for="item in periods" :key="item.value" type="button" :class="{ active: period === item.value }" @click="period = item.value">{{ item.label }}</button>
        </div>
        <span v-if="fetchedAt">{{ fromCache ? 'Из кэша' : 'Обновлено' }} {{ formatDateTime(fetchedAt) }}</span>
      </header>

      <div v-if="isLoading" class="token-chart__state"><UiIcon name="refresh" /><strong>Загружаю историю…</strong></div>
      <div v-else-if="error" class="token-chart__state token-chart__state--error"><UiIcon name="warning" /><strong>{{ error }}</strong></div>
      <template v-else>
        <section class="token-chart__summary">
          <article><small>Цена</small><strong>{{ formatMoney(summary.current) }}</strong></article>
          <article><small>Изменение</small><strong :class="changeClass(summary.change)">{{ signedMoney(summary.change) }}</strong><em :class="changeClass(summary.percent)">{{ signedPercent(summary.percent) }}</em></article>
          <article><small>Минимум</small><strong>{{ formatMoney(summary.minimum) }}</strong></article>
          <article><small>Максимум</small><strong>{{ formatMoney(summary.maximum) }}</strong></article>
        </section>
        <InvestmentHistoryChart :points="chartPoints" currency="USD" empty-text="За выбранный период данных пока нет." />
      </template>

      <footer>Дневные цены в USD · один запрос на токен не чаще одного раза в 12 часов</footer>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import type { InvestmentPricePoint } from '../../../types/investment'
import { loadCryptoPriceHistory } from '../api/investmentMarket.api'
import InvestmentHistoryChart from './InvestmentHistoryChart.vue'

type Period = 'week' | 'month' | 'year'
interface ChartAsset { assetId: string; name: string; symbol: string }

const props = defineProps<{ modelValue: boolean; asset: ChartAsset | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const periods: Array<{ value: Period; label: string; days: number }> = [
  { value: 'week', label: 'Неделя', days: 7 },
  { value: 'month', label: 'Месяц', days: 30 },
  { value: 'year', label: 'Год', days: 365 },
]
const period = ref<Period>('month')
const points = ref<InvestmentPricePoint[]>([])
const fetchedAt = ref('')
const fromCache = ref(false)
const isLoading = ref(false)
const error = ref('')
let activeRequest = 0

const visiblePoints = computed(() => {
  const days = periods.find((item) => item.value === period.value)?.days || 30
  const startsAt = Date.now() - days * 24 * 60 * 60 * 1000
  return points.value.filter((point) => new Date(point.timestamp).getTime() >= startsAt)
})
const chartPoints = computed(() => visiblePoints.value.map((point) => ({ key: point.timestamp.slice(0, 10), value: point.priceUsd })))
const summary = computed(() => {
  const values = visiblePoints.value.map((point) => point.priceUsd)
  const first = values[0] || 0
  const current = values.at(-1) || 0
  const change = current - first
  return {
    current,
    change,
    percent: first > 0 ? change / first * 100 : 0,
    minimum: values.length ? Math.min(...values) : 0,
    maximum: values.length ? Math.max(...values) : 0,
  }
})

watch([() => props.modelValue, () => props.asset?.assetId], async ([isOpen, assetId]) => {
  if (!isOpen || !assetId) return
  const request = ++activeRequest
  isLoading.value = true
  error.value = ''
  try {
    const history = await loadCryptoPriceHistory(assetId)
    if (request !== activeRequest) return
    points.value = history.points
    fetchedAt.value = history.fetchedAt
    fromCache.value = history.fromCache
  } catch (reason) {
    if (request === activeRequest) error.value = reason instanceof Error ? reason.message : 'Не удалось загрузить график'
  } finally {
    if (request === activeRequest) isLoading.value = false
  }
})

function formatMoney(value: number) { return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: value < 1 ? 6 : 2 }).format(value || 0) }
function signedMoney(value: number) { return `${value > 0 ? '+' : ''}${formatMoney(value)}` }
function signedPercent(value: number) { return `${value > 0 ? '+' : ''}${(value || 0).toFixed(2)}%` }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)).replace('.', '') }
function changeClass(value: number) { return value > 0 ? 'positive' : value < 0 ? 'negative' : '' }
</script>

<style scoped>
.token-chart { display: grid; gap: 14px; }.token-chart__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.token-chart__toolbar > span, .token-chart > footer { color: var(--text-muted); font-size: 8px; }.token-chart__periods { display: flex; gap: 3px; border: 1px solid var(--border-color); border-radius: 10px; padding: 3px; background: var(--control-bg); }.token-chart__periods button { border: 0; border-radius: 7px; padding: 7px 13px; color: var(--text-muted); background: transparent; font-size: 9px; }.token-chart__periods button.active { color: var(--text-primary); background: var(--card-solid); box-shadow: var(--shadow-sm); }.token-chart__summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }.token-chart__summary article { min-width: 0; display: grid; gap: 5px; border: 1px solid var(--border-color); border-radius: 11px; padding: 11px; background: var(--control-bg); }.token-chart__summary small { color: var(--text-muted); font-size: 8px; }.token-chart__summary strong { overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }.token-chart__summary em { font-size: 8px; font-style: normal; }.token-chart__state { min-height: 330px; display: grid; place-items: center; align-content: center; gap: 9px; color: var(--text-muted); }.token-chart__state strong { font-size: 10px; }.token-chart__state--error { color: var(--danger); }.token-chart > footer { border-top: 1px solid var(--border-color); padding-top: 10px; text-align: center; }.positive { color: var(--success) !important; }.negative { color: var(--danger) !important; }
@media (max-width: 650px) { .token-chart__toolbar { align-items: flex-start; flex-direction: column; }.token-chart__summary { grid-template-columns: repeat(2, 1fr); } }
</style>
