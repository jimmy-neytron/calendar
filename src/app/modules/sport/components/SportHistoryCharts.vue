<template>
  <section class="history-charts">
    <article class="history-chart history-chart--timeline">
      <header>
        <div><h3>Динамика тренировок</h3><p>Выполненные упражнения и активные дни по месяцам</p></div>
        <span>За всё время</span>
      </header>
      <div v-if="total" class="history-chart__scroll">
        <div class="history-chart__timeline" :style="{ width: `${timelineWidth}px` }">
          <Line :data="timelineData" :options="timelineOptions" aria-label="Динамика тренировок по месяцам" />
        </div>
      </div>
      <p v-else class="history-chart__empty">График появится после первого выполненного упражнения.</p>
    </article>

    <article class="history-chart">
      <header><div><h3>Дни тренировок</h3><p>Количество выполненных упражнений по дням недели</p></div></header>
      <div v-if="total" class="history-chart__weekdays">
        <Bar :data="weekdayData" :options="weekdayOptions" aria-label="Активность по дням недели" />
      </div>
      <p v-else class="history-chart__empty">Пока нет данных.</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip, type ChartOptions } from 'chart.js'
import { Bar, Line } from 'vue-chartjs'
import type { SportHistoryPoint } from '../utils/sportHistoryStats'

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, LineElement, PointElement, Tooltip)
const props = defineProps<{ monthly: SportHistoryPoint[]; monthlyActiveDays: SportHistoryPoint[]; weekdays: SportHistoryPoint[]; total: number }>()
const colors = ref({ accent: '#34d399', secondary: '#60a5fa', text: '#94a3b8', grid: 'rgba(148,163,184,.14)', surface: '#0f172a', foreground: '#f8fafc' })
let themeObserver: MutationObserver | null = null
const timelineWidth = computed(() => Math.max(640, props.monthly.length * 52))
const timelineData = computed(() => ({
  labels: props.monthly.map((item) => item.label),
  datasets: [
    { label: 'Упражнения', data: props.monthly.map((item) => item.value), borderColor: colors.value.accent, backgroundColor: 'transparent', pointBackgroundColor: colors.value.accent, pointRadius: 3, pointHoverRadius: 5, borderWidth: 2, tension: .28, fill: false, yAxisID: 'y' },
    { label: 'Активные дни', data: props.monthlyActiveDays.map((item) => item.value), borderColor: colors.value.secondary, backgroundColor: 'transparent', pointBackgroundColor: colors.value.secondary, pointRadius: 3, pointHoverRadius: 5, borderWidth: 2, tension: .28, fill: false, yAxisID: 'y1' },
  ],
}))
const weekdayData = computed(() => ({ labels: props.weekdays.map((item) => item.label), datasets: [{ label: 'Упражнения', data: props.weekdays.map((item) => item.value), backgroundColor: colors.value.accent, borderRadius: 4, borderSkipped: false }] }))
const tooltip = computed(() => ({ backgroundColor: colors.value.surface, titleColor: colors.value.foreground, bodyColor: colors.value.foreground, displayColors: true, padding: 9, cornerRadius: 6 }))
const timelineOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
  plugins: { legend: { position: 'bottom', align: 'start', labels: { color: colors.value.text, boxWidth: 10, boxHeight: 2, usePointStyle: true, padding: 16 } }, tooltip: tooltip.value },
  scales: {
    x: { grid: { display: false }, ticks: { color: colors.value.text, maxRotation: 0 }, border: { display: false } },
    y: { beginAtZero: true, ticks: { color: colors.value.text, precision: 0 }, grid: { color: colors.value.grid }, border: { display: false }, title: { display: true, text: 'Упражнения', color: colors.value.text } },
    y1: { beginAtZero: true, position: 'right', ticks: { color: colors.value.text, precision: 0 }, grid: { display: false }, border: { display: false }, title: { display: true, text: 'Активные дни', color: colors.value.text } },
  },
}))
const weekdayOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: tooltip.value },
  scales: { x: { grid: { display: false }, ticks: { color: colors.value.text }, border: { display: false } }, y: { beginAtZero: true, ticks: { color: colors.value.text, precision: 0 }, grid: { color: colors.value.grid }, border: { display: false } } },
}))
function refreshColors() {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  colors.value = { accent: read('--accent', '#34d399'), secondary: read('--info', '#60a5fa'), text: read('--text-muted', '#94a3b8'), grid: read('--border-color', 'rgba(148,163,184,.14)'), surface: read('--panel-bg', '#0f172a'), foreground: read('--text-primary', '#f8fafc') }
}
onMounted(() => { refreshColors(); themeObserver = new MutationObserver(refreshColors); themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] }) })
onBeforeUnmount(() => themeObserver?.disconnect())
</script>

<style scoped>
.history-charts { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(280px, .85fr); gap: 10px; }
.history-chart { min-width: 0; display: grid; align-content: start; gap: 16px; border: 1px solid var(--border-color); border-radius: 10px; padding: 16px; background: var(--card-solid); }
.history-chart header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.history-chart h3, .history-chart p { margin: 0; }.history-chart h3 { font-size: 14px; }
.history-chart header p, .history-chart header > span { margin-top: 3px; color: var(--text-muted); font-size: 10px; }.history-chart header > span { white-space: nowrap; }
.history-chart__scroll { min-width: 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; }
.history-chart__timeline, .history-chart__weekdays { height: 270px; }
.history-chart__empty { min-height: 240px; display: grid; place-items: center; color: var(--text-muted); font-size: 11px; text-align: center; }
@media (max-width: 880px) { .history-charts { grid-template-columns: 1fr; }.history-chart__timeline, .history-chart__weekdays { height: 240px; } }
</style>
