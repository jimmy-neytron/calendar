<template>
  <div class="allocation-chart"><Doughnut v-if="items.length" :data="chartData" :options="options" /><div v-else class="allocation-chart__empty">Добавь активы</div></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArcElement, Chart as ChartJS, DoughnutController, Tooltip } from 'chart.js'
import { Doughnut } from 'vue-chartjs'

ChartJS.register(ArcElement, DoughnutController, Tooltip)
const props = defineProps<{ items: Array<{ label: string; value: number; color: string }> }>()
const chartData = computed(() => ({ labels: props.items.map((item) => item.label), datasets: [{ data: props.items.map((item) => item.value), backgroundColor: props.items.map((item) => item.color), borderWidth: 0, spacing: 2 }] }))
const options = { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: { displayColors: false } } }
</script>

<style scoped>
.allocation-chart { height: 190px; }.allocation-chart__empty { height: 100%; display: grid; place-items: center; color: var(--text-muted); font-size: 10px; }
</style>
