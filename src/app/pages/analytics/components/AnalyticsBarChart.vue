<template>
  <div class="analytics-chart-scroll" :class="{ horizontal }">
    <div class="analytics-chart-canvas" :style="canvasStyle">
      <Bar :data="chartData" :options="chartOptions" :aria-label="ariaLabel" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip, type ChartOptions } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { useAnalyticsChartTheme } from '../useAnalyticsChartTheme'

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Tooltip)
interface ChartItem { label: string; value: number; color?: string }
const props = withDefaults(defineProps<{ items: ChartItem[]; color?: string; compact?: boolean; horizontal?: boolean; ariaLabel?: string }>(), {
  color: 'var(--info)', compact: false, horizontal: false, ariaLabel: 'Аналитический график',
})
const { palette, resolveColor } = useAnalyticsChartTheme()
const canvasStyle = computed(() => props.horizontal
  ? { height: `${Math.max(props.compact ? 190 : 230, props.items.length * 34)}px` }
  : { height: `${props.compact ? 210 : 270}px`, width: `${Math.max(620, props.items.length * 48)}px` })
const chartData = computed(() => ({
  labels: props.items.map((item) => item.label),
  datasets: [{
    label: 'Количество',
    data: props.items.map((item) => Number(item.value) || 0),
    backgroundColor: props.items.map((item) => resolveColor(item.color || props.color, palette().accent)),
    borderRadius: 4,
    borderSkipped: false,
    maxBarThickness: props.horizontal ? 18 : 26,
  }],
}))
const chartOptions = computed<ChartOptions<'bar'>>(() => {
  const theme = palette()
  const valueScale = { beginAtZero: true, ticks: { color: theme.text, precision: 0 }, grid: { color: theme.grid }, border: { display: false } }
  const categoryScale = { ticks: { color: theme.text, maxRotation: 0, autoSkip: !props.horizontal }, grid: { display: false }, border: { display: false } }
  return {
    indexAxis: props.horizontal ? 'y' : 'x', responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { displayColors: false, backgroundColor: theme.surface, titleColor: theme.foreground, bodyColor: theme.foreground, padding: 9, cornerRadius: 6 },
    },
    scales: props.horizontal ? { x: valueScale, y: categoryScale } : { x: categoryScale, y: valueScale },
  }
})
</script>

<style scoped>
.analytics-chart-scroll { min-width: 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; }
.analytics-chart-scroll.horizontal { overflow: visible; }
.analytics-chart-canvas { min-width: 100%; }
</style>
