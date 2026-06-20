<template>
  <Teleport to="body">
    <transition name="drawer-overlay">
      <div
        v-if="modelValue"
        class="event-drawer__overlay"
        aria-hidden="true"
        @click="$emit('update:modelValue', false)"
      />
    </transition>

    <transition name="drawer">
      <aside
        v-if="modelValue"
        class="event-drawer"
        role="dialog"
        aria-modal="true"
        :aria-label="editingEvent ? 'Редактировать событие' : 'Новое событие'"
        @keydown.esc="$emit('update:modelValue', false)"
      >
        <header class="event-drawer__header">
          <div>
            <p>Календарь</p>
            <h2>{{ editingEvent ? 'Редактировать событие' : 'Новое событие' }}</h2>
          </div>
          <button type="button" class="event-drawer__close" aria-label="Закрыть" @click="$emit('update:modelValue', false)">×</button>
        </header>

        <form class="event-drawer__form" @submit.prevent="submit">
          <section v-if="!editingEvent" class="event-drawer__templates">
            <span>Шаблоны</span>
            <div>
              <button
                v-for="template in EVENT_TEMPLATES"
                :key="template.id"
                type="button"
                @click="applyTemplate(template)"
              >
                {{ template.title }}
              </button>
            </div>
          </section>

          <UiInput
            ref="titleInputRef"
            v-model="form.title"
            label="Название"
            placeholder="Встреча, врач, тренировка..."
            required
            :error="errors.title"
            @keydown.ctrl.enter="submit"
          />

          <div class="event-drawer__grid">
            <UiInput v-model="form.date" type="date" label="Дата" required :error="errors.date" />
            <label class="event-drawer__select">
              <span>Категория</span>
              <UiSelect v-model="form.category">
                <option v-for="category in EVENT_FORM_CATEGORIES" :key="category.value" :value="category.value">
                  {{ category.label }}
                </option>
              </UiSelect>
            </label>
          </div>

          <label class="event-drawer__select">
            <span>Календарь</span>
            <UiSelect v-model="form.calendarId">
              <option v-for="calendar in calendars" :key="calendar.id" :value="calendar.id">
                {{ calendar.name }}
              </option>
            </UiSelect>
          </label>

          <div class="event-drawer__grid">
            <label class="event-drawer__select">
              <span>Важность</span>
              <UiSelect v-model="form.importance">
                <option v-for="importance in IMPORTANCE_OPTIONS" :key="importance.value" :value="importance.value">
                  {{ importance.label }}
                </option>
              </UiSelect>
            </label>

            <label class="event-drawer__select">
              <span>Напоминание</span>
              <UiSelect v-model="form.reminder">
                <option v-for="reminder in REMINDER_OPTIONS" :key="reminder.value" :value="reminder.value">
                  {{ reminder.label }}
                </option>
              </UiSelect>
            </label>
          </div>

          <div class="event-drawer__grid">
            <label class="event-drawer__toggle">
              <span>На весь день</span>
              <UiToggle v-model="form.allDay" />
            </label>

            <label class="event-drawer__select">
              <span>Повтор</span>
              <UiSelect v-model="form.repeat">
                <option v-for="option in REPEAT_OPTIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </UiSelect>
            </label>
          </div>

          <section v-if="form.repeat !== 'none'" class="event-drawer__repeat card">
            <div v-if="form.repeat === 'custom'" class="event-drawer__grid">
              <UiInput v-model.number="form.repeatInterval" type="number" label="Интервал" :error="errors.repeatInterval" />
              <label class="event-drawer__select">
                <span>Единица</span>
                <UiSelect v-model="form.repeatUnit">
                  <option v-for="unit in REPEAT_UNITS" :key="unit.value" :value="unit.value">
                    {{ unit.label }}
                  </option>
                </UiSelect>
              </label>
            </div>

            <div v-if="form.repeat === 'custom' && form.repeatUnit === 'week'" class="event-drawer__weekdays">
              <span>Дни недели</span>
              <div>
                <button
                  v-for="weekday in WEEKDAY_OPTIONS"
                  :key="weekday.value"
                  type="button"
                  :class="{ active: form.repeatWeekdays.includes(weekday.value) }"
                  @click="toggleWeekday(weekday.value)"
                >
                  {{ weekday.short }}
                </button>
              </div>
              <small v-if="errors.repeatWeekdays">{{ errors.repeatWeekdays }}</small>
            </div>

            <label class="event-drawer__select">
              <span>Закончить</span>
              <UiSelect v-model="form.repeatEndType">
                <option v-for="option in REPEAT_END_OPTIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </UiSelect>
            </label>

            <div v-if="form.repeatEndType === 'until'" class="event-drawer__grid event-drawer__grid--one">
              <UiInput v-model="form.repeatUntil" type="date" label="Повторять до" :error="errors.repeatUntil" />
            </div>

            <div v-if="form.repeatEndType === 'count'" class="event-drawer__grid event-drawer__grid--one">
              <UiInput v-model.number="form.repeatCount" type="number" label="Количество повторений" :error="errors.repeatCount" />
            </div>
          </section>

          <div v-if="!form.allDay" class="event-drawer__grid">
            <UiInput v-model="form.startTime" type="time" label="Начало" />
            <UiInput v-model="form.endTime" type="time" label="Конец" :error="errors.endTime" />
          </div>

          <UiInput v-model="form.location" label="Место" placeholder="Офис, дом, школа..." />
          <UiInput v-model="form.notes" type="textarea" label="Заметки" placeholder="Дополнительная информация" />

          <section class="event-drawer__members">
            <span>Участники</span>
            <div>
              <UiChip
                label="Все"
                clickable
                :selected="form.memberIds.length === 0"
                @click="form.memberIds = []"
              />
              <UiChip
                v-for="member in members"
                :key="member.id"
                :label="member.name"
                :dot="member.color"
                clickable
                :selected="form.memberIds.includes(member.id)"
                @click="toggleMember(member.id)"
              />
            </div>
          </section>

          <section class="event-drawer__collaboration card">
            <div class="event-drawer__collaboration-head">
              <div>
                <span>Совместная работа</span>
                <small>Ответственный, участие и комментарии</small>
              </div>
            </div>

            <label class="event-drawer__select">
              <span>Ответственный</span>
              <UiSelect v-model="form.responsibleId">
                <option value="">Не назначен</option>
                <option v-for="member in members" :key="member.id" :value="member.id">{{ member.name }}</option>
              </UiSelect>
            </label>

            <div v-if="editingEvent" class="event-drawer__responses">
              <span>Моё участие</span>
              <div>
                <button
                  v-for="response in RESPONSE_OPTIONS"
                  :key="response.value"
                  type="button"
                  :class="{ active: form.attendeeResponses[currentUserId] === response.value }"
                  @click="setResponse(response.value)"
                >
                  {{ response.label }}
                </button>
              </div>
            </div>

            <div v-if="editingEvent" class="event-drawer__comments">
              <article v-for="comment in form.comments" :key="comment.id">
                <strong>{{ comment.userName }}</strong>
                <p>{{ comment.text }}</p>
              </article>
              <div>
                <UiInput v-model="commentText" placeholder="Добавить комментарий…" @keydown.enter.prevent="addComment" />
                <UiButton type="button" variant="secondary" @click="addComment">Отправить</UiButton>
              </div>
            </div>
          </section>

          <section v-if="editingEvent" class="event-drawer__duplicate card">
            <span>Дублирование</span>
            <div class="event-drawer__duplicate-row">
              <label class="event-drawer__select">
                <span>Дублировать</span>
                <UiSelect v-model="duplicateMode">
                  <option v-for="option in DUPLICATE_OPTIONS" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </UiSelect>
              </label>
              <UiButton type="button" variant="secondary" @click="duplicate">Создать копии</UiButton>
            </div>
            <UiInput
              v-if="duplicateMode === 'custom-dates'"
              v-model="duplicateDatesInput"
              label="Даты через запятую"
              placeholder="2026-06-22, 2026-06-25"
            />
          </section>

          <footer class="event-drawer__footer">
            <UiButton v-if="editingEvent" variant="danger" type="button" @click="remove">Удалить</UiButton>
            <span />
            <UiButton variant="secondary" type="button" @click="$emit('update:modelValue', false)">Отмена</UiButton>
            <UiButton type="submit">{{ editingEvent ? 'Сохранить' : 'Создать' }}</UiButton>
          </footer>
        </form>
      </aside>
    </transition>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import UiInput from '../ui/UiInput.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiButton from '../ui/UiButton.vue'
