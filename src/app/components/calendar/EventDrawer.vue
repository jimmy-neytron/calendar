<template>
  <UiModal :model-value="modelValue" :title="editingEvent ? 'Редактировать событие' : 'Новое событие'" width="620px" :close-on-overlay="false" @update:model-value="$emit('update:modelValue', $event)">
    <form class="event-editor event-drawer__form" @submit.prevent="submit" @keydown.ctrl.enter.prevent="submit" @keydown.meta.enter.prevent="submit">
          <section v-if="isBudgetLinkedEvent" class="event-drawer__linked-budget card">
            <div>
              <span>₽ Управляется бюджетом</span>
              <p>Название и сумма меняются в бюджете. Дату можно изменить здесь или перетащить событие в календаре.</p>
            </div>
            <UiButton type="button" size="sm" variant="secondary" @click="$emit('open-linked', editingEvent)">
              Открыть в бюджете
            </UiButton>
          </section>

          <section v-if="isCourseLinkedEvent" class="event-drawer__linked-budget card">
            <div>
              <span>▶ Занятие из Courses</span>
              <p>Можно перенести занятие на другой день или время. Расписание курса обновится автоматически.</p>
            </div>
            <UiButton type="button" size="sm" variant="secondary" @click="$emit('open-linked', editingEvent)">
              Открыть урок
            </UiButton>
          </section>
          <UiInput
            ref="titleInputRef"
            autofocus
            v-model="form.title"
            label="Название"
            placeholder="Встреча, врач, тренировка..."
            required
            :disabled="isBudgetLinkedEvent || isCourseLinkedEvent"
            :error="errors.title"
          />


      <div class="event-drawer__grid">
        <UiInput v-model="form.date" type="date" label="Дата" required :error="errors.date" />
        <label class="event-drawer__toggle"><span>Весь день</span><UiToggle v-model="form.allDay" /></label>
      </div>
          <div v-if="!form.allDay" class="event-drawer__grid">
            <UiInput v-model="form.startTime" type="time" label="Начало" />
            <UiInput v-model="form.endTime" type="time" label="Конец" :error="errors.endTime" />
          </div>



<label class="event-drawer__select">
              <span>Напоминание</span>
              <UiSelect v-model="form.reminder">
                <option v-for="reminder in REMINDER_OPTIONS" :key="reminder.value" :value="reminder.value">
                  {{ reminder.label }}
                </option>
              </UiSelect>
            </label>
      <EventFormSection v-model="sectionOpen.repeat" title="Повторение" :summary="repeatSummary">
<label class="event-drawer__select">
              <span>Повтор</span>
              <UiSelect v-model="form.repeat">
                <option v-for="option in REPEAT_OPTIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </UiSelect>
            </label>
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


</EventFormSection>
      <EventFormSection v-model="sectionOpen.people" title="Участники и обсуждение" :summary="peopleSummary + (form.comments.length ? ' · Комментарии: ' + form.comments.length : '')">
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


      </EventFormSection>
      <EventFormSection v-model="sectionOpen.details" title="Описание и место" :summary="[form.location, form.notes].filter(Boolean).join(' · ') || 'Добавить подробности'">
          <UiInput v-model="form.location" label="Место" placeholder="Офис, дом, школа..." />
          <UiInput v-model="form.notes" type="textarea" label="Заметки" placeholder="Дополнительная информация" />


      </EventFormSection>
      <EventFormSection v-model="sectionOpen.organization" title="Календарь и оформление" :summary="organizationSummary">
<label class="event-drawer__select">
            <span>Календарь</span>
            <UiSelect v-model="form.calendarId">
              <option v-for="calendar in calendars" :key="calendar.id" :value="calendar.id">
                {{ calendar.name }}
              </option>
            </UiSelect>
          </label>
<div class="event-drawer__grid"><label class="event-drawer__select">
              <span>Категория</span>
              <UiSelect v-model="form.category">
                <option v-for="category in EVENT_FORM_CATEGORIES" :key="category.value" :value="category.value">
                  {{ category.label }}
                </option>
              </UiSelect>
            </label><label class="event-drawer__select">
              <span>Важность</span>
              <UiSelect v-model="form.importance">
                <option v-for="importance in IMPORTANCE_OPTIONS" :key="importance.value" :value="importance.value">
                  {{ importance.label }}
                </option>
              </UiSelect>
            </label></div>
</EventFormSection>
      <EventFormSection v-if="!editingEvent" v-model="sectionOpen.templates" title="Заполнить по шаблону" summary="Готовые варианты событий">
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


</EventFormSection>
      <EventFormSection v-if="editingEvent" v-model="sectionOpen.actions" title="Другие действия" summary="Копирование, экспорт и удаление">
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


        <div class="event-editor__actions">
          <UiButton variant="ghost" type="button" @click="exportIcs">Экспорт .ics</UiButton>
          <UiButton variant="danger" type="button" @click="remove">Удалить событие</UiButton>
        </div>
      </EventFormSection>
      <p v-if="Object.keys(errors).length" class="event-editor__error" role="alert">{{ Object.values(errors).join('. ') }}</p>
      <footer class="event-drawer__footer">
        <span class="event-editor__shortcut">Ctrl / ⌘ + Enter</span>
        <UiButton variant="secondary" type="button" @click="$emit('update:modelValue', false)">Отмена</UiButton>
        <UiButton type="submit">{{ editingEvent ? 'Сохранить' : 'Создать событие' }}</UiButton>
      </footer>
    </form>
  </UiModal>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import UiInput from '../ui/UiInput.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiButton from '../ui/UiButton.vue'
