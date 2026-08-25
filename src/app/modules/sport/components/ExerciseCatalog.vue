<template>
  <section class="exercise-catalog">
    <header class="exercise-catalog__header">
      <div>
        <small>Открытая база wger</small>
        <h2>Справочник упражнений</h2>
        <p>Упражнения с гантелями, штангой, ковриком и собственным весом.</p>
      </div>
      <UiButton size="sm" variant="secondary" icon="refresh" :disabled="isLoading" @click="load(true)">Обновить</UiButton>
    </header>

    <div class="exercise-catalog__controls">
      <UiInput v-model="query" placeholder="Название, мышца или описание" />
      <UiSelect v-model="equipment">
        <option value="">Любой инвентарь</option>
        <option v-for="item in equipmentOptions" :key="item" :value="item">{{ item }}</option>
      </UiSelect>
      <UiSelect v-model="category">
        <option value="">Все группы</option>
        <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
      </UiSelect>
    </div>

    <div v-if="isStale" class="exercise-catalog__notice">Показываю сохранённую копию: wger сейчас недоступен.</div>

    <div v-if="isLoading && !exercises.length" class="exercise-catalog__state">
      <UiLoader />
      <strong>Загружаю упражнения из wger</strong>
      <span>Изображения и описания могут появиться через несколько секунд.</span>
    </div>
    <div v-else-if="error" class="exercise-catalog__state exercise-catalog__state--error">
      <UiIcon name="warning" />
      <strong>Справочник не загрузился</strong>
      <span>{{ error }}</span>
      <UiButton size="sm" @click="load(true)">Повторить</UiButton>
    </div>
    <div v-else-if="!visibleExercises.length" class="exercise-catalog__state">
      <UiIcon name="search" />
      <strong>Ничего не найдено</strong>
      <span>Сбрось фильтры или попробуй другое название.</span>
      <UiButton size="sm" variant="secondary" @click="resetFilters">Сбросить</UiButton>
    </div>
    <template v-else>
      <div class="exercise-catalog__meta">
        <span>Найдено {{ filteredExercises.length }}</span>
        <span>Изображения и тексты: wger, Creative Commons</span>
      </div>
      <div class="exercise-catalog__grid">
        <button v-for="exercise in visibleExercises" :key="exercise.id" type="button" class="exercise-api-card" @click="openDetails(exercise)">
          <span class="exercise-api-card__media">
            <img v-if="exercise.imageUrl" :src="exercise.imageUrl" :alt="exercise.title" loading="lazy">
            <img v-else-if="exercise.muscleImageUrl" :src="exercise.muscleImageUrl" :alt="`Мышцы: ${exercise.title}`" loading="lazy">
            <UiIcon v-else name="sport" />
          </span>
          <span class="exercise-api-card__body">
            <small>{{ exercise.category }} · {{ exercise.equipment.join(', ') }}</small>
            <strong>{{ exercise.title }}</strong>
            <span>{{ exercise.description || `Основная нагрузка: ${exercise.muscles.join(', ') || exercise.category}` }}</span>
          </span>
          <span class="exercise-api-card__footer">
            <i v-for="muscle in exercise.muscles.slice(0, 2)" :key="muscle">{{ muscle }}</i>
            <b>Подробнее →</b>
          </span>
        </button>
      </div>
      <UiButton v-if="visibleCount < filteredExercises.length" variant="secondary" @click="visibleCount += PAGE_SIZE">Показать ещё</UiButton>
    </template>

    <ApiExerciseDetailsModal
      v-model="isDetailsOpen"
      :exercise="activeExercise"
      :initial-weekday="initialWeekday"
      @add="addToSchedule"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiLoader from '../../../components/ui/UiLoader.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import { useExerciseCatalog } from '../composables/useExerciseCatalog'
import type { SportApiExercise } from '../types/sportExerciseApi.types'
import ApiExerciseDetailsModal from './ApiExerciseDetailsModal.vue'

const PAGE_SIZE = 18
defineProps<{ initialWeekday: number }>()
const emit = defineEmits<{
  add: [payload: { exercise: SportApiExercise; weekday: number }]
}>()

