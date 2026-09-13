<template>
  <section class="flexible-panel panel">
    <div class="flexible-panel__header">
      <div><strong>Гибкое расписание</strong><p>Выберите удобные часы — календарь найдёт время для занятий.</p></div>
      <UiButton variant="secondary" :disabled="busy" @click="openCreate">Подобрать расписание</UiButton>
    </div>
    <p v-if="conflicts.length" class="flexible-panel__warning" role="status">Нужен перенос: {{ conflicts.length }}. Откройте занятия ниже и выберите новое время.</p>
    <details v-if="flexibleEvents.length">
      <summary>Мои гибкие занятия · {{ flexibleEvents.length }}</summary>
      <div class="flexible-panel__list">
        <article v-for="event in flexibleEvents" :key="event.id" class="flexible-panel__event">
          <div><strong>{{ event.title }}</strong><p>{{ label(event) }} <span v-if="conflicts.some(e => e.id === event.id)"> · Пересечение</span><span v-if="event.flexibleRule?.locked"> · Закреплено</span></p></div>
          <div class="flexible-panel__actions">
            <UiButton size="sm" variant="secondary" :disabled="busy" @click="toggleLock(event)">{{ event.flexibleRule?.locked ? 'Открепить' : 'Закрепить' }}</UiButton>
            <UiButton v-if="canReschedule(event)" size="sm" variant="secondary" :disabled="busy" @click="openMove(event)">Подобрать перенос</UiButton>
          </div>
        </article>
      </div>
    </details>
    <div v-if="message || undoEntries.length" class="flexible-panel__status" role="status"><span>{{ message }}</span><UiButton v-if="undoEntries.length" size="sm" variant="secondary" :disabled="busy" @click="undo">Отменить сохранение</UiButton></div>
    <UiModal :model-value="open" :title="moving ? 'Подобрать перенос' : 'Гибкое событие'" eyebrow="Планирование без пересечений" width="760px" :close-on-overlay="!busy" :close-on-escape="!busy" :hide-close="busy" @update:model-value="close">
      <form class="flexible-form" @submit.prevent="generate">
        <fieldset v-if="!moving" :disabled="busy">
          <label>Название<input v-model="title" maxlength="200" required placeholder="Например, английский" /></label>
          <div class="flexible-form__grid">
            <label>Начать с<input v-model="request.from" type="date" :min="today" required /></label>
            <label>Календарь<select v-model="calendarId" required><option v-for="calendar in calendars" :key="calendar.id" :value="calendar.id">{{ calendar.name }}</option></select></label>
            <label>Занятий в неделю<input v-model.number="request.count" type="number" min="1" max="7" required /></label>
            <label>Недель<input v-model.number="request.weeks" type="number" min="1" max="8" required /></label>
            <label>Длительность, минут<input v-model.number="request.duration" type="number" min="15" max="720" required /></label>
            <label>Пауза до и после, минут<input v-model.number="request.buffer" type="number" min="0" max="120" required /></label>
            <label>Не раньше<input v-model="request.startTime" type="time" required /></label>
            <label>Закончить до<input v-model="request.endTime" type="time" required /></label>
          </div>
          <div class="flexible-form__weekdays" role="group" aria-label="Допустимые дни недели"><button v-for="day in weekdays" :key="day.value" type="button" :aria-pressed="request.weekdays.includes(day.value)" @click="toggleDay(day.value)">{{ day.label }}</button></div>
          <small>Не больше одного занятия в день. Неделя — с понедельника по воскресенье; первая может быть неполной. События на весь день занимают весь день; без времени окончания — 1 час.</small>
          <UiButton type="submit">{{ preview.length ? 'Подобрать заново' : 'Подобрать время' }}</UiButton>
        </fieldset>
        <p v-else>«{{ moving.title }}» · сейчас {{ label(moving) }}. Перенос возможен в пределах исходной недели и выбранных часов.</p>
        <p v-if="error" role="alert" class="flexible-panel__warning">{{ error }}</p>
        <section v-if="generated" class="flexible-preview" aria-label="Предпросмотр расписания">
          <div><strong>{{ moving ? 'Новое время' : `Предпросмотр · ${preview.length} занятий` }}</strong><p>Изменения появятся в календаре после нажатия «Применить».</p></div>
          <p v-for="shortage in shortages" :key="shortage.week" class="flexible-panel__warning">Неделя с {{ formatDate(shortage.week) }}: не удалось разместить {{ shortage.missing }}.</p>
          <article v-for="(event, index) in preview" :key="event.id" class="flexible-preview__card">
            <strong>{{ event.title }}</strong>
            <label>Дата и время<select :value="slotKey(event)" :disabled="busy" @change="changeSlot(index, ($event.target as HTMLSelectElement).value)"><option v-for="slot in options(index)" :key="slotKey(slot)" :value="slotKey(slot)">{{ label(slot) }}</option></select></label>
          </article>
          <p v-if="!preview.length">В подходящие часы нет свободного времени. Измените условия или освободите интервал.</p>
          <label v-if="shortages.length && preview.length" class="flexible-form__check"><input v-model="acceptPartial" type="checkbox" />Добавить только найденные занятия</label>
          <UiButton v-if="preview.length" :disabled="busy || (shortages.length > 0 && !acceptPartial)" @click="save">{{ busy ? 'Сохраняем…' : 'Применить' }}</UiButton>
        </section>
        <p v-if="message" role="status">{{ message }}</p>
      </form>
    </UiModal>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { workspaceStore } from '../../stores/workspace.store.js'
