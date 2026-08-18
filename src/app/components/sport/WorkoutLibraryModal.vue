<template>
  <UiModal :model-value="modelValue" title="Библиотека тренировок" eyebrow="Выбери нагрузку" width="920px" @update:model-value="$emit('update:modelValue', $event)">
    <div class="workout-library">
      <div class="workout-library__heading">
        <p>Готовые и созданные тобой тренировки можно добавлять в любое количество дней.</p>
        <UiButton size="sm" variant="secondary" icon="plus" @click="$emit('create-custom')">Создать свою</UiButton>
      </div>
      <div class="workout-library__controls">
        <UiInput v-model="search" placeholder="Найти по названию или группе мышц" />
        <UiSelect v-model="focusFilter">
          <option value="">Все направления</option>
          <option v-for="focus in focusOptions" :key="focus" :value="focus">{{ focus }}</option>
        </UiSelect>
        <div class="workout-library__weekdays">
          <div v-for="day in WEEKDAY_OPTIONS" :key="day.value" :class="{ active: weekdays.includes(day.value) }">
            <span>{{ day.short }}</span>
            <UiToggle
              :model-value="weekdays.includes(day.value)"
              :label="day.label"
              @update:model-value="setWeekday(day.value, $event)"
            />
          </div>
        </div>
      </div>

      <div class="workout-library__grid">
        <article v-for="workout in filteredWorkouts" :key="`${workout.isCustom ? 'custom' : 'built-in'}-${workout.id}`" class="library-card" :style="{ '--workout-color': workout.color }">
          <header>
            <span class="library-card__mark"><UiIcon name="sport" /></span>
            <div class="library-card__header-actions">
              <small>{{ workout.isCustom ? 'Моя' : `${workout.duration} мин` }}</small>
              <UiIconButton v-if="workout.isCustom" icon="trash" label="Удалить из библиотеки" size="sm" variant="danger" @click="$emit('delete-custom', workout)" />
            </div>
          </header>
          <div class="library-card__body">
            <strong>{{ workout.title }}</strong>
            <p>{{ workout.subtitle }}</p>
            <div><span v-for="focus in workout.focus" :key="focus">{{ focus }}</span></div>
          </div>
          <footer>
            <span>{{ workout.exercises.length }} упражнения · {{ workout.difficulty }}</span>
            <UiButton size="sm" icon="plus" :disabled="!weekdays.length" @click="$emit('add', { workout, weekdays: [...weekdays] })">Добавить</UiButton>
          </footer>
        </article>
      </div>

      <div v-if="!filteredWorkouts.length" class="workout-library__empty">Ничего не найдено. Попробуй другой фильтр.</div>
    </div>
  </UiModal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiModal from '../ui/UiModal.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiToggle from '../ui/UiToggle.vue'
import { SPORT_WORKOUT_LIBRARY } from '../../config/sportWorkoutLibrary.js'
import { WEEKDAY_OPTIONS } from '../../utils/constants/calendarConstants.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  initialWeekday: { type: Number, default: () => new Date().getDay() },
  customWorkouts: { type: Array, default: () => [] },
})
defineEmits(['update:modelValue', 'add', 'create-custom', 'delete-custom'])
const search = ref('')
const focusFilter = ref('')
const weekdays = ref([props.initialWeekday])
const focusOptions = [...new Set(SPORT_WORKOUT_LIBRARY.flatMap((workout) => workout.focus))].sort()
const allWorkouts = computed(() => [
  ...props.customWorkouts.map((workout) => ({
    ...workout,
    isCustom: true,
    duration: (workout.exercises || []).reduce((sum, exercise) => sum + Number(exercise.durationMinutes || 0), 0),
    difficulty: 'Своя',
  })),
  ...SPORT_WORKOUT_LIBRARY,
])

watch(() => props.initialWeekday, (value) => { weekdays.value = [value] })
function setWeekday(weekday, selected) {
  weekdays.value = selected
    ? [...new Set([...weekdays.value, weekday])]
    : weekdays.value.filter((value) => value !== weekday)
}
const filteredWorkouts = computed(() => {
  const query = search.value.trim().toLowerCase()
  return allWorkouts.value.filter((workout) => {
    if (focusFilter.value && !workout.focus.includes(focusFilter.value)) return false
    if (!query) return true
    return [workout.title, workout.subtitle, workout.equipment, ...workout.focus].join(' ').toLowerCase().includes(query)
  })
})
</script>

<style scoped>
.workout-library { display: grid; gap: 14px; }
.workout-library__heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.workout-library__heading p { margin: 0; color: var(--text-secondary); font-size: 11px; }
.workout-library__controls { display: grid; grid-template-columns: minmax(220px, 1fr) 190px; gap: 8px; }
.workout-library__weekdays { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px; }
.workout-library__weekdays > div { min-width: 88px; display: flex; align-items: center; justify-content: space-between; gap: 6px; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 4px 5px 4px 8px; color: var(--text-secondary); background: var(--control-bg); font-size: 10px; font-weight: 800; }
.workout-library__weekdays > div.active { border-color: var(--accent-border); color: var(--text-primary); background: var(--accent-soft); }
.workout-library__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.library-card { position: relative; display: grid; gap: 13px; overflow: hidden; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 13px; background: var(--card-solid); }
.library-card::before { position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--workout-color); content: ''; }
.library-card header, .library-card footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.library-card__header-actions { display: flex; align-items: center; gap: 6px; }
.library-card__mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; color: var(--workout-color); background: color-mix(in srgb, var(--workout-color) 13%, transparent); }
.library-card header small, .library-card footer > span { color: var(--text-muted); font-size: 10px; font-weight: 700; }
.library-card__body { display: grid; gap: 4px; }
.library-card__body > strong { font-size: 15px; }
.library-card__body p { margin: 0; color: var(--text-secondary); font-size: 11px; }
.library-card__body div { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.library-card__body div span { border-radius: var(--radius-pill); padding: 3px 7px; color: var(--workout-color); background: color-mix(in srgb, var(--workout-color) 10%, transparent); font-size: 9px; font-weight: 800; }
.workout-library__empty { border: 1px dashed var(--border-strong); border-radius: var(--radius-lg); padding: 32px; color: var(--text-muted); text-align: center; }
@media (max-width: 700px) { .workout-library__heading { align-items: stretch; flex-direction: column; }.workout-library__controls, .workout-library__grid { grid-template-columns: 1fr; } }
</style>
