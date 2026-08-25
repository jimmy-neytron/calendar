<template>
  <section class="muscle-balance-chart">
    <header>
      <div>
        <small>Текущая программа</small>
        <strong>Баланс нагрузки</strong>
        <p>Количество упражнений, затрагивающих каждую группу мышц.</p>
      </div>
      <div class="muscle-balance-chart__score">
        <strong>{{ coveredCount }}/{{ items.length }}</strong>
        <span>групп покрыто</span>
      </div>
    </header>

    <div class="muscle-balance-chart__canvas"><Bar :data="chartData" :options="chartOptions" /></div>

    <footer>
      <div><i class="covered"></i><span>Есть в программе</span></div>
      <div><i></i><span>Нужно добавить</span></div>
      <strong v-if="missingGroups.length">Без нагрузки: {{ missingGroups.join(', ') }}</strong>
      <strong v-else>Все основные группы включены</strong>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip, type ChartOptions,
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Tooltip)

interface MuscleBalanceItem {
  name: string
  count: number
}

const props = defineProps<{ items: MuscleBalanceItem[] }>()
const coveredCount = computed(() => props.items.filter((item) => item.count > 0).length)
const missingGroups = computed(() => props.items.filter((item) => !item.count).map((item) => item.name))
const chartData = computed(() => ({
  labels: props.items.map((item) => item.name),
  datasets: [{
    label: 'Упражнений',
    data: props.items.map((item) => item.count),
    backgroundColor: props.items.map((item) => item.count ? 'rgba(52, 211, 153, .78)' : 'rgba(148, 163, 184, .14)'),
    hoverBackgroundColor: props.items.map((item) => item.count ? '#34d399' : 'rgba(148, 163, 184, .28)'),
    borderColor: props.items.map((item) => item.count ? '#34d399' : 'rgba(148, 163, 184, .2)'),
    borderWidth: 1,
    borderRadius: 7,
    borderSkipped: false,
    minBarLength: 3,
    barThickness: 15,
  }],
}))
const chartOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 550 },
  plugins: {
    legend: { display: false },
    tooltip: {
      displayColors: false,
      backgroundColor: 'rgba(15, 23, 42, .94)',
      titleColor: '#ffffff',
      bodyColor: '#dbeafe',
      padding: 10,
      cornerRadius: 10,
      callbacks: { label: (context) => `Упражнений: ${context.formattedValue}` },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      suggestedMax: 4,
      ticks: { color: '#94a3b8', precision: 0, stepSize: 1, font: { size: 9 } },
      grid: { color: 'rgba(148, 163, 184, .12)' },
      border: { display: false },
    },
    y: {
      ticks: { color: '#cbd5e1', font: { size: 10, weight: 600 } },
      grid: { display: false },
      border: { display: false },
    },
  },
}
</script>

<style scoped>
.muscle-balance-chart { min-width: 0; display: grid; gap: 15px; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 15px; background: var(--card-solid); }
.muscle-balance-chart header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.muscle-balance-chart header > div:first-child { display: grid; gap: 3px; }
.muscle-balance-chart header small { color: var(--accent); font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.muscle-balance-chart header > div:first-child > strong { font-size: 15px; }
.muscle-balance-chart header p { margin: 0; color: var(--text-secondary); font-size: 9px; }
.muscle-balance-chart__score { flex: 0 0 auto; display: grid; justify-items: end; }
.muscle-balance-chart__score strong { color: var(--accent); font-size: 21px; line-height: 1; }
.muscle-balance-chart__score span { margin-top: 3px; color: var(--text-muted); font-size: 8px; }
.muscle-balance-chart__canvas { height: 255px; }
.muscle-balance-chart footer { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 13px; border-top: 1px solid var(--border-color); padding-top: 11px; }
.muscle-balance-chart footer > div { display: flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: 8px; }
.muscle-balance-chart footer i { width: 8px; height: 8px; border-radius: 3px; background: rgba(148, 163, 184, .2); }
.muscle-balance-chart footer i.covered { background: #34d399; }
.muscle-balance-chart footer > strong { margin-left: auto; color: var(--text-secondary); font-size: 8px; font-weight: 700; }
@media (max-width: 560px) {
  .muscle-balance-chart header { flex-direction: column; }
  .muscle-balance-chart__score { justify-items: start; }
  .muscle-balance-chart footer > strong { width: 100%; margin-left: 0; }
}
</style>
