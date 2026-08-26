<template>
  <div class="history-chart"><Line v-if="points.length" :data="chartData" :options="options" /><div v-else class="history-chart__empty">{{ emptyText }}</div></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CategoryScale, Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, Filler, LinearScale, LineElement, PointElement, Tooltip)
const props = withDefaults(defineProps<{ points: Array<{ key: string; value: number }>; currency: string; emptyText?: string }>(), { emptyText: 'История появится после первого снимка портфеля.' })
const labels = computed(() => props.points.map((point) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${point.key}T00:00:00`)).replace('.', '')))
const chartData = computed(() => ({ labels: labels.value, datasets: [{ data: props.points.map((point) => point.value), borderColor: '#7c8cf8', backgroundColor: 'rgba(124,140,248,.1)', fill: true, borderWidth: 2, pointRadius: props.points.length > 12 ? 0 : 3, tension: .28 }] }))
const options = computed(() => ({ responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' as const }, plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: (context: { parsed: { y: number } }) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: props.currency, maximumFractionDigits: props.currency === 'RUB' ? 0 : 2 }).format(context.parsed.y) } } }, scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: false, border: { display: false }, ticks: { maxTicksLimit: 5 } } } }))
</script>

<style scoped>
.history-chart { height: 260px; }.history-chart__empty { height: 100%; display: grid; place-items: center; color: var(--text-muted); font-size: 10px; text-align: center; }
</style>
