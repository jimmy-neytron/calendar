<template>
  <section class="challenge-chart panel">
    <header><div><h3>Динамика</h3><p>{{ description }}</p></div><strong>{{ progress.current }} / {{ progress.target }} {{ challenge.unit }}</strong></header>
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
const description = computed(() => props.challenge.goalType === 'total' ? 'Накопительный результат' : props.challenge.goalType === 'best' ? 'Результаты по дням' : 'Отмеченные выполнения')
const chartData = computed(() => ({
  labels: points.value.map((item) => item.label),
  datasets: [
    { label: 'Результат', data: points.value.map((item) => item.value), borderColor: props.challenge.color || '#a78bfa', backgroundColor: 'transparent', pointBackgroundColor: props.challenge.color || '#a78bfa', borderWidth: 2, pointRadius: 3, tension: .25 },
    { label: 'Цель', data: points.value.map(() => progress.value.target), borderColor: 'rgba(148,163,184,.55)', backgroundColor: 'transparent', pointRadius: 0, borderWidth: 1, borderDash: [5, 5] },
  ],
}))
const chartOptions = {
  responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
  plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: (context: { datasetIndex: number; formattedValue: string }) => context.datasetIndex ? `Цель: ${context.formattedValue}` : `Результат: ${context.formattedValue}` } } },
  scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, border: { display: false } } },
}
</script>

<style scoped>
.challenge-chart { min-width: 0; display: grid; gap: 14px; padding: 18px; }.challenge-chart header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }.challenge-chart h3, .challenge-chart p { margin: 0; }.challenge-chart h3 { font-size: 14px; }.challenge-chart header p { margin-top: 3px; color: var(--text-muted); font-size: 9px; }.challenge-chart header > strong { font-size: 11px; }.challenge-chart__canvas { height: 230px; }.challenge-chart__empty { min-height: 190px; display: grid; place-items: center; color: var(--text-muted); font-size: 10px; }
</style>
