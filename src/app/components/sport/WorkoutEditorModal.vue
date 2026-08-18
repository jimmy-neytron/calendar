<template>
  <UiModal
    :model-value="modelValue"
    :title="workout ? 'Редактировать тренировку' : 'Своя тренировка'"
    eyebrow="Конструктор"
    width="760px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form class="workout-editor" @submit.prevent="submit">
      <div class="workout-editor__meta">
        <UiInput v-model="form.name" label="Название" placeholder="Например: Силовая на всё тело" required />
        <fieldset class="workout-editor__weekdays">
          <legend>Дни недели</legend>
          <label v-for="day in WEEKDAY_OPTIONS" :key="day.value" :class="{ active: form.weekdays.includes(day.value) }">
            <input v-model="form.weekdays" type="checkbox" :value="day.value">
            <span>{{ day.short }}</span>
          </label>
        </fieldset>
        <UiInput v-model="form.focus" label="Направления" placeholder="ноги, кор, мобильность" />
        <label class="workout-editor__field">
          <span>Цвет</span>
          <input v-model="form.color" class="workout-editor__color" type="color">
        </label>
      </div>

      <section class="workout-editor__exercises">
        <header>
          <div><small>Состав тренировки</small><strong>Упражнения</strong></div>
          <UiButton size="sm" variant="secondary" icon="plus" @click="addExercise">Добавить упражнение</UiButton>
        </header>

        <article v-for="(exercise, index) in form.exercises" :key="exercise.key" class="workout-exercise">
          <div class="workout-exercise__number">{{ index + 1 }}</div>
          <div class="workout-exercise__fields">
            <UiInput v-model="exercise.title" label="Название" placeholder="Приседания" required />
            <UiInput v-model="exercise.sets" label="Подходы" placeholder="3 подхода" />
            <UiInput v-model="exercise.reps" label="Повторы / время" placeholder="12 повторений" />
            <UiInput v-model="exercise.durationMinutes" type="number" label="Минуты" min="1" max="300" />
            <UiInput v-model="exercise.muscleGroups" label="Группы мышц" placeholder="ноги, ягодицы" />
            <UiInput v-model="exercise.note" label="Комментарий" placeholder="Техника или рабочий вес" />
          </div>
          <UiIconButton
            icon="trash"
            label="Убрать упражнение из формы"
            size="sm"
            variant="danger"
            :disabled="form.exercises.length === 1"
            @click="removeExercise(index)"
          />
        </article>
      </section>

      <p v-if="error" class="workout-editor__error">{{ error }}</p>
      <footer class="workout-editor__actions">
        <UiButton variant="secondary" @click="$emit('update:modelValue', false)">Отмена</UiButton>
        <UiButton type="submit" icon="check">{{ workout ? 'Сохранить тренировку' : 'Создать тренировку' }}</UiButton>
      </footer>
    </form>
  </UiModal>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiModal from '../ui/UiModal.vue'
import { WEEKDAY_OPTIONS } from '../../utils/constants/calendarConstants.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  workout: { type: Object, default: null },
  initialWeekday: { type: Number, default: () => new Date().getDay() },
})
const emit = defineEmits(['update:modelValue', 'save'])
const error = ref('')
const form = reactive({ name: '', weekdays: [props.initialWeekday], focus: '', color: '#6ee7b7', exercises: [] })

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) resetForm()
})

function createExercise(exercise = {}) {
  return {
    key: exercise.id || `${Date.now()}-${Math.random()}`,
    id: exercise.id || '',
    title: exercise.title || '',
    sets: exercise.sets || '',
    reps: exercise.reps || '',
    durationMinutes: exercise.durationMinutes ?? '',
    muscleGroups: (exercise.muscleGroups || []).join(', '),
    note: exercise.note || '',
  }
}

function resetForm() {
  const workout = props.workout
  form.name = workout?.name || ''
  form.weekdays = workout?.weekdays?.length ? [...workout.weekdays] : [workout?.weekday ?? props.initialWeekday]
  form.focus = (workout?.focus || []).join(', ')
  form.color = workout?.color || '#6ee7b7'
  form.exercises = workout?.exercises?.length ? workout.exercises.map(createExercise) : [createExercise()]
  error.value = ''
}

function addExercise() { form.exercises.push(createExercise()) }
function removeExercise(index) { if (form.exercises.length > 1) form.exercises.splice(index, 1) }

function submit() {
  if (!form.name.trim()) { error.value = 'Укажи название тренировки'; return }
  if (!form.weekdays.length) { error.value = 'Выбери хотя бы один день недели'; return }
  if (form.exercises.some((exercise) => !exercise.title.trim())) { error.value = 'Укажи название каждого упражнения'; return }
  error.value = ''
  emit('save', {
    id: props.workout?.id || '',
    originalWeekday: props.workout?.weekday,
    name: form.name,
    weekdays: [...form.weekdays],
    focus: form.focus,
    color: form.color,
    exercises: form.exercises.map(({ key, ...exercise }) => exercise),
  })
}
</script>

<style scoped>
.workout-editor { display: grid; gap: 14px; }
.workout-editor__meta { display: grid; grid-template-columns: 1.5fr 1fr; gap: 10px; }
.workout-editor__field { display: grid; gap: 5px; }
.workout-editor__field > span { color: var(--text-secondary); font-size: 11px; font-weight: 700; }
.workout-editor__weekdays { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px; border: 0; margin: 0; padding: 0; }
.workout-editor__weekdays legend { width: 100%; margin-bottom: 5px; color: var(--text-secondary); font-size: 11px; font-weight: 700; }
.workout-editor__weekdays label { min-width: 42px; height: 34px; display: grid; place-items: center; border: 1px solid var(--border-color); border-radius: var(--radius-pill); color: var(--text-secondary); background: var(--control-bg); cursor: pointer; font-size: 11px; font-weight: 800; }
.workout-editor__weekdays label.active { border-color: var(--accent-border); color: var(--text-inverse); background: var(--accent); }
.workout-editor__weekdays input { position: absolute; opacity: 0; pointer-events: none; }
.workout-editor__color { width: 100%; height: 36px; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 4px; background: var(--field-bg); }
.workout-editor__exercises { display: grid; gap: 8px; }
.workout-editor__exercises > header { display: flex; align-items: end; justify-content: space-between; gap: 10px; }
.workout-editor__exercises > header div { display: grid; gap: 2px; }
.workout-editor__exercises > header small { color: var(--accent); font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; }
.workout-exercise { display: grid; grid-template-columns: 26px 1fr 28px; align-items: start; gap: 8px; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 10px; background: var(--card-soft); }
.workout-exercise__number { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 8px; color: var(--accent); background: var(--accent-soft); font-size: 10px; font-weight: 800; }
.workout-exercise__fields { display: grid; grid-template-columns: 1.5fr 1fr 1fr .6fr; gap: 8px; }
.workout-exercise__fields > :nth-child(5), .workout-exercise__fields > :nth-child(6) { grid-column: span 2; }
.workout-editor__error { margin: 0; color: var(--danger); font-size: 11px; }
.workout-editor__actions { display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 650px) { .workout-editor__meta, .workout-exercise__fields { grid-template-columns: 1fr; }.workout-exercise__fields > :nth-child(5), .workout-exercise__fields > :nth-child(6) { grid-column: auto; } }
</style>
