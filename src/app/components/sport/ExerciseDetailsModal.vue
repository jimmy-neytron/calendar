<template>
  <UiModal
    :model-value="modelValue"
    :title="isEditing ? 'Изменить упражнение' : (exercise?.title || 'Упражнение')"
    :eyebrow="isEditing ? 'Настройка' : 'Техника выполнения'"
    width="700px"
    @update:model-value="close"
  >
    <div v-if="exercise && !isEditing" class="exercise-guide">
      <section class="exercise-guide__hero">
        <span class="exercise-guide__icon"><UiIcon name="sport" /></span>
        <div>
          <div class="exercise-guide__chips">
            <span v-for="group in exercise.muscleGroups || []" :key="group">{{ group }}</span>
            <span v-if="exercise.difficulty">{{ exercise.difficulty }}</span>
          </div>
          <strong>{{ exercise.sets || 'Без подходов' }} · {{ exercise.reps || 'В своём темпе' }}</strong>
          <p>{{ exercise.exerciseType || exercise.workoutName || 'Личная тренировка' }}</p>
        </div>
      </section>

      <div class="exercise-guide__stats">
        <article>
          <UiIcon name="clock" />
          <span>Длительность</span>
          <strong>{{ exercise.durationMinutes ? `${exercise.durationMinutes} мин` : 'По ощущениям' }}</strong>
        </article>
        <article>
          <UiIcon name="refresh" />
          <span>Отдых</span>
          <strong>{{ exercise.restSeconds != null ? `${exercise.restSeconds} сек` : 'До готовности' }}</strong>
        </article>
        <article>
          <UiIcon name="activity" />
          <span>Темп</span>
          <strong>{{ exercise.tempo || 'Подконтрольно' }}</strong>
        </article>
        <article>
          <UiIcon name="settings" />
          <span>Инвентарь</span>
          <strong>{{ exercise.equipment || 'Не требуется' }}</strong>
        </article>
      </div>

      <section class="guide-block guide-block--primary">
        <header><span>01</span><strong>Как выполнять</strong></header>
        <ol v-if="instructionSteps.length">
          <li v-for="step in instructionSteps" :key="step">{{ step }}</li>
        </ol>
        <p v-else>Подробная техника пока не добавлена. Нажми «Изменить», чтобы записать свою инструкцию.</p>
      </section>

      <section v-if="exercise.commonMistakes" class="guide-block guide-block--warning">
        <header><span><UiIcon name="warning" /></span><strong>Частые ошибки</strong></header>
        <p>{{ exercise.commonMistakes }}</p>
      </section>

      <div v-if="exercise.easierVariant || exercise.harderVariant" class="exercise-guide__variants">
        <section v-if="exercise.easierVariant">
          <span>Сделать легче</span>
          <strong>{{ exercise.easierVariant }}</strong>
        </section>
        <section v-if="exercise.harderVariant">
          <span>Добавить нагрузку</span>
          <strong>{{ exercise.harderVariant }}</strong>
        </section>
      </div>

      <section v-if="exercise.note" class="exercise-guide__note">
        <strong>Моя заметка</strong>
        <span>{{ exercise.note }}</span>
      </section>

      <footer class="exercise-guide__actions">
        <span>Упражнение повторяется в выбранный день каждую неделю.</span>
        <UiButton variant="secondary" icon="edit" @click="isEditing = true">Изменить</UiButton>
      </footer>
    </div>

    <form v-else-if="exercise" class="exercise-form" @submit.prevent="save">
      <div class="exercise-form__grid">
        <label class="exercise-field">
          <span>День недели</span>
          <UiSelect v-model.number="form.weekday">
            <option v-for="day in WEEKDAY_OPTIONS" :key="day.value" :value="day.value">{{ day.label }}</option>
          </UiSelect>
        </label>
        <UiInput v-model="form.title" label="Название" required />
      </div>
      <div class="exercise-form__grid exercise-form__grid--three">
        <UiInput v-model="form.sets" label="Подходы" />
        <UiInput v-model="form.reps" label="Повторы / время" />
        <UiInput v-model="form.durationMinutes" type="number" label="Минут" min="1" max="300" />
      </div>
      <div class="exercise-form__grid exercise-form__grid--three">
        <UiInput v-model="form.muscleGroups" label="Группы мышц" placeholder="кор, пресс" />
        <UiInput v-model="form.exerciseType" label="Тип нагрузки" />
        <UiInput v-model="form.difficulty" label="Сложность" />
      </div>
      <div class="exercise-form__grid exercise-form__grid--three">
        <UiInput v-model="form.equipment" label="Инвентарь" />
        <UiInput v-model="form.restSeconds" type="number" label="Отдых, сек" min="0" max="3600" />
        <UiInput v-model="form.tempo" label="Темп" />
      </div>
      <UiInput v-model="form.instructions" type="textarea" label="Как выполнять" placeholder="Опиши технику по шагам. Разделяй шаги точками." />
      <UiInput v-model="form.commonMistakes" type="textarea" label="Частые ошибки" />
      <div class="exercise-form__grid">
        <UiInput v-model="form.easierVariant" type="textarea" label="Как упростить" />
        <UiInput v-model="form.harderVariant" type="textarea" label="Как усложнить" />
      </div>
      <UiInput v-model="form.note" type="textarea" label="Личная заметка" />
      <footer class="exercise-form__actions">
        <UiButton variant="ghost" @click="isEditing = false">Отмена</UiButton>
        <UiButton type="submit" icon="check">Сохранить</UiButton>
      </footer>
    </form>
  </UiModal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiInput from '../ui/UiInput.vue'
