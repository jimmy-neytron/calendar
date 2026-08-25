<template>
  <UiModal
    :model-value="modelValue"
    :title="exercise?.title || 'Упражнение'"
    eyebrow="Справочник wger"
    width="760px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="exercise" class="api-exercise-details">
      <section class="api-exercise-details__hero">
        <div class="api-exercise-details__media">
          <img v-if="exercise.imageUrl && !imageFailed" :src="exercise.imageUrl" :alt="`Техника упражнения: ${exercise.title}`" @error="imageFailed = true">
          <img v-else-if="exercise.muscleImageUrl" :src="exercise.muscleImageUrl" :alt="`Основные мышцы: ${exercise.title}`">
          <span v-else><UiIcon name="sport" /></span>
        </div>
        <div class="api-exercise-details__intro">
          <div class="api-exercise-details__chips">
            <span>{{ exercise.category }}</span>
            <span v-for="item in exercise.equipment" :key="item">{{ item }}</span>
          </div>
          <p>{{ exercise.description || 'Автор пока не добавил подробное описание. Можно посмотреть изображение, задействованные мышцы и оригинал упражнения в wger.' }}</p>
        </div>
      </section>

      <section class="api-exercise-details__muscles">
        <header><span>01</span><strong>Какие мышцы работают</strong></header>
        <div>
          <span v-for="muscle in exercise.muscles" :key="`main-${muscle}`" class="primary">{{ muscle }}</span>
          <span v-for="muscle in exercise.secondaryMuscles" :key="`secondary-${muscle}`">{{ muscle }}</span>
          <span v-if="!exercise.muscles.length && !exercise.secondaryMuscles.length">{{ exercise.category }}</span>
        </div>
      </section>

      <section class="api-exercise-details__schedule">
        <div>
          <small>Добавить в расписание</small>
          <strong>3 подхода · 8 повторений</strong>
        </div>
        <label>
          <span>День недели</span>
          <UiSelect v-model.number="weekday">
            <option v-for="day in WEEKDAY_OPTIONS" :key="day.value" :value="day.value">{{ day.label }}</option>
          </UiSelect>
        </label>
        <UiButton icon="plus" @click="$emit('add', { exercise, weekday })">Добавить</UiButton>
      </section>

      <footer class="api-exercise-details__source">
        <span>Источник: wger · {{ exercise.licenseName }} · {{ exercise.author }}</span>
        <a :href="exercise.sourceUrl" target="_blank" rel="noreferrer">Открыть оригинал</a>
      </footer>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import { WEEKDAY_OPTIONS } from '../../../utils/constants/calendarConstants.js'
import type { SportApiExercise } from '../types/sportExerciseApi.types'

const props = defineProps<{
  modelValue: boolean
  exercise: SportApiExercise | null
  initialWeekday: number
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  add: [payload: { exercise: SportApiExercise; weekday: number }]
}>()

const weekday = ref(props.initialWeekday)
const imageFailed = ref(false)

watch(() => [props.modelValue, props.exercise, props.initialWeekday] as const, () => {
  if (!props.modelValue) return
  weekday.value = props.initialWeekday
  imageFailed.value = false
})
</script>

<style scoped>
.api-exercise-details { display: grid; gap: 12px; }
.api-exercise-details__hero { display: grid; grid-template-columns: minmax(220px, .9fr) 1.1fr; gap: 14px; }
.api-exercise-details__media { min-height: 260px; display: grid; place-items: center; overflow: hidden; border: 1px solid var(--border-color); border-radius: var(--radius-lg); background: linear-gradient(145deg, var(--accent-soft), var(--card-soft)); }
.api-exercise-details__media img { width: 100%; height: 100%; max-height: 330px; object-fit: contain; }
.api-exercise-details__media > span { color: var(--accent); font-size: 48px; }
.api-exercise-details__intro { display: grid; align-content: start; gap: 12px; padding: 8px 2px; }
.api-exercise-details__intro p { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.65; }
.api-exercise-details__chips, .api-exercise-details__muscles > div { display: flex; flex-wrap: wrap; gap: 5px; }
.api-exercise-details__chips span, .api-exercise-details__muscles > div span { border-radius: var(--radius-pill); padding: 4px 8px; color: var(--text-secondary); background: var(--control-bg); font-size: 10px; font-weight: 800; }
.api-exercise-details__chips span:first-child, .api-exercise-details__muscles > div span.primary { color: var(--accent); background: var(--accent-soft); }
.api-exercise-details__muscles { display: grid; gap: 9px; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 12px; background: var(--card-soft); }
.api-exercise-details__muscles header { display: flex; align-items: center; gap: 8px; }
.api-exercise-details__muscles header > span { width: 27px; height: 27px; display: grid; place-items: center; border-radius: 9px; color: var(--accent); background: var(--accent-soft); font-size: 10px; font-weight: 900; }
.api-exercise-details__schedule { display: grid; grid-template-columns: 1fr 180px auto; align-items: end; gap: 10px; border: 1px solid var(--accent-border); border-radius: var(--radius-lg); padding: 12px; background: var(--accent-soft); }
.api-exercise-details__schedule > div { display: grid; gap: 2px; }
.api-exercise-details__schedule small { color: var(--accent); font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.api-exercise-details__schedule label { display: grid; gap: 5px; }
.api-exercise-details__schedule label > span { color: var(--text-secondary); font-size: 10px; font-weight: 700; }
.api-exercise-details__source { display: flex; justify-content: space-between; gap: 12px; color: var(--text-muted); font-size: 9px; }
.api-exercise-details__source a { color: var(--accent); }
@media (max-width: 650px) {
  .api-exercise-details__hero, .api-exercise-details__schedule { grid-template-columns: 1fr; }
  .api-exercise-details__media { min-height: 210px; }
  .api-exercise-details__source { flex-direction: column; }
}
</style>
