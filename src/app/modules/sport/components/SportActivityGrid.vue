<template>
  <section class="activity-grid-card">
    <header class="activity-grid-card__header">
      <div>
        <small>Последние 12 месяцев</small>
        <strong>{{ activeDayCount }} активных дней</strong>
      </div>
      <div class="activity-grid-card__day" aria-live="polite">
        <strong>{{ selectedDay.label }}</strong>
        <span v-if="selectedDay.isFuture">Будущий день</span>
        <span v-else-if="selectedDay.total">Выполнено {{ selectedDay.done }} из {{ selectedDay.total }}<template v-if="selectedDay.missed"> · осталось {{ selectedDay.missed }}</template></span>
        <span v-else-if="selectedDay.done">Выполнено упражнений: {{ selectedDay.done }}</span>
        <span v-else>Нет выполненных упражнений</span>
      </div>
    </header>

    <div class="activity-grid-card__scroll">
      <div class="activity-grid-card__calendar">
        <div class="activity-grid-card__months" aria-hidden="true">
          <span v-for="month in monthLabels" :key="month.key" :style="{ gridColumn: `${month.column} / span ${month.span}` }">{{ month.label }}</span>
        </div>
        <div class="activity-grid-card__body">
          <div class="activity-grid-card__weekdays" aria-hidden="true"><span>Пн</span><span>Ср</span><span>Пт</span></div>
          <div class="activity-grid-card__cells" role="grid" aria-label="Активность за последние 12 месяцев">
            <button
              v-for="day in days"
              :key="day.key"
              type="button"
              role="gridcell"
              :class="[`level-${day.level}`, { today: day.isToday, future: day.isFuture, scheduled: day.total && !day.done }]"
              :aria-label="dayAriaLabel(day)"
              @mouseenter="hoveredDay = day"
              @mouseleave="hoveredDay = null"
              @focus="hoveredDay = day"
              @blur="hoveredDay = null"
              @click="openDay(day)"
            />
          </div>
        </div>
      </div>
    </div>

    <footer class="activity-grid-card__footer">
      <span>Каждая клетка — один день. Насыщенность зависит от доли выполненных упражнений.</span>
      <div aria-label="Легенда интенсивности"><span>Меньше</span><i class="level-0"></i><i class="level-1"></i><i class="level-2"></i><i class="level-3"></i><i class="level-4"></i><span>Больше</span></div>
    </footer>

    <SportDayDetailsModal
      v-model="isDayDetailsOpen"
      :day="selectedModalDay"
      :exercises="selectedExercises"
      :completions="selectedCompletions"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { buildSportActivityDays, type SportActivityDay, type SportCompletionLike } from '../utils/sportActivityGrid'
import SportDayDetailsModal from './SportDayDetailsModal.vue'

const props = defineProps<{
  completions: SportCompletionLike[]
  getTotal: (dateKey: string) => number
  getExercises: (dateKey: string) => Array<Record<string, unknown>>
  getCompletions: (dateKey: string) => Array<Record<string, unknown>>
}>()

const today = new Date()
const days = computed(() => buildSportActivityDays(today, props.completions, props.getTotal))
const hoveredDay = ref<SportActivityDay | null>(null)
const selectedModalDay = ref<SportActivityDay | null>(null)
const isDayDetailsOpen = ref(false)
const todayDay = computed(() => days.value.find((day) => day.isToday) || days.value.at(-1)!)
const selectedDay = computed(() => hoveredDay.value || todayDay.value)
const selectedExercises = computed(() => selectedModalDay.value ? props.getExercises(selectedModalDay.value.key) : [])
const selectedCompletions = computed(() => selectedModalDay.value ? props.getCompletions(selectedModalDay.value.key) : [])
const activeDayCount = computed(() => days.value.filter((day) => day.done > 0).length)
const monthLabels = computed(() => {
  const labels: Array<{ key: string; label: string; column: number; span: number }> = []
  days.value.forEach((day, index) => {
    if (day.date.getDate() !== 1) return
    const column = Math.floor(index / 7) + 1
    const previous = labels.at(-1)
    if (previous) previous.span = Math.max(2, column - previous.column)
    labels.push({
      key: day.key.slice(0, 7),
      label: new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(day.date).replace('.', ''),
      column,
      span: 4,
    })
  })
  return labels
})

