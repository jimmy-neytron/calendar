<template>
  <section class="sport-analytics">
    <header class="sport-analytics__header">
      <div><h2>Аналитика</h2><p>{{ periodLabel }}</p></div>
      <dl>
        <div><dt>Среднее</dt><dd>{{ averagePerActiveDay }} упражнения за тренировочный день</dd></div>
        <div><dt>Текущая серия</dt><dd>{{ history.currentStreak }} {{ dayLabel(history.currentStreak) }}</dd></div>
      </dl>
    </header>

    <SportAnalyticsSummary
      :active-days="history.activeDays"
      :total-completions="history.totalCompletions"
      :duration="durationLabel"
      :longest-streak="history.longestStreak"
    />

    <SportHistoryCharts
      :monthly="history.monthlyActivity"
      :monthly-active-days="history.monthlyActiveDays"
      :weekdays="history.weekdayActivity"
      :total="history.totalCompletions"
    />

    <section class="sport-analytics__section">
      <header><div><h3>Календарь активности</h3><p>Последние 12 месяцев. Нажми на день, чтобы посмотреть упражнения.</p></div></header>
      <SportActivityGrid
        :completions="normalizedCompletions"
        :get-total="getScheduledTotal"
        :get-exercises="getDayExercises"
        :get-completions="getDayCompletions"
      />
    </section>

    <SportMuscleHistoryChart :items="history.muscleActivity" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { sportStore } from '../../../stores/sport.store.js'
import SportActivityGrid from './SportActivityGrid.vue'
import SportAnalyticsSummary from './SportAnalyticsSummary.vue'
import SportHistoryCharts from './SportHistoryCharts.vue'
import SportMuscleHistoryChart from './SportMuscleHistoryChart.vue'
import { buildSportHistoryStats } from '../utils/sportHistoryStats'

const now = new Date()
const normalizedCompletions = computed(() => sportStore.completions.value.map((completion) => {
  const exercise = completion.exerciseId
    ? sportStore.exercises.value.find((item) => item.id === completion.exerciseId)
    : null
  return {
    ...completion,
    durationMinutes: completion.durationMinutes ?? exercise?.durationMinutes ?? null,
    exerciseMuscleGroups: completion.exerciseMuscleGroups?.length
      ? completion.exerciseMuscleGroups
      : (exercise?.muscleGroups || []),
  }
}))
const history = computed(() => buildSportHistoryStats(normalizedCompletions.value, now))
const averagePerActiveDay = computed(() => history.value.averagePerActiveDay.toFixed(1).replace('.', ','))
const durationLabel = computed(() => {
  const minutes = history.value.totalDurationMinutes
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours} ч ${remainder} мин` : `${hours} ч`
})
const periodLabel = computed(() => history.value.firstActivityDate
  ? `Все данные с ${formatDateKey(history.value.firstActivityDate)} по сегодня`
  : 'Данные появятся после первого выполненного упражнения')

function getScheduledTotal(dateKey: string) { return sportStore.getDayProgress(dateKey).total }
function getDayExercises(dateKey: string) { return sportStore.getExercisesForDate(dateKey) }
function getDayCompletions(dateKey: string) { return normalizedCompletions.value.filter((completion) => completion.date === dateKey) }
function dayLabel(value: number) {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'дней'
  if (last === 1) return 'день'
  if (last >= 2 && last <= 4) return 'дня'
  return 'дней'
}
function formatDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day))
}
</script>

<style scoped>
.sport-analytics { display: grid; gap: 12px; }
.sport-analytics__header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; padding: 4px 2px 2px; }
.sport-analytics__header h2, .sport-analytics__header p, .sport-analytics__section h3, .sport-analytics__section p { margin: 0; }
.sport-analytics__header h2 { font-size: 22px; }
.sport-analytics__header p, .sport-analytics__section p { margin-top: 4px; color: var(--text-muted); font-size: 11px; }
.sport-analytics__header dl { display: flex; gap: 24px; margin: 0; }
.sport-analytics__header dl div { display: grid; gap: 3px; }
.sport-analytics__header dt { color: var(--text-muted); font-size: 9px; }
.sport-analytics__header dd { margin: 0; font-size: 11px; font-weight: 700; }
.sport-analytics__section { display: grid; gap: 10px; }
.sport-analytics__section > header { padding: 3px 2px 0; }
.sport-analytics__section h3 { font-size: 14px; }
@media (max-width: 720px) { .sport-analytics__header { align-items: flex-start; flex-direction: column; }.sport-analytics__header dl { width: 100%; justify-content: space-between; gap: 12px; } }
</style>
