<template>
  <UiModal
    :model-value="modelValue"
    :title="dayTitle"
    eyebrow="Подробности дня"
    width="720px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="day" class="sport-day-details">
      <section class="sport-day-details__summary">
        <div class="sport-day-details__ring" :style="{ '--progress': `${progressPercent * 3.6}deg` }"><strong>{{ progressPercent }}%</strong></div>
        <div>
          <small>{{ day.isFuture ? 'План на день' : 'Результат дня' }}</small>
          <strong>{{ completedCount }} из {{ entries.length }} упражнений</strong>
          <p v-if="day.isFuture">Отметки появятся после выполнения.</p>
          <p v-else-if="completedCount === entries.length && entries.length">Все упражнения выполнены.</p>
          <p v-else-if="entries.length">Осталось выполнить: {{ entries.length - completedCount }}.</p>
          <p v-else>На этот день упражнений не найдено.</p>
        </div>
        <div class="sport-day-details__totals">
          <span><i class="done"></i>{{ completedCount }} выполнено</span>
          <span><i></i>{{ Math.max(0, entries.length - completedCount) }} не выполнено</span>
        </div>
      </section>

      <div v-if="entries.length" class="sport-day-details__list">
        <article v-for="entry in entries" :key="entry.key" :class="{ done: entry.completed }">
          <span class="sport-day-details__status"><UiIcon :name="entry.completed ? 'check' : 'minus'" /></span>
          <div class="sport-day-details__exercise">
            <small>{{ entry.workoutName || 'Личная программа' }}</small>
            <strong>{{ entry.title }}</strong>
            <p>{{ [entry.sets, entry.reps].filter(Boolean).join(' · ') || 'Параметры не указаны' }}</p>
            <div><span v-for="muscle in entry.muscleGroups.slice(0, 3)" :key="muscle">{{ muscle }}</span></div>
          </div>
          <div class="sport-day-details__result">
            <strong>{{ entry.completed ? 'Выполнено' : (day.isFuture ? 'Запланировано' : 'Пропущено') }}</strong>
            <span v-if="entry.durationMinutes">≈ {{ entry.durationMinutes }} мин</span>
            <span v-if="entry.fromSnapshot">сохранённая запись</span>
          </div>
        </article>
      </div>

      <div v-else class="sport-day-details__empty">
        <span><UiIcon name="activity" /></span>
        <strong>День без упражнений</strong>
        <p>В расписании и истории выполнения за эту дату ничего нет.</p>
      </div>

      <footer v-if="!day.isFuture && entries.length">
        Выполненные упражнения берутся из сохранённой истории. Если программа позже менялась, невыполненная часть дня соответствует текущему недельному шаблону.
      </footer>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import type { SportActivityDay } from '../utils/sportActivityGrid'

interface ScheduledExercise {
  id: string
  title: string
  sets?: string
  reps?: string
  muscleGroups?: string[]
  workoutName?: string
  durationMinutes?: number | null
}

interface ExerciseCompletion {
  id: string
  exerciseId?: string | null
  exerciseTitle?: string
  exerciseSets?: string
  exerciseReps?: string
  exerciseMuscleGroups?: string[]
  workoutName?: string
  durationMinutes?: number | null
}

const props = defineProps<{
  modelValue: boolean
  day: SportActivityDay | null
  exercises: ScheduledExercise[]
  completions: ExerciseCompletion[]
}>()

defineEmits<{ 'update:modelValue': [value: boolean] }>()

const dayTitle = computed(() => props.day
  ? new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(props.day.date)
  : 'Тренировочный день')
const entries = computed(() => {
  const scheduledIds = new Set(props.exercises.map((exercise) => exercise.id))
  const completionByExercise = new Map(props.completions.filter((item) => item.exerciseId).map((item) => [item.exerciseId, item]))
  const scheduled = props.exercises.map((exercise) => {
    const completion = completionByExercise.get(exercise.id)
    return mapEntry(`exercise-${exercise.id}`, exercise, completion, Boolean(completion))
  })
  const historical = props.completions
    .filter((completion) => !completion.exerciseId || !scheduledIds.has(completion.exerciseId))
    .map((completion) => mapEntry(`completion-${completion.id}`, null, completion, true))
  return [...scheduled, ...historical].sort((left, right) => Number(right.completed) - Number(left.completed))
})
const completedCount = computed(() => entries.value.filter((entry) => entry.completed).length)
const progressPercent = computed(() => entries.value.length ? Math.round(completedCount.value / entries.value.length * 100) : 0)