function dayAriaLabel(day: SportActivityDay) {
  if (day.isFuture) return `${day.label}: будущий день`
  if (day.total) return `${day.label}: выполнено ${day.done} из ${day.total}, осталось ${day.missed}`
  return `${day.label}: выполнено упражнений ${day.done}`
}

function openDay(day: SportActivityDay) {
  selectedModalDay.value = day
  isDayDetailsOpen.value = true
}
</script>

<style scoped>
.activity-grid-card { min-width: 0; display: grid; gap: 16px; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 16px; background: var(--card-solid); box-shadow: var(--shadow-sm); }
.activity-grid-card__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.activity-grid-card__header > div { display: grid; gap: 3px; }
.activity-grid-card__header small { color: var(--accent); font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.activity-grid-card__header > div:first-child strong { font-size: 16px; }
.activity-grid-card__day { min-height: 34px; justify-items: end; text-align: right; }
.activity-grid-card__day strong { font-size: 11px; text-transform: capitalize; }
.activity-grid-card__day span { color: var(--text-muted); font-size: 10px; }
.activity-grid-card__scroll { overflow-x: auto; padding-bottom: 3px; scrollbar-width: thin; }
.activity-grid-card__calendar { width: max-content; min-width: 100%; display: grid; gap: 6px; }
.activity-grid-card__months { display: grid; grid-template-columns: repeat(53, 11px); gap: 3px; margin-left: 27px; color: var(--text-muted); font-size: 8px; text-transform: capitalize; }
.activity-grid-card__months span { overflow: visible; white-space: nowrap; }
.activity-grid-card__body { display: grid; grid-template-columns: 20px auto; gap: 7px; }
.activity-grid-card__weekdays { height: 95px; display: grid; grid-template-rows: repeat(7, 11px); gap: 3px; color: var(--text-muted); font-size: 8px; }
.activity-grid-card__weekdays span:nth-child(1) { grid-row: 2; }.activity-grid-card__weekdays span:nth-child(2) { grid-row: 4; }.activity-grid-card__weekdays span:nth-child(3) { grid-row: 6; }
.activity-grid-card__cells { display: grid; grid-template-rows: repeat(7, 11px); grid-auto-flow: column; grid-auto-columns: 11px; gap: 3px; }
.activity-grid-card__cells button, .activity-grid-card__footer i { width: 11px; height: 11px; display: block; border: 1px solid color-mix(in srgb, var(--border-strong) 65%, transparent); border-radius: 3px; padding: 0; background: var(--control-bg); }
.activity-grid-card__cells button { cursor: pointer; transition: transform .12s ease, border-color .12s ease; }
.activity-grid-card__cells button:hover, .activity-grid-card__cells button:focus-visible { z-index: 2; border-color: var(--text-primary); outline: none; transform: scale(1.45); }
.activity-grid-card__cells button.today { box-shadow: 0 0 0 1px var(--text-primary); }
.activity-grid-card__cells button.future { opacity: .3; }
.activity-grid-card__cells button.scheduled { border-color: color-mix(in srgb, var(--text-muted) 35%, transparent); }
.activity-grid-card :is(.level-1) { background: color-mix(in srgb, var(--accent) 24%, var(--control-bg)); }
.activity-grid-card :is(.level-2) { background: color-mix(in srgb, var(--accent) 48%, var(--control-bg)); }
.activity-grid-card :is(.level-3) { background: color-mix(in srgb, var(--accent) 72%, var(--control-bg)); }
.activity-grid-card :is(.level-4) { border-color: color-mix(in srgb, var(--accent) 85%, var(--border-color)); background: var(--accent); }
.activity-grid-card__footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; color: var(--text-muted); font-size: 9px; }
.activity-grid-card__footer > div { display: flex; align-items: center; flex: 0 0 auto; gap: 4px; }
.activity-grid-card__footer i { border: 0; }
@media (max-width: 650px) {
  .activity-grid-card { padding: 13px; }
  .activity-grid-card__header, .activity-grid-card__footer { align-items: flex-start; flex-direction: column; }
  .activity-grid-card__day { justify-items: start; text-align: left; }
  .activity-grid-card__footer { gap: 9px; }
}
</style>