import UiChip from '../ui/UiChip.vue'
import UiToggle from '../ui/UiToggle.vue'
import {
  DUPLICATE_OPTIONS,
  EVENT_FORM_CATEGORIES,
  EVENT_TEMPLATES,
  IMPORTANCE_OPTIONS,
  REMINDER_OPTIONS,
  REPEAT_END_OPTIONS,
  REPEAT_OPTIONS,
  REPEAT_UNITS,
  WEEKDAY_OPTIONS,
} from '../../utils/constants/calendarConstants.js'
import { toDateKey } from '../../utils/formatters/dateFormatter.js'
import { validateEvent } from '../../utils/validators/calendarValidator.js'
import { authStore } from '../../stores/auth.store.js'
import { generateId } from '../../utils/helpers/idGenerator.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  editingEvent: { type: Object, default: null },
  selectedDateKey: { type: String, default: '' },
  initialStartTime: { type: String, default: '' },
  members: { type: Array, default: () => [] },
  calendars: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'create', 'update', 'delete', 'duplicate'])

const titleInputRef = ref(null)
const errors = reactive({})
const form = reactive(getEmptyForm())
const duplicateMode = ref('tomorrow')
const duplicateDatesInput = ref('')
const commentText = ref('')
const currentUserId = authStore.currentUserId
const RESPONSE_OPTIONS = [
  { value: 'accepted', label: 'Буду' },
  { value: 'maybe', label: 'Возможно' },
  { value: 'declined', label: 'Не смогу' },
]