import UiModal from '../ui/UiModal.vue'
import UiSelect from '../ui/UiSelect.vue'
import { WEEKDAY_OPTIONS } from '../../utils/constants/calendarConstants.js'

const props = defineProps({ modelValue: { type: Boolean, default: false }, exercise: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue', 'save'])
const isEditing = ref(false)
const form = reactive(emptyForm())
const instructionSteps = computed(() => String(props.exercise?.instructions || '')
  .split(/(?<=[.!?])\s+/)
  .map((step) => step.trim())
  .filter(Boolean))

watch(() => [props.modelValue, props.exercise], () => {
  if (!props.modelValue || !props.exercise) return
  isEditing.value = false
  Object.assign(form, emptyForm(), props.exercise, {
    muscleGroups: (props.exercise.muscleGroups || []).join(', '),
    durationMinutes: props.exercise.durationMinutes ?? '',
    restSeconds: props.exercise.restSeconds ?? '',
  })
}, { immediate: true })

function emptyForm() {
  return {
    weekday: new Date().getDay(), title: '', sets: '', reps: '', note: '', muscleGroups: '',
    exerciseType: '', difficulty: '', equipment: '', durationMinutes: '', restSeconds: '', tempo: '',
    instructions: '', commonMistakes: '', easierVariant: '', harderVariant: '',
  }
}

function close(value) {
  emit('update:modelValue', value)
  if (!value) isEditing.value = false
}

function save() {
  if (!form.title.trim() || !props.exercise) return
  emit('save', { id: props.exercise.id, updates: { ...form } })
}
</script>

<style scoped>
.exercise-guide { display: grid; gap: 12px; }
.exercise-guide__hero { display: grid; grid-template-columns: 54px 1fr; align-items: center; gap: 12px; border: 1px solid var(--accent-border); border-radius: var(--radius-lg); padding: 13px; background: var(--accent-soft); }
.exercise-guide__icon { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 16px; color: var(--accent); background: var(--card-solid); font-size: 25px; }
.exercise-guide__hero > div { display: grid; gap: 4px; }
.exercise-guide__hero p { margin: 0; color: var(--text-secondary); font-size: 11px; }
.exercise-guide__chips { display: flex; flex-wrap: wrap; gap: 4px; }
.exercise-guide__chips span { border-radius: var(--radius-pill); padding: 3px 7px; color: var(--accent); background: var(--card-solid); font-size: 9px; font-weight: 800; }
.exercise-guide__stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
.exercise-guide__stats article { display: grid; gap: 3px; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 9px; background: var(--card-soft); }
.exercise-guide__stats svg { color: var(--accent); font-size: 15px; }
.exercise-guide__stats span { color: var(--text-muted); font-size: 9px; text-transform: uppercase; }
.exercise-guide__stats strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.guide-block { display: grid; gap: 9px; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 12px; background: var(--card-soft); }
.guide-block header { display: flex; align-items: center; gap: 8px; }
.guide-block header span { width: 27px; height: 27px; display: grid; place-items: center; border-radius: 9px; color: var(--accent); background: var(--accent-soft); font-size: 10px; font-weight: 900; }
.guide-block ol { display: grid; gap: 7px; margin: 0; padding-left: 22px; }
.guide-block li, .guide-block p { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.55; }
.guide-block li::marker { color: var(--accent); font-weight: 900; }
.guide-block--warning { border-color: color-mix(in srgb, var(--warning) 25%, var(--border-color)); background: color-mix(in srgb, var(--warning) 5%, var(--card-soft)); }
.guide-block--warning header span { color: var(--warning); background: color-mix(in srgb, var(--warning) 12%, transparent); }
.exercise-guide__variants { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.exercise-guide__variants section { display: grid; gap: 4px; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px; }
.exercise-guide__variants span { color: var(--text-muted); font-size: 9px; font-weight: 800; text-transform: uppercase; }
.exercise-guide__variants strong { font-size: 11px; line-height: 1.45; }
.exercise-guide__note { display: grid; gap: 3px; border-left: 2px solid var(--accent); padding-left: 10px; }
.exercise-guide__note span { color: var(--text-secondary); font-size: 11px; }
.exercise-guide__actions, .exercise-form__actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 3px; }
.exercise-guide__actions > span { color: var(--text-muted); font-size: 10px; }
.exercise-form { display: grid; gap: 12px; }
.exercise-form__grid { display: grid; grid-template-columns: .7fr 1.3fr; gap: 10px; }
.exercise-form__grid--three { grid-template-columns: repeat(3, 1fr); }
.exercise-field { display: grid; gap: 5px; }
.exercise-field > span { color: var(--text-secondary); font-size: 11px; font-weight: 700; }
@media (max-width: 620px) {
  .exercise-guide__stats { grid-template-columns: repeat(2, 1fr); }
  .exercise-guide__variants, .exercise-form__grid, .exercise-form__grid--three { grid-template-columns: 1fr; }
  .exercise-guide__actions { align-items: stretch; flex-direction: column; }
}
</style>
