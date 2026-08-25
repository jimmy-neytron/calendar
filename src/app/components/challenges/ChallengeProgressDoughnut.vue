<template>
  <div class="challenge-doughnut">
    <Doughnut :data="chartData" :options="chartOptions" />
    <div class="challenge-doughnut__value">
      <strong>{{ progressPercent }}%</strong>
      <span>{{ completed }} {{ direction === 'decrease' ? '→' : 'из' }} {{ target }} {{ unit }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { ArcElement, Chart as ChartJS, DoughnutController, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, DoughnutController, Tooltip)

const props = defineProps({
  completed: { type: Number, default: 0 },
  target: { type: Number, required: true },
  percent: { type: Number, default: null },
  direction: { type: String, default: 'increase' },
  color: { type: String, default: '#a78bfa' },
  unit: { type: String, default: '' },
})

const progressPercent = computed(() => props.percent ?? Math.min(100, Math.round(props.completed / Math.max(1, props.target) * 100)))
const chartData = computed(() => ({
  labels: ['Выполнено', 'Осталось'],
  datasets: [{
    data: [progressPercent.value, Math.max(0, 100 - progressPercent.value)],
    backgroundColor: [props.color, 'rgba(148, 163, 184, .14)'],
    borderWidth: 0,
    borderRadius: 12,
    spacing: progressPercent.value > 0 && progressPercent.value < 100 ? 3 : 0,
    hoverOffset: 2,
  }],
}))
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '78%',
  rotation: -90,
  circumference: 360,
  animation: { duration: 650 },
  plugins: {
    legend: { display: false },
    tooltip: {
      displayColors: false,
      callbacks: { label: (item) => `${item.label}: ${item.raw}%` },
    },
  },
}
</script>

<style scoped>
.challenge-doughnut { position: relative; width: 124px; height: 124px; flex: 0 0 auto; }
.challenge-doughnut__value { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; pointer-events: none; }
.challenge-doughnut__value strong { font-size: 21px; line-height: 1; }
.challenge-doughnut__value span { margin-top: 4px; color: var(--text-muted); font-size: 9px; }
</style>