const {
  exercises, filteredExercises, categories, equipmentOptions, isLoading, error, isStale,
  query, category, equipment, load, resetFilters,
} = useExerciseCatalog()
const visibleCount = ref(PAGE_SIZE)
const activeExercise = ref<SportApiExercise | null>(null)
const isDetailsOpen = ref(false)
const visibleExercises = computed(() => filteredExercises.value.slice(0, visibleCount.value))

watch([query, category, equipment], () => { visibleCount.value = PAGE_SIZE })

function openDetails(exercise: SportApiExercise) {
  activeExercise.value = exercise
  isDetailsOpen.value = true
}

function addToSchedule(payload: { exercise: SportApiExercise; weekday: number }) {
  emit('add', payload)
  isDetailsOpen.value = false
}
</script>

<style scoped>
.exercise-catalog { display: grid; gap: 12px; }
.exercise-catalog__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 14px; background: var(--card-solid); }
.exercise-catalog__header > div { display: grid; gap: 3px; }
.exercise-catalog__header small { color: var(--accent); font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.exercise-catalog__header h2, .exercise-catalog__header p { margin: 0; }
.exercise-catalog__header h2 { font-size: 18px; }
.exercise-catalog__header p { color: var(--text-secondary); font-size: 11px; }
.exercise-catalog__controls { display: grid; grid-template-columns: minmax(240px, 1fr) 190px 170px; gap: 8px; }
.exercise-catalog__notice { border-radius: var(--radius-md); padding: 8px 10px; color: var(--warning); background: color-mix(in srgb, var(--warning) 10%, transparent); font-size: 10px; }
.exercise-catalog__meta { display: flex; justify-content: space-between; gap: 10px; color: var(--text-muted); font-size: 9px; }
.exercise-catalog__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
.exercise-api-card { min-width: 0; display: grid; grid-template-rows: 165px auto auto; overflow: hidden; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 0; color: var(--text-primary); background: var(--card-solid); text-align: left; transition: border-color .18s var(--ease-out), transform .18s var(--ease-out); }
.exercise-api-card:hover { border-color: var(--accent-border); transform: translateY(-2px); }
.exercise-api-card__media { display: grid; place-items: center; overflow: hidden; background: linear-gradient(145deg, var(--accent-soft), var(--card-soft)); }
.exercise-api-card__media img { width: 100%; height: 100%; object-fit: contain; }
.exercise-api-card__media > svg { color: var(--accent); font-size: 36px; }
.exercise-api-card__body { min-width: 0; display: grid; align-content: start; gap: 5px; padding: 11px 11px 7px; }
.exercise-api-card__body small { overflow: hidden; color: var(--accent); font-size: 9px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.exercise-api-card__body strong { overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.exercise-api-card__body > span { display: -webkit-box; overflow: hidden; color: var(--text-secondary); font-size: 10px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.exercise-api-card__footer { display: flex; align-items: center; gap: 4px; padding: 5px 11px 11px; }
.exercise-api-card__footer i { border-radius: var(--radius-pill); padding: 3px 6px; color: var(--text-secondary); background: var(--control-bg); font-size: 8px; font-style: normal; }
.exercise-api-card__footer b { margin-left: auto; color: var(--accent); font-size: 9px; }
.exercise-catalog__state { min-height: 260px; display: grid; place-content: center; justify-items: center; gap: 7px; border: 1px dashed var(--border-strong); border-radius: var(--radius-lg); padding: 24px; color: var(--text-secondary); text-align: center; }
.exercise-catalog__state > span { max-width: 430px; color: var(--text-muted); font-size: 11px; }
.exercise-catalog__state--error > svg { color: var(--danger); font-size: 24px; }
@media (max-width: 950px) { .exercise-catalog__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 700px) { .exercise-catalog__controls, .exercise-catalog__grid { grid-template-columns: 1fr; }.exercise-catalog__header { align-items: stretch; flex-direction: column; }.exercise-api-card { grid-template-rows: 190px auto auto; }.exercise-catalog__meta { flex-direction: column; } }
</style>