watch(
  () => props.modelValue,
  async (isOpen) => {
    document.body.classList.toggle('drawer-open', isOpen)
    if (!isOpen) return
    resetForm()
    await nextTick()
    titleInputRef.value?.$el?.querySelector('input')?.focus()
  }
)

onBeforeUnmount(() => {
  document.body.classList.remove('drawer-open')
})

const toggleMember = (memberId) => {
  if (form.memberIds.includes(memberId)) {
    form.memberIds = form.memberIds.filter((id) => id !== memberId)
    return
  }

  form.memberIds = [...form.memberIds, memberId]
}

const toggleWeekday = (weekday) => {
  if (form.repeatWeekdays.includes(weekday)) {
    form.repeatWeekdays = form.repeatWeekdays.filter((day) => day !== weekday)
    return
  }
  form.repeatWeekdays = [...form.repeatWeekdays, weekday]
}

const submit = () => {
  Object.keys(errors).forEach((key) => delete errors[key])
  const validation = validateEvent(form)

  if (!validation.valid) {
    Object.assign(errors, validation.errors)
    return
  }

  if (props.editingEvent) {
    emit('update', props.editingEvent.id, { ...form })
  } else {
    emit('create', { ...form })
  }
}

const remove = () => {
  if (!props.editingEvent) return
  emit('delete', props.editingEvent.id)
}

const duplicate = () => {
  if (!props.editingEvent) return
  emit('duplicate', {
    eventId: props.editingEvent.id,
    mode: duplicateMode.value,
    dates: duplicateDatesInput.value.split(',').map((item) => item.trim()).filter(Boolean),
  })
}

function applyTemplate(template) {
  form.title = template.title
  form.category = template.category
  form.importance = template.importance || 'normal'
  form.reminder = template.reminder || 'none'
  form.repeat = template.repeat || 'none'

  if (!form.allDay && template.duration) {
    form.endTime = addMinutesToTime(form.startTime, template.duration)
  }
}

function resetForm() {
  Object.keys(errors).forEach((key) => delete errors[key])
  Object.assign(form, getEmptyForm(props.selectedDateKey), props.editingEvent ? normalizeIncomingEvent(props.editingEvent) : {})
  if (!props.editingEvent && props.initialStartTime) {
    form.startTime = props.initialStartTime
    form.endTime = addMinutesToTime(props.initialStartTime, 60)
  }
  duplicateMode.value = 'tomorrow'
  duplicateDatesInput.value = ''
  commentText.value = ''
}

function setResponse(response) {
  form.attendeeResponses = { ...form.attendeeResponses, [currentUserId.value]: response }
}

function addComment() {
  const text = commentText.value.trim()
  if (!text) return
  form.comments = [
    ...form.comments,
    {
      id: generateId(),
      userId: currentUserId.value,
      userName: authStore.currentUser.value?.name || 'Пользователь',
      text,
      createdAt: new Date().toISOString(),
    },
  ]
  commentText.value = ''
}

function normalizeIncomingEvent(event) {
  return {
    ...event,
    repeatEndType: event.repeatEndType || (event.repeatUntil ? 'until' : 'never'),
    repeatCount: Number(event.repeatCount || 0),
    repeatInterval: Number(event.repeatInterval || 1),
    repeatUnit: event.repeatUnit || 'week',
    repeatWeekdays: Array.isArray(event.repeatWeekdays) ? event.repeatWeekdays.map(Number) : [],
    importance: event.importance || 'normal',
    reminder: event.reminder || 'none',
  }
}

