<template>
  <section class="sport-progress">
    <header class="sport-progress__hero">
      <div>
        <small>Статистика за всё время</small>
        <h2>Вся история тренировок</h2>
        <p>{{ historyPeriodLabel }}. Графики учитывают все сохранённые отметки упражнений, а не только текущую неделю.</p>
      </div>
      <div class="sport-progress__hero-score">
        <strong>{{ history.totalCompletions }}</strong>
        <span>упражнений за всё время</span>
      </div>
    </header>

    <SportActivityGrid
      :completions="sportStore.completions.value"
      :get-total="getScheduledTotal"
      :get-exercises="getDayExercises"
      :get-completions="getDayCompletions"
    />

    <div class="sport-progress__stats">
      <article>
        <span class="sport-progress__stat-icon"><UiIcon name="check" /></span>
        <div><small>Всего выполнено</small><strong>{{ history.totalCompletions }}</strong><p>упражнений за всё время</p></div>
      </article>
      <article>
        <span class="sport-progress__stat-icon"><UiIcon name="calendar" /></span>
        <div><small>Активные дни</small><strong>{{ history.activeDays }}</strong><p>дней с упражнениями</p></div>
      </article>
      <article>
        <span class="sport-progress__stat-icon"><UiIcon name="fire" /></span>
        <div><small>Лучшая серия</small><strong>{{ history.longestStreak }}</strong><p>{{ pluralizeDays(history.longestStreak) }}</p></div>
      </article>
      <article>
        <span class="sport-progress__stat-icon"><UiIcon name="chart" /></span>
        <div><small>Средний объём</small><strong>{{ averagePerActiveDay }}</strong><p>упражнения за активный день</p></div>
      </article>
    </div>

    <SportHistoryCharts :monthly="history.monthlyActivity" :weekdays="history.weekdayActivity" :total="history.totalCompletions" />

    <div class="sport-progress__details">
      <SportMuscleBalanceChart :items="muscleBalance" />

      <aside class="sport-progress__month">
        <small>История аккаунта</small>
        <strong>{{ firstActivityLabel }}</strong>
        <p v-if="history.totalCompletions">С этого дня начинается доступная история спортивной активности.</p>
        <p v-else>Первая выполненная тренировка станет началом истории.</p>
        <div><span>Активных месяцев</span><b>{{ history.activeMonths }}</b></div>
        <div><span>Текущая серия</span><b>{{ history.currentStreak }} {{ shortDayLabel(history.currentStreak) }}</b></div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import { sportStore } from '../../../stores/sport.store.js'
import SportActivityGrid from './SportActivityGrid.vue'
import SportHistoryCharts from './SportHistoryCharts.vue'
import SportMuscleBalanceChart from './SportMuscleBalanceChart.vue'
import { buildSportHistoryStats } from '../utils/sportHistoryStats'

const MUSCLE_GROUPS = ['Грудь', 'Спина', 'Плечи', 'Руки', 'Ноги', 'Ягодицы', 'Кор']
const now = new Date()
const history = computed(() => buildSportHistoryStats(sportStore.completions.value, now))
const averagePerActiveDay = computed(() => history.value.averagePerActiveDay.toFixed(1).replace('.', ','))
const firstActivityLabel = computed(() => history.value.firstActivityDate
  ? `Первая тренировка — ${formatDateKey(history.value.firstActivityDate)}`
  : 'История пока пуста')
const historyPeriodLabel = computed(() => history.value.firstActivityDate
  ? `Период с ${formatDateKey(history.value.firstActivityDate)} по сегодня`
  : 'Период начнётся с первой выполненной тренировки')

const muscleBalance = computed(() => MUSCLE_GROUPS.map((name) => {
  const count = sportStore.exercises.value.filter((exercise) => matchesMuscle(exercise, name)).length
  return { name, count }
}))