function mapEntry(key: string, exercise: ScheduledExercise | null, completion: ExerciseCompletion | undefined, completed: boolean) {
  return {
    key,
    completed,
    title: completion?.exerciseTitle || exercise?.title || 'Упражнение из истории',
    sets: completion?.exerciseSets || exercise?.sets || '',
    reps: completion?.exerciseReps || exercise?.reps || '',
    muscleGroups: completion?.exerciseMuscleGroups?.length ? completion.exerciseMuscleGroups : (exercise?.muscleGroups || []),
    workoutName: completion?.workoutName || exercise?.workoutName || '',
    durationMinutes: completion?.durationMinutes ?? exercise?.durationMinutes ?? null,
    fromSnapshot: Boolean(completion?.exerciseTitle),
  }
}
</script>

<style scoped>
.sport-day-details { display: grid; gap: 12px; }
.sport-day-details__summary { display: grid; grid-template-columns: 72px 1fr auto; align-items: center; gap: 13px; border: 1px solid var(--accent-border); border-radius: var(--radius-xl); padding: 14px; background: linear-gradient(135deg, var(--accent-soft), var(--card-solid)); }
.sport-day-details__ring { position: relative; width: 72px; height: 72px; display: grid; place-items: center; border-radius: 50%; background: conic-gradient(var(--accent) var(--progress), var(--control-bg) 0); }
.sport-day-details__ring::after { position: absolute; inset: 6px; border-radius: inherit; background: var(--card-solid); content: ''; }
.sport-day-details__ring strong { z-index: 1; font-size: 14px; }
.sport-day-details__summary > div:nth-child(2) { display: grid; gap: 3px; }
.sport-day-details__summary small { color: var(--accent); font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.sport-day-details__summary > div:nth-child(2) > strong { font-size: 16px; }
.sport-day-details__summary p { margin: 0; color: var(--text-secondary); font-size: 10px; }
.sport-day-details__totals { display: grid; gap: 6px; }
.sport-day-details__totals span { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 9px; }
.sport-day-details__totals i { width: 8px; height: 8px; border-radius: 3px; background: var(--control-bg); }
.sport-day-details__totals i.done { background: var(--accent); }
.sport-day-details__list { display: grid; gap: 7px; }
.sport-day-details__list article { display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 10px; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 10px; background: var(--card-soft); }
.sport-day-details__list article.done { border-color: color-mix(in srgb, var(--success) 24%, var(--border-color)); background: color-mix(in srgb, var(--success) 5%, var(--card-soft)); }
.sport-day-details__status { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 10px; color: var(--text-muted); background: var(--control-bg); }
.sport-day-details__list article.done .sport-day-details__status { color: var(--success); background: color-mix(in srgb, var(--success) 12%, transparent); }
.sport-day-details__exercise { min-width: 0; display: grid; gap: 2px; }
.sport-day-details__exercise small { color: var(--accent); font-size: 8px; font-weight: 800; text-transform: uppercase; }
.sport-day-details__exercise > strong { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.sport-day-details__exercise p { margin: 0; color: var(--text-secondary); font-size: 9px; }
.sport-day-details__exercise > div { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
.sport-day-details__exercise > div span { border-radius: var(--radius-pill); padding: 2px 6px; color: var(--text-secondary); background: var(--control-bg); font-size: 8px; }
.sport-day-details__result { display: grid; justify-items: end; gap: 2px; }
.sport-day-details__result strong { font-size: 9px; }
.sport-day-details__list article.done .sport-day-details__result strong { color: var(--success); }
.sport-day-details__result span { color: var(--text-muted); font-size: 8px; }
.sport-day-details__empty { display: grid; justify-items: center; gap: 6px; border: 1px dashed var(--border-strong); border-radius: var(--radius-lg); padding: 28px; text-align: center; }
.sport-day-details__empty > span { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 13px; color: var(--accent); background: var(--accent-soft); }
.sport-day-details__empty p, .sport-day-details footer { margin: 0; color: var(--text-muted); font-size: 9px; line-height: 1.45; }
.sport-day-details footer { border-top: 1px solid var(--border-color); padding-top: 10px; }
@media (max-width: 600px) {
  .sport-day-details__summary { grid-template-columns: 64px 1fr; }
  .sport-day-details__totals { grid-column: 1 / -1; grid-template-columns: 1fr 1fr; }
  .sport-day-details__list article { grid-template-columns: 32px 1fr; }
  .sport-day-details__result { grid-column: 2; justify-items: start; }
}
</style>