import UiChip from '../ui/UiChip.vue'
import UiToggle from '../ui/UiToggle.vue'
import UiModal from '../ui/UiModal.vue'
import EventFormSection from './EventFormSection.vue'
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
import { getCategoryMeta } from '../../utils/formatters/calendarFormatter.js'
import { validateEvent } from '../../utils/validators/calendarValidator.js'
import { authStore } from '../../stores/auth.store.js'
import { generateId } from '../../utils/helpers/idGenerator.js'
import { exportEventToIcs } from '../../services/calendarExport.service.js'
import { addMinutesToEventTime, createEmptyEventForm, normalizeEventForm } from './eventFormMapper.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  editingEvent: { type: Object, default: null },
  selectedDateKey: { type: String, default: '' },
  initialStartTime: { type: String, default: '' },
  members: { type: Array, default: () => [] },
  calendars: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'create', 'update', 'delete', 'duplicate', 'comment', 'open-linked'])

const titleInputRef = ref(null)
const errors = reactive({})
const form = reactive(createEmptyEventForm({ calendarId: props.calendars[0]?.id || '' }))
const duplicateMode = ref('tomorrow')
const duplicateDatesInput = ref('')
const commentText = ref('')
const currentUserId = authStore.currentUserId
const RESPONSE_OPTIONS = [
  { value: 'accepted', label: 'Буду' },
  { value: 'maybe', label: 'Возможно' },
  { value: 'declined', label: 'Не смогу' },
]
const categoryMeta = computed(() => getCategoryMeta(form.category))
const isBudgetLinkedEvent = computed(() => props.editingEvent?.linkedEntityType === 'budget-payment')
const isCourseLinkedEvent = computed(() => props.editingEvent?.linkedEntityType === 'course-lesson')
const selectedCalendar = computed(() => props.calendars.find((calendar) => calendar.id === form.calendarId))
const calendarName = computed(() => selectedCalendar.value?.name || '')
const sectionOpen = reactive({ repeat: false, people: false, details: false, organization: false, actions: false, templates: false })
const repeatSummary = computed(() => REPEAT_OPTIONS.find((option) => option.value === form.repeat)?.label || 'Без повтора')
const peopleSummary = computed(() => form.memberIds.length ? props.members.filter((member) => form.memberIds.includes(member.id)).map((member) => member.name).join(', ') : 'Все участники')
const organizationSummary = computed(() => [calendarName.value, categoryMeta.value.label, IMPORTANCE_OPTIONS.find((option) => option.value === form.importance)?.label].filter(Boolean).join(' · '))

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
    if (Object.keys(errors).some((key) => key.startsWith('repeat'))) sectionOpen.repeat = true
    if (errors.category || errors.importance) sectionOpen.organization = true
    nextTick(() => document.querySelector('.event-editor__error')?.scrollIntoView?.({ block: 'nearest' }))
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

const exportIcs = () => {
  if (props.editingEvent) exportEventToIcs({ ...props.editingEvent, ...form })
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
    form.endTime = addMinutesToEventTime(form.startTime, template.duration)
  }
}

function resetForm() {
  Object.keys(errors).forEach((key) => delete errors[key])
  Object.assign(
    form,
    createEmptyEventForm({ date: props.selectedDateKey, calendarId: props.calendars[0]?.id || '' }),
    props.editingEvent ? normalizeEventForm(props.editingEvent) : {}
  )
  if (!props.editingEvent && props.initialStartTime) {
    form.startTime = props.initialStartTime
    form.endTime = addMinutesToEventTime(props.initialStartTime, 60)
  }
  Object.keys(sectionOpen).forEach((key) => { sectionOpen[key] = false })
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
  const comment = {
    id: generateId(),
    userId: currentUserId.value,
    userName: authStore.currentUser.value?.name || 'Пользователь',
    text,
    createdAt: new Date().toISOString(),
  }
  form.comments = [
    ...form.comments,
    comment,
  ]
  commentText.value = ''
  if (props.editingEvent) emit('comment', props.editingEvent.id, comment)
}

</script>

<style scoped>
.event-drawer__linked-budget {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px;
  border-color: color-mix(in srgb, var(--success) 30%, var(--border-color));
  background: color-mix(in srgb, var(--success) 7%, var(--control-bg));
}

.event-drawer__linked-budget span {
  color: var(--success);
  font-size: 10px;
  font-weight: 850;
  text-transform: uppercase;
}

.event-drawer__linked-budget p {
  margin: 3px 0 0;
  color: var(--text-muted);
  font-size: 9px;
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




.event-drawer__form { display: grid; gap: 14px; }
.event-drawer__form > * { min-width: 0; }
.event-drawer__repeat, .event-drawer__collaboration, .event-drawer__duplicate, .event-drawer__templates { display: grid; gap: 12px; }
.event-drawer__collaboration { margin-top: 12px; }
.event-drawer__toggle { align-self: end; min-height: 42px; }
.event-drawer__footer { position: sticky; bottom: -16px; z-index: 2; display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin: 0 -16px -16px; padding: 14px 16px; border-top: 1px solid var(--border-color); background: var(--panel-bg); }
.event-editor__shortcut { margin-right: auto; color: var(--text-muted); font-size: 11px; }
.event-editor__actions { display: flex; flex-wrap: wrap; gap: 8px; }
.event-editor__error { color: var(--danger); font-size: 13px; }
.event-drawer__linked-budget p { font-size: 12px; }
.event-drawer__select > span, .event-drawer__members > span { font-size: 12px; }
@media (max-width: 480px) {
  .event-editor__shortcut { display: none; }
  .event-drawer__footer > * { flex: 1; }
  .event-drawer__linked-budget { align-items: stretch; flex-direction: column; }
  .event-drawer__duplicate-row { grid-template-columns: 1fr; }
}
</style>
