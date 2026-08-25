<template>
  <div class="analytics-doughnut">
    <div v-if="total" class="analytics-doughnut__canvas">
      <Doughnut :data="chartData" :options="chartOptions" :aria-label="`Распределение: ${label}`" />
    </div>
    <p v-else>Данных пока нет.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArcElement, Chart as ChartJS, Legend, Tooltip, type ChartOptions } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { useAnalyticsChartTheme } from '../useAnalyticsChartTheme'

ChartJS.register(ArcElement, Legend, Tooltip)
interface ChartItem { label: string; value: number; color?: string }
const props = withDefaults(defineProps<{ items: ChartItem[]; label?: string }>(), { label: 'всего' })
const { palette, resolveColor } = useAnalyticsChartTheme()
const total = computed(() => props.items.reduce((sum, item) => sum + Number(item.value || 0), 0))
const fallbackColors = ['var(--info)', 'var(--success)', 'var(--warning)', 'var(--pink)', 'var(--orange)', 'var(--cyan)']
const chartData = computed(() => ({
  labels: props.items.map((item) => item.label),
  datasets: [{ data: props.items.map((item) => Number(item.value) || 0), backgroundColor: props.items.map((item, index) => resolveColor(item.color || fallbackColors[index % fallbackColors.length], palette().accent)), borderWidth: 0, hoverOffset: 4 }],
}))
const chartOptions = computed<ChartOptions<'doughnut'>>(() => {
  const theme = palette()
  return {
    responsive: true, maintainAspectRatio: false, cutout: '62%',
    plugins: {
      legend: { position: 'bottom', labels: { color: theme.text, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 13 } },
      tooltip: { backgroundColor: theme.surface, titleColor: theme.foreground, bodyColor: theme.foreground, padding: 9, cornerRadius: 6, callbacks: { label: (context) => `${context.label}: ${context.formattedValue}` } },
    },
  }
})
</script>

<style scoped>
.analytics-doughnut { min-height: 270px; display: grid; place-items: center; }
.analytics-doughnut__canvas { width: 100%; height: 270px; }
.analytics-doughnut p { color: var(--text-muted); font-size: 11px; }
</style>