import UiButton from '../ui/UiButton.vue'
import UiModal from '../ui/UiModal.vue'
import { useFlexibleSchedule } from '../../composables/calendar/useFlexibleSchedule'
import { availableSlots, canReschedule, dateKey, planSchedule, validateRequest, type ScheduleRequest, type ScheduledEvent, type Slot } from '../../services/flexibleSchedule'

const props = defineProps<{ selectedDate: string; calendars: { id: string; name: string }[] }>()
const { events, flexibleEvents, conflicts, alternatives, apply, undo, toggleLock, busy, message, undoEntries } = useFlexibleSchedule()
const open = ref(false)
const title = ref('')
const calendarId = ref('')
const moving = ref<ScheduledEvent | null>(null)
const preview = ref<ScheduledEvent[]>([])
const shortages = ref<{ week: string; missing: number }[]>([])
const generated = ref(false)
const error = ref('')
const acceptPartial = ref(false)
const today = dateKey(new Date())
const request = reactive<ScheduleRequest>({ from: today, weeks: 1, count: 3, weekdays: [1, 2, 3, 4, 5], startTime: '18:00', endTime: '21:00', duration: 45, buffer: 15 })
const weekdays = [{ value: 1, label: 'Пн' }, { value: 2, label: 'Вт' }, { value: 3, label: 'Ср' }, { value: 4, label: 'Чт' }, { value: 5, label: 'Пт' }, { value: 6, label: 'Сб' }, { value: 0, label: 'Вс' }]
function clearPreview() { preview.value = []; shortages.value = []; generated.value = false; acceptPartial.value = false; error.value = '' }
watch([request, title, calendarId], clearPreview, { deep: true, flush: 'sync' })
watch(workspaceStore.activeWorkspaceId, () => { open.value = false; moving.value = null; clearPreview() })
function openCreate() { moving.value = null; request.from = props.selectedDate < today ? today : props.selectedDate; calendarId.value = props.calendars[0]?.id || ''; clearPreview(); message.value = ''; open.value = true }
function close(value: boolean) { if (!busy.value) open.value = value }
function toggleDay(day: number) { request.weekdays = request.weekdays.includes(day) ? request.weekdays.filter(d => d !== day) : [...request.weekdays, day] }
function generate() {
  clearPreview()
  error.value = !title.value.trim() ? 'Введите название.' : !calendarId.value ? 'Выберите календарь.' : validateRequest(request)
  if (error.value) return
  const result = planSchedule(request, events.value, crypto.randomUUID())
  preview.value = result.planned.map(event => ({ ...event, title: title.value.trim() }))
  shortages.value = result.shortages
  generated.value = true
}
function openMove(event: ScheduledEvent) {
  clearPreview(); moving.value = event; message.value = ''; open.value = true; generated.value = true
  const slot = alternatives(event).find(s => slotKey(s) !== slotKey(event))
  if (slot) preview.value = [{ ...event, ...slot }]
}
function slotKey(slot: Partial<Slot>) { return `${slot.date}|${slot.startTime}` }
function formatDate(date: string) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' }).format(new Date(`${date}T12:00:00`)) }
function label(slot: Partial<Slot>) { return `${formatDate(slot.date!)} · ${slot.startTime}–${slot.endTime}` }
function options(index: number): Slot[] {
  const event = preview.value[index]
  if (!event?.flexibleRule) return []
  const occupied = [...events.value.filter(e => !moving.value || e.id !== moving.value.id), ...preview.value.filter((_, i) => i !== index)]
  return availableSlots(event.flexibleRule, occupied).filter(s => moving.value ? slotKey(s) !== slotKey(moving.value) : s.date >= request.from)
}
function changeSlot(index: number, key: string) {
  const slot = options(index).find(s => slotKey(s) === key)
  if (slot) preview.value[index] = { ...preview.value[index], ...slot }
}
async function save() {
  const success = await apply(preview.value, calendarId.value, Boolean(moving.value))
  clearPreview()
  if (success) open.value = false
}
</script>

