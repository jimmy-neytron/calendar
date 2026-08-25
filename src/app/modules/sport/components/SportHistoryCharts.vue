<template>
  <section class="sport-history-charts">
    <article class="sport-history-chart sport-history-chart--timeline">
      <header>
        <div><small>Всё время</small><strong>Динамика по месяцам</strong></div>
        <span>{{ total }} упражнений</span>
      </header>
      <div v-if="total" class="sport-history-chart__scroll">
        <div class="sport-history-chart__canvas" :style="{ width: `${timelineWidth}px` }"><Line :data="timelineData" :options="timelineOptions" /></div>
      </div>
      <div v-else class="sport-history-chart__empty">После первой выполненной тренировки здесь появится график.</div>
    </article>

    <article class="sport-history-chart sport-history-chart--weekdays">
      <header>
        <div><small>Всё время</small><strong>Ритм по дням недели</strong></div>
      </header>
      <div v-if="total" class="sport-history-chart__doughnut">
        <Doughnut :data="weekdayData" :options="weekdayOptions" />
        <div class="sport-history-chart__center"><strong>{{ favoriteWeekday.value }}</strong><span>{{ favoriteWeekday.label }} чаще всего</span></div>
      </div>
      <div v-else class="sport-history-chart__empty">Пока недостаточно данных для распределения.</div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ArcElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale,
  LineElement, PointElement, Tooltip, type ChartOptions,
} from 'chart.js'
import { Doughnut, Line } from 'vue-chartjs'
import type { SportHistoryPoint } from '../utils/sportHistoryStats'

ChartJS.register(ArcElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip)

const props = defineProps<{
  monthly: SportHistoryPoint[]
  weekdays: SportHistoryPoint[]
  total: number
}>()

const COLORS = ['#34d399', '#38bdf8', '#a78bfa', '#fb7185', '#f59e0b', '#2dd4bf', '#818cf8']
const timelineWidth = computed(() => Math.max(620, props.monthly.length * 58))
const favoriteWeekday = computed(() => props.weekdays.reduce((best, item) => item.value > best.value ? item : best, props.weekdays[0] || { label: '—', value: 0 }))
const timelineData = computed(() => ({
  labels: props.monthly.map((item) => item.label),
  datasets: [{
    label: 'Выполнено упражнений',
    data: props.monthly.map((item) => item.value),
    borderColor: '#34d399',
    backgroundColor: 'rgba(52, 211, 153, .14)',
    pointBackgroundColor: '#34d399',
    pointBorderColor: '#ffffff',
    pointBorderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    borderWidth: 2.5,
    tension: .34,
    fill: true,
  }],
}))
const weekdayData = computed(() => ({
  labels: props.weekdays.map((item) => item.label),
  datasets: [{ data: props.weekdays.map((item) => item.value), backgroundColor: COLORS, borderWidth: 0, hoverOffset: 5 }],
}))

const commonPlugins = {
  legend: { display: false },
  tooltip: {
    displayColors: false,
    backgroundColor: 'rgba(15, 23, 42, .94)',
    titleColor: '#ffffff',
    bodyColor: '#dbeafe',
    padding: 10,
    cornerRadius: 10,
  },
}
const timelineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' },
  plugins: commonPlugins,
  scales: {
    x: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 0, font: { size: 9 } }, border: { display: false } },
    y: { beginAtZero: true, ticks: { color: '#94a3b8', precision: 0, font: { size: 9 } }, grid: { color: 'rgba(148, 163, 184, .12)' }, border: { display: false } },
  },
}
const weekdayOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '72%',
  plugins: { ...commonPlugins, tooltip: { ...commonPlugins.tooltip, callbacks: { label: (context) => `${context.label}: ${context.formattedValue}` } } },
}
</script>

<style scoped>
.sport-history-charts { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(270px, .75fr); gap: 9px; }
.sport-history-chart { min-width: 0; display: grid; grid-template-rows: auto 1fr; gap: 14px; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 15px; background: var(--card-solid); }
.sport-history-chart header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sport-history-chart header > div { display: grid; gap: 2px; }
.sport-history-chart header small { color: var(--accent); font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.sport-history-chart header strong { font-size: 14px; }
.sport-history-chart header > span { color: var(--text-muted); font-size: 9px; }
.sport-history-chart__scroll { min-width: 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; }
.sport-history-chart__canvas { height: 250px; max-width: none; }
.sport-history-chart__doughnut { position: relative; height: 250px; }
.sport-history-chart__center { position: absolute; inset: 50% auto auto 50%; display: grid; justify-items: center; pointer-events: none; transform: translate(-50%, -50%); }
.sport-history-chart__center strong { font-size: 25px; line-height: 1; }
.sport-history-chart__center span { margin-top: 4px; color: var(--text-muted); font-size: 8px; white-space: nowrap; }
.sport-history-chart__empty { min-height: 220px; display: grid; place-items: center; color: var(--text-muted); font-size: 10px; text-align: center; }
@media (max-width: 850px) { .sport-history-charts { grid-template-columns: 1fr; }.sport-history-chart__canvas, .sport-history-chart__doughnut { height: 230px; } }
</style>