function getEmptyForm(date = '') {
  return {
    title: '',
    date: date || toDateKey(new Date()),
    startTime: '09:00',
    endTime: '10:00',
    memberIds: [],
    calendarId: props.calendars[0]?.id || '',
    responsibleId: '',
    attendeeResponses: {},
    comments: [],
    category: 'home',
    location: '',
    notes: '',
    allDay: false,
    repeat: 'none',
    repeatUntil: '',
    repeatEndType: 'never',
    repeatCount: 10,
    repeatInterval: 1,
    repeatUnit: 'week',
    repeatWeekdays: [],
    importance: 'normal',
    reminder: 'none',
  }
}

function addMinutesToTime(time, minutes) {
  const [hour, minute] = time.split(':').map(Number)
  const total = Math.min(23 * 60 + 59, hour * 60 + minute + minutes)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
</script>

<style scoped>
.event-drawer__overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(3px);
}

.event-drawer {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 90;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(500px, 100vw);
  height: 100vh;
  border-left: 1px solid var(--border-color);
  background: var(--bg-primary);
  box-shadow: -22px 0 64px rgba(0, 0, 0, 0.58);
}

.event-drawer__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--control-bg-solid);
}

.event-drawer__header p,
.event-drawer__templates > span,
.event-drawer__duplicate > span {
  margin-bottom: 4px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.event-drawer__header h2 {
  margin: 0;
  font-size: 20px;
}

.event-drawer__close {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  background: var(--card-soft);
  font-size: 20px;
  line-height: 1;
}

.event-drawer__form {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 14px;
  overflow-y: auto;
}

.event-drawer__templates,
.event-drawer__duplicate,
.event-drawer__repeat,
.event-drawer__collaboration {
  display: grid;
  gap: 8px;
  padding: 10px;
}

.event-drawer__collaboration-head span,
.event-drawer__responses > span {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
}

.event-drawer__collaboration-head small {
  display: block;
  color: var(--text-muted);
}

.event-drawer__responses {
  display: grid;
  gap: 6px;
}

.event-drawer__responses > div {
  display: flex;
  gap: 6px;
}

.event-drawer__responses button {
  min-height: 28px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 0 10px;
  color: var(--text-secondary);
  background: var(--control-bg);
  font-size: 11px;
}

.event-drawer__responses button.active {
  color: var(--text-inverse);
  background: var(--accent);
}

.event-drawer__comments {
  display: grid;
  gap: 6px;
}

.event-drawer__comments article {
  border-left: 2px solid var(--accent-border);
  padding-left: 8px;
}

.event-drawer__comments article p {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font-size: 11px;
}

.event-drawer__comments > div:last-child {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
  align-items: end;
}

.event-drawer__templates div,
.event-drawer__weekdays div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.event-drawer__templates button,
.event-drawer__weekdays button {
  min-height: 28px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 0 10px;
  color: var(--text-secondary);
  background: var(--bg-panel);
  font-size: 12px;
  font-weight: 700;
}

.event-drawer__weekdays button.active {
  color: var(--text-inverse);
  background: var(--accent);
}

.event-drawer__weekdays {
  display: grid;
  gap: 6px;
}

.event-drawer__weekdays > span,
.event-drawer__weekdays small {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
}

.event-drawer__weekdays small {
  color: var(--danger);
}

.event-drawer__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.event-drawer__grid--one {
  grid-template-columns: 1fr;
}

.event-drawer__select {
  display: grid;
  gap: 5px;
}

.event-drawer__select span,
.event-drawer__members > span {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
}

.event-drawer__toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  background: var(--control-bg);
  color: var(--text-secondary);
  font-weight: 800;
}

.event-drawer__members {
  display: grid;
  gap: 6px;
}

.event-drawer__members div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.event-drawer__duplicate-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: end;
}

.event-drawer__footer {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 8px;
  align-items: center;
  margin: 4px -14px -14px;
  padding: 12px 14px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.drawer-enter-active,
.drawer-leave-active,
.drawer-overlay-enter-active,
.drawer-overlay-leave-active {
  transition: all 0.24s var(--ease-out);
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}

.drawer-overlay-enter-from,
.drawer-overlay-leave-to {
  opacity: 0;
}

@media (max-width: 560px) {
  .event-drawer {
    width: 100vw;
  }

  .event-drawer__grid,
  .event-drawer__footer,
  .event-drawer__duplicate-row {
    grid-template-columns: 1fr;
  }
}
</style>