<style scoped>
.flexible-panel { padding: 16px; display: grid; gap: 12px; }
.flexible-panel__header,.flexible-panel__event,.flexible-panel__status { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.flexible-panel p,.flexible-preview p { margin:5px 0 0; color:var(--text-secondary); font-size:13px; }
.flexible-panel summary { cursor:pointer; color:var(--accent); font-size:13px; padding:6px 0; }
.flexible-panel__list { max-height:320px; overflow:auto; }
.flexible-panel__event { padding:12px 0; border-bottom:1px solid var(--border-color); }
.flexible-panel__event strong { font-size:14px; }
.flexible-panel__actions { display:flex; gap:8px; flex-wrap:wrap; }
.flexible-panel__warning { color:var(--warning, #b7791f) !important; }
.flexible-form,.flexible-form fieldset { display:grid; gap:16px; }
.flexible-form fieldset { border:0; padding:0; margin:0; min-width:0; }
.flexible-form__grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.flexible-form label { display:grid; gap:6px; font-size:13px; color:var(--text-secondary); }
.flexible-form input,.flexible-form select { width:100%; min-width:0; border:1px solid var(--border-color); border-radius:9px; padding:10px 12px; background:var(--control-bg); color:var(--text-primary); font:inherit; }
.flexible-form input:focus-visible,.flexible-form select:focus-visible,.flexible-form button:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
.flexible-form__weekdays { display:flex; gap:6px; flex-wrap:wrap; }
.flexible-form__weekdays button { border:1px solid var(--border-color); border-radius:9px; background:var(--control-bg); color:var(--text-primary); padding:10px 14px; cursor:pointer; }
.flexible-form__weekdays button[aria-pressed=true] { background:var(--accent-soft); border-color:var(--accent); color:var(--accent); }
.flexible-form small { color:var(--text-muted); line-height:1.5; }
.flexible-preview { display:grid; gap:12px; border-top:1px solid var(--border-color); padding-top:16px; }
.flexible-preview__card { display:grid; gap:8px; background:var(--accent-soft); border:1px dashed var(--accent); border-radius:12px; padding:12px; }
.flexible-form .flexible-form__check { display:flex; align-items:center; }
.flexible-form__check input { width:auto; }
@media(max-width:600px) { .flexible-panel__header,.flexible-panel__event,.flexible-panel__status { align-items:stretch; flex-direction:column; } .flexible-form__grid { grid-template-columns:1fr; } }
</style>

