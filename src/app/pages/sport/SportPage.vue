<template>
  <section class="sport-page panel">
    <header class="sport-page__header">
      <div>
        <p>Спорт</p>
        <h1>Программа упражнений</h1>
        <span>План на каждый день внутри текущего пространства</span>
      </div>
      <div class="sport-page__actions">
        <div class="sport-page__summary">
          <strong>{{ todayProgress.done }}/{{ todayProgress.total }}</strong>
          <span>сегодня</span>
        </div>
        <UiButton icon="＋" @click="openDrawer">Добавить</UiButton>
      </div>
    </header>

    <section class="sport-hero">
      <article class="sport-hero__card">
        <span>Прогресс недели</span>
        <strong>{{ weekProgress.percent }}%</strong>
        <div class="sport-progress">
          <i :style="{ width: `${weekProgress.percent}%` }"></i>
        </div>
        <small>{{ weekProgress.done }} из {{ weekProgress.total }} упражнений отмечено</small>
      </article>

      <article class="sport-hero__card sport-hero__card--today">
        <span>Выбранный день</span>
        <strong>{{ selectedDayTitle }}</strong>
        <small>{{ selectedProgress.done }} / {{ selectedProgress.total }} выполнено</small>
      </article>
    </section>

    <section class="sport-week">
      <button
        v-for="day in weekDays"
        :key="day.key"
        class="sport-week__day"
        :class="{ active: day.key === selectedDateKey, today: day.isToday }"
        type="button"
        @click="selectedDateKey = day.key"
      >
        <span>{{ day.short }}</span>
        <b>{{ day.dayNumber }}</b>
        <small>{{ day.progress.done }}/{{ day.progress.total }}</small>
      </button>
    </section>

    <section class="sport-card sport-card--main">
      <div class="sport-card__head">
        <div>
          <span>План дня</span>
          <h2>{{ selectedDayTitle }}</h2>
        </div>
        <div class="sport-card__head-actions">
          <small>{{ selectedExercises.length }} {{ exerciseWord }}</small>
          <UiButton size="sm" variant="secondary" icon="＋" @click="openDrawer">Добавить</UiButton>
        </div>
      </div>

      <transition-group name="list" tag="div" class="exercise-list">
        <article
          v-for="exercise in selectedExercises"
          :key="exercise.id"
          class="exercise-row"
          :class="{ done: isDone(exercise.id) }"
        >
          <button class="exercise-row__check" type="button" @click="toggleDone(exercise.id)">
            <span>{{ isDone(exercise.id) ? '✓' : '' }}</span>
          </button>

          <div class="exercise-row__body">
            <strong>{{ exercise.title }}</strong>
            <p>{{ exercise.sets }} · {{ exercise.reps }}</p>
            <small v-if="exercise.note">{{ exercise.note }}</small>
          </div>

          <button class="exercise-row__delete" type="button" title="Удалить" @click="removeExercise(exercise.id)">×</button>
        </article>
      </transition-group>

      <div v-if="!selectedExercises.length" class="sport-empty">
        <strong>На этот день пока нет упражнений</strong>
        <span>Открой боковую панель и добавь одно упражнение или импортируй программу через JSON.</span>
        <UiButton size="sm" icon="＋" @click="openDrawer">Добавить упражнения</UiButton>
      </div>
    </section>

    <ExerciseDrawer
      v-model="isDrawerOpen"
      :initial-weekday="selectedWeekday"
      @add="addNewExercise"
      @import-json="importJsonExercises"
    />
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import UiButton from '../../components/ui/UiButton.vue'
import ExerciseDrawer from '../../components/sport/ExerciseDrawer.vue'
import { sportStore } from '../../stores/sport.store.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { DateHelper } from '../../utils/date/dateHelper.js'
import { WEEKDAY_OPTIONS } from '../../utils/constants/calendarConstants.js'

const { notify } = useNotification()
const selectedDateKey = ref(DateHelper.toKey(new Date()))
const isDrawerOpen = ref(false)

const todayProgress = sportStore.todayProgress
const weekProgress = sportStore.weekProgress
const selectedExercises = computed(() => sportStore.getExercisesForDate(selectedDateKey.value))
const selectedProgress = computed(() => sportStore.getDayProgress(selectedDateKey.value))
const selectedWeekday = computed(() => {
  const date = DateHelper.parseKey(selectedDateKey.value)
  return Number.isNaN(date.getTime()) ? new Date().getDay() : date.getDay()
})
const selectedDayTitle = computed(() => {
  const date = DateHelper.parseKey(selectedDateKey.value)
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'short' }).format(date)
})
const exerciseWord = computed(() => pluralize(selectedExercises.value.length, ['упражнение', 'упражнения', 'упражнений']))
const weekDays = computed(() => {
  const selectedDate = DateHelper.parseKey(selectedDateKey.value)
  const start = getMonday(selectedDate)
  return WEEKDAY_OPTIONS.map((meta, index) => {
    const date = DateHelper.addDays(start, index)
    const key = DateHelper.toKey(date)
    return {
      ...meta,
      key,
      dayNumber: date.getDate(),
      isToday: DateHelper.isToday(date),
      progress: sportStore.getDayProgress(key),
    }
  })
})

