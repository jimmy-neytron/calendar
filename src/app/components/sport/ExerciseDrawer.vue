<template>
  <Teleport to="body">
    <transition name="drawer-fade">
      <div v-if="modelValue" class="exercise-drawer" @click.self="close">
        <transition name="drawer-slide">
          <aside class="exercise-drawer__panel" role="dialog" aria-modal="true" aria-label="Добавление упражнений">
            <header class="exercise-drawer__header">
              <div>
                <span>Спорт</span>
                <h2>Добавить упражнения</h2>
                <p>Добавь одно упражнение или вставь JSON, чтобы импортировать сразу программу.</p>
              </div>
        <UiIconButton icon="close" label="Закрыть" @click="close" />
            </header>

            <div class="exercise-drawer__body">
              <section class="exercise-drawer__section">
                <div class="exercise-drawer__section-head">
                  <span>Один элемент</span>
                  <strong>Новое упражнение</strong>
                </div>

                <label class="exercise-field">
                  <span>День</span>
                  <UiSelect v-model.number="form.weekday">
                    <option v-for="day in weekdayOptions" :key="day.value" :value="day.value">{{ day.label }}</option>
                  </UiSelect>
                </label>

                <UiInput v-model="form.title" label="Упражнение" placeholder="Например: Планка" />
                <div class="exercise-drawer__grid">
                  <UiInput v-model="form.sets" label="Подходы" placeholder="3 подхода" />
                  <UiInput v-model="form.reps" label="Повторы / время" placeholder="12 повторений" />
                </div>
                <UiInput v-model="form.note" type="textarea" label="Комментарий" placeholder="Техника, вес, темп" />
                <UiButton icon="＋" @click="submitSingle">Добавить упражнение</UiButton>
              </section>

              <section class="exercise-drawer__section">
                <div class="exercise-drawer__section-head">
                  <span>Массово</span>
                  <strong>Импорт через JSON</strong>
                </div>

                <div class="exercise-json-example">
                  <span>Формат</span>
                  <code>[{"day":"пн","title":"Приседания","sets":"3","reps":"12"}]</code>
                </div>

                <label class="exercise-json">
                  <span>JSON</span>
                  <textarea v-model="jsonText" spellcheck="false" placeholder='[{"day":"пн","title":"Приседания","sets":"3 подхода","reps":"12 повторений","note":"Спина ровная"}]' />
                </label>

                <div class="exercise-drawer__actions">
                  <UiButton variant="secondary" @click="fillExample">Пример</UiButton>
                  <UiButton icon="⇣" @click="submitJson">Добавить из JSON</UiButton>
                </div>

                <div class="exercise-json-help">
                  <p>Можно использовать поля:</p>
                  <code>weekday</code>
                  <code>day</code>
                  <code>title</code>
                  <code>sets</code>
                  <code>reps</code>
                  <code>note</code>
                </div>
              </section>
            </div>
          </aside>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import { WEEKDAY_OPTIONS } from '../../utils/constants/calendarConstants.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  initialWeekday: { type: Number, default: () => new Date().getDay() },
})

const emit = defineEmits(['update:modelValue', 'add', 'import-json'])

const weekdayOptions = WEEKDAY_OPTIONS
const jsonText = ref('')
const form = reactive({
  weekday: props.initialWeekday,
  title: '',
  sets: '',
  reps: '',
  note: '',
})

watch(() => props.initialWeekday, (weekday) => {
  form.weekday = weekday
})

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) form.weekday = props.initialWeekday
})

function close() {
  emit('update:modelValue', false)
}

function submitSingle() {
  emit('add', { ...form })
  form.title = ''
  form.sets = ''
  form.reps = ''
  form.note = ''
}

function submitJson() {
  emit('import-json', jsonText.value)
}

function fillExample() {
  jsonText.value = JSON.stringify([
    { day: 'пн', title: 'Приседания', sets: '3 подхода', reps: '12 повторений', note: 'Контроль коленей' },
    { day: 'ср', title: 'Отжимания от опоры', sets: '3 подхода', reps: '10 повторений' },
    { day: 'пт', title: 'Планка', sets: '3 подхода', reps: '35 сек', note: 'Корпус ровный' },
  ], null, 2)
}
</script>

<style scoped>
.exercise-drawer {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  justify-content: flex-end;
  background: var(--overlay-bg);
  backdrop-filter: blur(10px);
}

.exercise-drawer__panel {
  width: min(460px, 100vw);
  height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
  border-left: 1px solid var(--border-color);
  background: var(--panel-bg);
  box-shadow: var(--shadow-lg);
}

.exercise-drawer__header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.exercise-drawer__header span,
.exercise-drawer__section-head span,
.exercise-field span,
.exercise-json span,
.exercise-json-example span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.exercise-drawer__header h2,
.exercise-drawer__header p {
  margin: 0;
}

.exercise-drawer__header p {
  margin-top: 5px;
  color: var(--text-secondary);
}

.exercise-drawer__close {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  background: var(--control-bg-solid);
  font-size: 20px;
  line-height: 1;
}

.exercise-drawer__body {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 14px;
  overflow: auto;
}

.exercise-drawer__section {
  display: grid;
  gap: 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 12px;
  background: var(--card-solid);
}

.exercise-drawer__section-head {
  display: grid;
  gap: 3px;
}

.exercise-field,
.exercise-json {
  display: grid;
  gap: 5px;
}

.exercise-json textarea {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  background: var(--field-bg);
  outline: none;
}

.exercise-json textarea {
  min-height: 190px;
  padding: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  resize: vertical;
}

.exercise-drawer__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.exercise-drawer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.exercise-json-example,
.exercise-json-help {
  display: grid;
  gap: 6px;
  color: var(--text-secondary);
}

.exercise-json-example code,
.exercise-json-help code {
  width: fit-content;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 5px 7px;
  color: var(--text-secondary);
  background: var(--bg-primary);
  font-size: 11px;
}

.exercise-json-help {
  grid-template-columns: repeat(3, max-content);
  align-items: center;
}

.exercise-json-help p {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--text-muted);
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s var(--ease-out);
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.26s var(--ease-out);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}

@media (max-width: 560px) {
  .exercise-drawer__panel {
    width: 100vw;
  }

  .exercise-drawer__grid,
  .exercise-json-help {
    grid-template-columns: 1fr;
  }
}
</style>
