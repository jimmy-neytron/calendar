<template>
  <aside class="today-rail panel">
    <header class="today-rail__header">
      <div>
        <p>{{ formatWeekday(selectedDateKey) }}</p>
        <h2>{{ formatDateShort(selectedDateKey) }}</h2>
      </div>
      <UiButton icon="＋" icon-only @click="$emit('create-event')" />
    </header>

    <section class="today-rail__overview">
      <article>
        <span>Дальше</span>
        <strong>{{ nextEvent?.title || 'Свободное время' }}</strong>
        <small>{{ nextEvent ? nextEventTime : 'Можно запланировать важное' }}</small>
      </article>
      <article>
        <span>Загрузка</span>
        <strong>{{ busyMinutesLabel }}</strong>
        <div><i :style="{ width: `${dayLoadPercent}%` }" /></div>
      </article>
      <article>
        <span>Спорт</span>
        <strong>{{ sportProgress.done }}/{{ sportProgress.total }}</strong>
        <small>выполнено</small>
      </article>
    </section>

    <section v-if="reminders.length" class="today-rail__section today-rail__section--reminders">
      <h3>Скоро</h3>
      <article v-for="event in reminders" :key="event.id" class="today-rail__reminder">
        <strong>{{ event.title }}</strong>
        <small>{{ event.date }} · {{ event.startTime }}</small>
      </article>
    </section>

    <section v-if="freeWindows.length" class="today-rail__section">
      <h3>Свободные окна</h3>
      <div class="today-rail__free-windows">
        <button v-for="slot in freeWindows" :key="slot.start" type="button" @click="$emit('quick-create', slot.start)">
          <strong>{{ slot.start }}–{{ slot.end }}</strong>
          <small>{{ slot.duration }} мин</small>
        </button>
      </div>
    </section>

    <section class="today-rail__section">
      <h3>События дня</h3>
      <transition-group name="list" tag="div" class="today-rail__events">
        <EventCard
          v-for="event in selectedEvents"
          :key="event.id"
          :event="event"
          :members="members"
          @edit="$emit('edit-event', event)"
        />
      </transition-group>
      <p v-if="!selectedEvents.length" class="today-rail__empty">На эту дату событий нет.</p>
    </section>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import UiButton from '../ui/UiButton.vue'
import EventCard from './EventCard.vue'
import { formatDateShort, formatWeekday } from '../../utils/formatters/dateFormatter.js'
import { sportStore } from '../../stores/sport.store.js'

const props = defineProps({
  selectedDateKey: { type: String, required: true },
  selectedEvents: { type: Array, default: () => [] },
  members: { type: Array, default: () => [] },
  calendars: { type: Array, default: () => [] },
  reminders: { type: Array, default: () => [] },
})

defineEmits(['create-event', 'edit-event', 'quick-create'])

const todayKey = new Date().toISOString().slice(0, 10)
const timedEvents = computed(() => props.selectedEvents
  .filter((event) => !event.allDay && event.startTime && event.endTime)
  .sort((a, b) => a.startTime.localeCompare(b.startTime)))
const nextEvent = computed(() => {
  const nowTime = new Date().toTimeString().slice(0, 5)
  return timedEvents.value.find((event) => props.selectedDateKey > todayKey || event.endTime >= nowTime) || null
})
const nextEventTime = computed(() => `${nextEvent.value?.startTime || ''}–${nextEvent.value?.endTime || ''}`)
const busyMinutes = computed(() => timedEvents.value.reduce((sum, event) => sum + difference(event.startTime, event.endTime), 0))
const busyMinutesLabel = computed(() => `${Math.floor(busyMinutes.value / 60)} ч ${busyMinutes.value % 60} мин`)
const dayLoadPercent = computed(() => Math.min(100, Math.round(busyMinutes.value / (12 * 60) * 100)))
const sportProgress = computed(() => sportStore.getDayProgress(props.selectedDateKey))
const freeWindows = computed(() => {
  const result = []
  let cursor = '08:00'
  timedEvents.value.forEach((event) => {
    const duration = difference(cursor, event.startTime)
    if (duration >= 30) result.push({ start: cursor, end: event.startTime, duration })
    if (event.endTime > cursor) cursor = event.endTime
  })
  const tail = difference(cursor, '20:00')
  if (tail >= 30) result.push({ start: cursor, end: '20:00', duration: tail })
  return result.slice(0, 3)
})

function difference(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, eh * 60 + em - sh * 60 - sm)
}
</script>

<style scoped>
.today-rail {
  position: sticky;
  top: calc(var(--header-height) + 14px);
  align-self: start;
  display: grid;
  gap: 10px;
  padding: 12px;
}

.today-rail__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.today-rail__header p {
  margin-bottom: 4px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.today-rail__header h2 { margin: 0; text-transform: capitalize; }
.today-rail__overview { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.today-rail__overview article {
  display: grid;
  gap: 3px;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 8px;
  background: var(--card-soft);
}
.today-rail__overview span,
.today-rail__overview small { color: var(--text-muted); font-size: 9px; }
.today-rail__overview strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.today-rail__overview article > div { height: 4px; overflow: hidden; border-radius: 99px; background: var(--control-bg); }
.today-rail__overview i { display: block; height: 100%; border-radius: inherit; background: var(--info); }
.today-rail__section { display: grid; gap: 8px; padding-top: 10px; border-top: 1px solid var(--border-color); }
.today-rail__section h3 { margin: 0; }
.today-rail__events { display: grid; gap: 8px; }
.today-rail__reminder {
  display: grid;
  gap: 2px;
  border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
  border-radius: var(--radius-md);
  padding: 8px;
  background: color-mix(in srgb, var(--warning) 7%, transparent);
}
.today-rail__reminder strong { font-size: 12px; }
.today-rail__reminder small,
.today-rail__empty { margin: 0; color: var(--text-muted); }
.today-rail__free-windows { display: flex; flex-wrap: wrap; gap: 5px; }
.today-rail__free-windows button {
  display: grid;
  border: 1px dashed var(--border-strong);
  border-radius: 9px;
  padding: 6px 8px;
  color: var(--text-secondary);
  background: transparent;
  text-align: left;
}
.today-rail__free-windows small { color: var(--text-muted); font-size: 9px; }

@media (max-width: 1100px) {
  .today-rail { position: static; }
}

@media (max-width: 520px) {
  .today-rail__overview { grid-template-columns: 1fr; }
}
</style>
