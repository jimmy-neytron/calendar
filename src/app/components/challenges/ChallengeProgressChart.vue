<template>
  <section class="challenge-chart panel">
    <header>
      <div><h3>Динамика</h3><p>{{ description }}</p></div>
      <div class="challenge-chart__current"><strong>{{ formatValue(progress.current) }} {{ challenge.unit }}</strong><span>цель {{ formatValue(progress.target) }} {{ challenge.unit }}</span></div>
    </header>
    <div v-if="isDecrease && points.length" class="challenge-chart__changes">
      <strong :class="totalChangeTone">{{ totalChangeLabel }}</strong>
      <span>{{ previousChangeLabel }}</span>
    </div>
    <div v-if="points.length" class="challenge-chart__canvas"><Line :data="chartData" :options="chartOptions" /></div>
    <p v-else class="challenge-chart__empty">Отметь первый день — здесь появится динамика.</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js'
import { Line } from 'vue-chartjs'
import { buildChallengeChart, getChallengeProgress, type ProgressChallenge } from '../../utils/challenges/challengeProgress'

ChartJS.register(CategoryScale, Legend, LinearScale, LineElement, PointElement, Tooltip)
const props = defineProps<{ challenge: ProgressChallenge & { color?: string; unit?: string } }>()
const progress = computed(() => getChallengeProgress(props.challenge))
const points = computed(() => buildChallengeChart(props.challenge))
const isDecrease = computed(() => props.challenge.goalType === 'best' && props.challenge.progressDirection === 'decrease')
const description = computed(() => props.challenge.goalType === 'total' ? 'Накопительный результат' : props.challenge.goalType === 'best' ? 'Результаты по дням' : 'Отмеченные выполнения')
const measuredValues = computed(() => points.value.map((item) => item.value).filter((value) => Number.isFinite(value) && value > 0))
const startValue = computed(() => Number(props.challenge.startValue) || measuredValues.value[0] || progress.value.current)
const totalChange = computed(() => startValue.value - progress.value.current)
const previousChange = computed(() => {
  const values = measuredValues.value
  return values.length > 1 ? values.at(-2)! - values.at(-1)! : 0
})
const totalChangeTone = computed(() => totalChange.value > 0 ? 'positive' : totalChange.value < 0 ? 'negative' : '')
const totalChangeLabel = computed(() => totalChange.value > 0
  ? `Сброшено ${formatValue(totalChange.value)} ${props.challenge.unit}`
  : totalChange.value < 0 ? `Набрано ${formatValue(Math.abs(totalChange.value))} ${props.challenge.unit}` : 'Пока без изменений')
const previousChangeLabel = computed(() => previousChange.value === 0
  ? 'Без изменений к прошлому замеру'
  : `${formatSigned(-previousChange.value)} ${props.challenge.unit} к прошлому замеру`)
const decreaseScale = computed(() => {
  const values = measuredValues.value
  if (!values.length) return {}
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const padding = Math.max(.3, (maximum - minimum) * .35)
  return { min: roundDown(minimum - padding), max: roundUp(maximum + padding) }
})
const chartData = computed(() => ({
  labels: points.value.map((item) => item.label),
  datasets: [
    { label: 'Результат', data: points.value.map((item) => item.value), borderColor: props.challenge.color || '#a78bfa', backgroundColor: 'transparent', pointBackgroundColor: props.challenge.color || '#a78bfa', borderWidth: 2, pointRadius: 3, tension: .25 },
    ...(!isDecrease.value ? [{ label: 'Цель', data: points.value.map(() => progress.value.target), borderColor: 'rgba(148,163,184,.55)', backgroundColor: 'transparent', pointRadius: 0, borderWidth: 1, borderDash: [5, 5] }] : []),
  ],
}))
const chartOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
  plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: {
    label: (context: { datasetIndex: number; formattedValue: string }) => context.datasetIndex ? `Цель: ${context.formattedValue}` : `Результат: ${context.formattedValue} ${props.challenge.unit || ''}`.trim(),
    afterLabel: (context: { datasetIndex: number; dataIndex: number }) => {
      if (!isDecrease.value || context.datasetIndex || context.dataIndex === 0) return ''
      const change = measuredValues.value[context.dataIndex] - measuredValues.value[context.dataIndex - 1]
      return `${formatSigned(change)} ${props.challenge.unit || ''} к прошлому замеру`.trim()
    },
  } } },
  scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: !isDecrease.value, ...(isDecrease.value ? decreaseScale.value : {}), ticks: { precision: isDecrease.value ? 1 : 0 }, border: { display: false } } },
}))
function formatValue(value: number) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Math.abs(value)) }
function formatSigned(value: number) { return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatValue(value)}` }
function roundDown(value: number) { return Math.floor(value * 10) / 10 }
function roundUp(value: number) { return Math.ceil(value * 10) / 10 }
</script>

<style scoped>
.challenge-chart { min-width: 0; display: grid; gap: 14px; padding: 18px; }.challenge-chart header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }.challenge-chart h3, .challenge-chart p { margin: 0; }.challenge-chart h3 { font-size: 14px; }.challenge-chart header p { margin-top: 3px; color: var(--text-muted); font-size: 9px; }.challenge-chart__current { display: grid; justify-items: end; gap: 2px; }.challenge-chart__current strong { font-size: 15px; }.challenge-chart__current span { color: var(--text-muted); font-size: 9px; }.challenge-chart__changes { display: flex; align-items: center; gap: 7px; margin-top: -5px; }.challenge-chart__changes strong,.challenge-chart__changes span { border-radius: 999px; padding: 5px 8px; background: var(--control-bg); font-size: 9px; }.challenge-chart__changes strong.positive { color: var(--success); background: color-mix(in srgb,var(--success) 9%,var(--control-bg)); }.challenge-chart__changes strong.negative { color: var(--danger); background: color-mix(in srgb,var(--danger) 9%,var(--control-bg)); }.challenge-chart__changes span { color: var(--text-muted); }.challenge-chart__canvas { height: 230px; }.challenge-chart__empty { min-height: 190px; display: grid; place-items: center; color: var(--text-muted); font-size: 10px; }
</style>