function getScheduledTotal(dateKey) { return sportStore.getDayProgress(dateKey).total }
function getDayExercises(dateKey) { return sportStore.getExercisesForDate(dateKey) }
function getDayCompletions(dateKey) { return sportStore.completions.value.filter((completion) => completion.date === dateKey) }
function pluralizeDays(value) {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'дней подряд'
  if (last === 1) return 'день подряд'
  if (last >= 2 && last <= 4) return 'дня подряд'
  return 'дней подряд'
}
function shortDayLabel(value) {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'дней'
  if (last === 1) return 'день'
  if (last >= 2 && last <= 4) return 'дня'
  return 'дней'
}
function formatDateKey(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day))
}
function matchesMuscle(exercise, group) {
  const values = [...(exercise.muscleGroups || []), ...(exercise.workoutFocus || [])].join(' ').toLowerCase()
  const aliases = {
    Грудь: ['груд'], Спина: ['спин', 'широч'], Плечи: ['плеч', 'дельт'],
    Руки: ['рук', 'бицеп', 'трицеп'], Ноги: ['ног', 'бедр', 'квадриц', 'икр'],
    Ягодицы: ['ягод'], Кор: ['кор', 'пресс', 'живот'],
  }
  return aliases[group].some((alias) => values.includes(alias))
}
</script>

<style scoped>
.sport-progress { display: grid; gap: 12px; }
.sport-progress__hero { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 24px; overflow: hidden; border: 1px solid var(--accent-border); border-radius: var(--radius-xl); padding: 20px; background: linear-gradient(135deg, var(--accent-soft), var(--card-solid) 58%); }
.sport-progress__hero::after { position: absolute; right: -65px; bottom: -85px; width: 210px; height: 210px; border-radius: 50%; background: color-mix(in srgb, var(--accent) 8%, transparent); content: ''; }
.sport-progress__hero > div:first-child { z-index: 1; display: grid; gap: 5px; }
.sport-progress__hero small, .sport-progress__month > small { color: var(--accent); font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.sport-progress__hero h2, .sport-progress__hero p { margin: 0; }
.sport-progress__hero h2 { font-size: 22px; }
.sport-progress__hero p { max-width: 590px; color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
.sport-progress__hero-score { z-index: 1; min-width: 130px; display: grid; justify-items: end; }
.sport-progress__hero-score strong { color: var(--accent); font-size: 34px; line-height: 1; }
.sport-progress__hero-score span { color: var(--text-muted); font-size: 9px; }
.sport-progress__stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; }
.sport-progress__stats article { display: grid; grid-template-columns: 42px 1fr; align-items: center; gap: 11px; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 13px; background: var(--card-solid); }
.sport-progress__stat-icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 13px; color: var(--accent); background: var(--accent-soft); }
.sport-progress__stats article > div { display: grid; gap: 2px; }
.sport-progress__stats small { color: var(--text-muted); font-size: 9px; text-transform: uppercase; }
.sport-progress__stats strong { font-size: 21px; line-height: 1; }
.sport-progress__stats p { margin: 0; color: var(--text-secondary); font-size: 9px; }
.sport-progress__details { display: grid; grid-template-columns: 1.5fr .8fr; gap: 9px; }
.sport-progress__month { display: grid; gap: 15px; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 15px; background: var(--card-solid); }
.sport-progress__month { align-content: start; }
.sport-progress__month > strong { font-size: 17px; text-transform: capitalize; }
.sport-progress__month > p { margin: -7px 0 2px; color: var(--text-secondary); font-size: 10px; line-height: 1.5; }
.sport-progress__month > div { display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 9px; color: var(--text-secondary); font-size: 10px; }
.sport-progress__month > div b { color: var(--text-primary); }
@media (max-width: 1000px) { .sport-progress__stats { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 800px) { .sport-progress__details { grid-template-columns: 1fr; } }
@media (max-width: 650px) {
  .sport-progress__hero { align-items: flex-start; flex-direction: column; padding: 16px; }
  .sport-progress__hero-score { justify-items: start; }
  .sport-progress__stats { grid-template-columns: 1fr; }
}
</style>
