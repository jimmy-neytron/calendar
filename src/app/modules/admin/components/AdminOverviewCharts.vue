<template>
  <section class="admin-overview-charts">
    <article class="admin-chart admin-chart--wide">
      <header>
        <div>
          <small>Chart.js</small>
          <strong>Общая сводка</strong>
        </div>
        <span>{{ totalSignal }}</span>
      </header>
      <div class="admin-chart__canvas admin-chart__canvas--line">
        <Line :data="overviewLineData" :options="lineOptions" />
      </div>
    </article>

    <article class="admin-chart">
      <header>
        <div>
          <small>Пользователи</small>
          <strong>Аккаунты</strong>
        </div>
      </header>
      <div class="admin-chart__canvas">
        <Doughnut :data="usersData" :options="doughnutOptions" />
      </div>
    </article>

    <article class="admin-chart">
      <header>
        <div>
          <small>Заявки</small>
          <strong>Лиды</strong>
        </div>
      </header>
      <div class="admin-chart__canvas">
        <Bar :data="leadsData" :options="barOptions" />
      </div>
    </article>
  </section>
</template>

<script setup>
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { computed } from 'vue'
import { Bar, Doughnut, Line } from 'vue-chartjs'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
)

const props = defineProps({
  metrics: {
    type: Object,
    required: true,
  },
})

const colors = {
  text: getCssVar('--text-secondary', '#8b949e'),
  muted: getCssVar('--text-muted', '#6b7280'),
  border: getCssVar('--border-color', 'rgba(148, 163, 184, 0.24)'),
  card: getCssVar('--card-solid', '#111827'),
  accent: getCssVar('--accent', '#60a5fa'),
  success: getCssVar('--success', '#22c55e'),
  warning: getCssVar('--warning', '#f59e0b'),
  danger: getCssVar('--danger', '#ef4444'),
}
const totalSignal = computed(() => formatNumber(
  props.metrics.totalUsers + props.metrics.totalEvents + props.metrics.totalLeads,
))
const overviewLineData = computed(() => ({
  labels: ['Пользователи', 'Активные', 'События', 'Заявки'],
  datasets: [{
    label: 'Количество',
    data: [
      props.metrics.totalUsers,
      props.metrics.activeUsers,
      props.metrics.totalEvents,
      props.metrics.totalLeads,
    ],
    borderColor: colors.accent,
    backgroundColor: createGradient('#60a5fa'),
    pointBackgroundColor: colors.card,
    pointBorderColor: colors.accent,
    pointBorderWidth: 3,
    pointRadius: 5,
    pointHoverRadius: 7,
    borderWidth: 3,
    fill: true,
    tension: 0.42,
  }],
}))
const usersData = computed(() => ({
  labels: ['Активные', 'Заблокированы', 'Админы'],
  datasets: [{
    data: [
      props.metrics.activeUsers,
      props.metrics.blockedUsers,
      props.metrics.adminUsers,
    ],
    backgroundColor: [colors.success, colors.danger, colors.accent],
    borderColor: colors.card,
    borderWidth: 3,
    hoverOffset: 4,
  }],
}))
const leadsData = computed(() => ({
  labels: ['Новые', 'Просмотрены'],
  datasets: [{
    data: [props.metrics.unreadLeads, props.metrics.viewedLeads],
    backgroundColor: [colors.warning, colors.success],
    borderRadius: 8,
    maxBarThickness: 48,
  }],
}))
const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: colors.text, font: { size: 11, weight: 700 } },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: colors.muted, precision: 0 },
      grid: { color: colors.border },
      border: { display: false },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: tooltipOptions(),
  },
}
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        color: colors.text,
        font: { size: 11, weight: 700 },
        padding: 12,
      },
    },
    tooltip: tooltipOptions(),
  },
}
const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: colors.text, font: { size: 11, weight: 700 } },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: colors.muted, precision: 0 },
      grid: { color: colors.border },
      border: { display: false },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: tooltipOptions(),
  },
}

function tooltipOptions() {
  return {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    titleColor: '#fff',
    bodyColor: '#fff',
    displayColors: false,
    padding: 10,
  }
}

function createGradient(color) {
  if (typeof document === 'undefined') return color
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const gradient = context.createLinearGradient(0, 0, 0, 260)
  gradient.addColorStop(0, `${color}55`)
  gradient.addColorStop(1, `${color}05`)
  return gradient
}

function getCssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(value)
}
</script>

<style scoped>
.admin-overview-charts{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:10px}.admin-chart{display:grid;gap:12px;min-width:0;border:1px solid var(--border-color);border-radius:8px;padding:14px;background:var(--card-solid);box-shadow:var(--shadow-sm)}.admin-chart--wide{grid-row:span 2;min-height:430px}.admin-chart header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.admin-chart small{color:var(--accent);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.admin-chart strong{display:block;margin-top:3px}.admin-chart header>span{display:inline-flex;align-items:center;justify-content:center;min-width:58px;height:34px;border-radius:999px;color:var(--text-inverse);background:var(--accent);font-size:14px;font-weight:900}.admin-chart__canvas{position:relative;height:178px;min-width:0}.admin-chart__canvas--line{height:354px}@media(max-width:920px){.admin-overview-charts{grid-template-columns:1fr}.admin-chart--wide{grid-row:auto;min-height:0}.admin-chart__canvas--line{height:300px}.admin-chart__canvas{height:210px}}@media(max-width:520px){.admin-chart{padding:12px}.admin-chart__canvas--line{height:250px}.admin-chart__canvas{height:190px}}
</style>
