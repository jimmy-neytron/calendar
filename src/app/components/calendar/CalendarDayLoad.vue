<template>
  <section class="day-load" aria-label="Загрузка выбранного дня">
    <div class="day-load__chart">
      <Doughnut :data="chartData" :options="chartOptions" role="img" :aria-label="`Занято ${duration}, ${percent}% суток`" />
      <strong class="day-load__percent">{{ percent }}%</strong>
    </div>
    <div class="day-load__details">
      <h3>Загрузка</h3>
      <strong>{{ duration }} <span>занято</span></strong>
      <p>{{ events.length }} {{ pluralizeRu(events.length, ['событие', 'события', 'событий']) }} · из 24 часов</p>
      <p v-if="allDayCount">На весь день: {{ allDayCount }} · отдельно</p>
      <small>Без событий на весь день и без длительности</small>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { ArcElement, Chart as ChartJS, DoughnutController, Tooltip, type ChartOptions } from 'chart.js'
import { useDaySchedule, type ScheduleEvent } from '../../composables/calendar/useDaySchedule'
import { pluralizeRu } from '../../utils/formatters/pluralizeRu.js'

ChartJS.register(ArcElement, DoughnutController, Tooltip)
const props = defineProps<{ events: ScheduleEvent[] }>()
const { busyMinutes, allDayCount } = useDaySchedule(toRef(props, 'events'))
function formatMinutes(value: number) {
  const hours = Math.floor(value / 60)
  const rest = value % 60
  return [hours ? `${hours} ч` : '', rest || !hours ? `${rest} мин` : ''].filter(Boolean).join(' ')
}
const duration = computed(() => formatMinutes(busyMinutes.value))
const percent = computed(() => Math.round(busyMinutes.value / 1440 * 100))
const chartData = computed(() => ({
  labels: ['Занято', 'Без событий по времени'],
  datasets: [{
    data: [busyMinutes.value, 1440 - busyMinutes.value],
    backgroundColor: ['#818cf8', 'rgba(148, 163, 184, .18)'],
    borderWidth: 0,
    borderRadius: 4,
    hoverOffset: 2,
  }],
}))
const chartOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '78%',
  animation: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: item => `${item.label}: ${formatMinutes(Number(item.raw))}` } },
  },
}
</script>

<style scoped>
.day-load { display: flex; align-items: center; gap: 14px; padding: 12px; border: 1px solid var(--border-color); border-radius: 12px; background: var(--card-soft); min-width: 0; }
.day-load__chart { position: relative; width: 84px; height: 84px; flex: 0 0 84px; }
.day-load__percent { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; font-size: 18px; color: var(--text-primary); }
.day-load__details { min-width: 0; }
.day-load__details h3 { margin: 0 0 5px; font-size: 12px; }
.day-load__details > strong { font-size: 16px; color: var(--text-primary); }
.day-load__details span { font-size: 11px; font-weight: 400; color: var(--text-secondary); }
.day-load__details p { margin: 4px 0 0; font-size: 11px; color: var(--text-secondary); }
.day-load__details small { display: block; margin-top: 5px; font-size: 10px; color: var(--text-muted); }
</style>