watch(selectedDateKey, () => {}, { immediate: true })

function openDrawer() {
  isDrawerOpen.value = true
}

function isDone(exerciseId) {
  return sportStore.isExerciseDone(exerciseId, selectedDateKey.value)
}

function toggleDone(exerciseId) {
  const result = sportStore.toggleExercise(exerciseId, selectedDateKey.value)
  if (!result.ok) {
    notify(result.message || 'Не удалось отметить упражнение', 'danger')
    return
  }
  notify(result.completed ? 'Упражнение выполнено' : 'Отметка снята', result.completed ? 'success' : 'info')
}

function addNewExercise(data) {
  const result = sportStore.addExercise(data)
  if (!result.ok) {
    notify(result.message, 'danger')
    return
  }
  notify('Упражнение добавлено', 'success')
}

function importJsonExercises(jsonText) {
  const result = sportStore.importExercisesFromJson(jsonText)
  if (!result.ok) {
    notify(result.message, 'danger')
    return
  }
  notify(result.message, 'success')
}

function removeExercise(id) {
  sportStore.deleteExercise(id)
  notify('Упражнение удалено', 'danger')
}

function getMonday(date) {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return DateHelper.addDays(date, diff)
}

function pluralize(value, words) {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return words[2]
  if (last === 1) return words[0]
  if (last >= 2 && last <= 4) return words[1]
  return words[2]
}
</script>

<style scoped>
.sport-page {
  display: grid;
  gap: 12px;
  padding: 16px;
  animation: fadeSlideUp 0.42s var(--ease-out);
}

.sport-page__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.sport-page__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sport-page__header p,
.sport-card__head span,
.sport-hero__card span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.sport-page__header h1,
.sport-card__head h2 {
  margin: 0;
}

.sport-page__header > div > span,
.sport-hero__card small {
  color: var(--text-secondary);
}

.sport-page__summary {
  min-width: 94px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 9px 10px;
  background: var(--card-solid);
  text-align: right;
}

.sport-page__summary strong,
.sport-page__summary span {
  display: block;
}

.sport-page__summary strong {
  font-size: 22px;
  line-height: 1;
}

.sport-page__summary span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
}

.sport-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(220px, 0.65fr);
  gap: 10px;
}

.sport-hero__card,
.sport-card {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--card-solid);
}

.sport-hero__card {
  display: grid;
  gap: 7px;
  padding: 12px;
}

.sport-hero__card strong {
  font-size: 26px;
  letter-spacing: -0.04em;
}

.sport-hero__card--today strong {
  font-size: 18px;
  text-transform: capitalize;
}

.sport-progress {
  height: 5px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--control-bg);
}

.sport-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent-hover);
  transition: width 0.3s var(--ease-out);
}

.sport-week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 7px;
}

.sport-week__day {
  min-height: 64px;
  display: grid;
  gap: 2px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  text-align: left;
  transition: all 0.18s var(--ease-out);
}

.sport-week__day:hover,
.sport-week__day.active {
  border-color: var(--border-strong);
  background: var(--bg-hover);
  transform: translateY(-1px);
}

.sport-week__day.today {
  box-shadow: inset 0 0 0 1px var(--accent-border);
}

.sport-week__day span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
}

.sport-week__day b {
  font-size: 18px;
}

.sport-week__day small {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
}

.sport-card {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 12px;
}

.sport-card__head {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 10px;
}

.sport-card__head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sport-card__head small {
  color: var(--text-muted);
  font-weight: 700;
}

.exercise-list {
  display: grid;
  gap: 7px;
}

.exercise-row {
  display: grid;
  grid-template-columns: 34px 1fr 28px;
  gap: 9px;
  align-items: start;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px;
  background: var(--card-soft);
  transition: all 0.2s var(--ease-out);
}

.exercise-row.done {
  border-color: color-mix(in srgb, var(--success) 38%, transparent);
  background: color-mix(in srgb, var(--success) 8%, var(--card-soft));
}

.exercise-row__check,
.exercise-row__delete {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  background: var(--control-bg-solid);
}

.exercise-row__check {
  width: 32px;
  height: 32px;
}

.exercise-row__check span {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--success);
  font-weight: 900;
  animation: checkPop 0.24s var(--ease-out);
}

.exercise-row__body {
  display: grid;
  gap: 3px;
}

.exercise-row__body strong {
  font-size: 13px;
}

.exercise-row__body p,
.exercise-row__body small {
  margin: 0;
  color: var(--text-secondary);
}

.exercise-row__body small {
  color: var(--text-muted);
}

.exercise-row__delete {
  width: 28px;
  height: 28px;
  color: var(--text-muted);
}

.sport-empty {
  display: grid;
  justify-items: center;
  gap: 7px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-md);
  padding: 18px;
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 1020px) {
  .sport-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .sport-page {
    padding: 12px;
    border-radius: 16px;
  }

  .sport-page__header,
  .sport-page__actions,
  .sport-card__head,
  .sport-card__head-actions {
    display: grid;
  }

  .sport-page__summary {
    text-align: left;
  }

  .sport-week {
    grid-template-columns: repeat(7, minmax(52px, 1fr));
    overflow-x: auto;
  }

  .sport-week__day {
    min-width: 52px;
  }
}
</style>
