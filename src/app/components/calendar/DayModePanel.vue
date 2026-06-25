<template>
  <section class="day-mode">
    <header class="day-mode__hero">
      <div>
        <p>Режим дня</p>
        <h2>{{ dayTitle }}</h2>
        <p v-if="holidays.length" class="day-mode__holiday">
          ✦ {{ holidayNames }}
        </p>
        <span>{{ events.length }} {{ eventWord }}</span>
      </div>

      <div class="day-mode__hero-side">
        <article class="day-mode__next">
          <span>Следующее</span>
          <strong>{{ nextEvent?.title || 'Событий больше нет' }}</strong>
          <small>{{ nextEventLabel }}</small>
        </article>
        <UiButton icon="＋" @click="$emit('create-event')">Событие</UiButton>
      </div>
    </header>

    <TimeWorkedSummary :summary="timeSummary" variant="day" />

    <div
      v-if="allDayEvents.length"
      class="day-mode__all-day"
      :data-calendar-drop-date="selectedDateKey"
      @dragover.prevent
      @drop="handleDayDrop"
    >
      <span>Весь день</span>
      <EventCard
        v-for="event in allDayEvents"
        :key="event.id"
        :event="event"
        :members="members"
        @edit="$emit('edit-event', event)"
      />
    </div>

    <section class="day-mode__timeline">
      <div class="day-mode__section-heading">
        <h3>Таймлайн</h3>
        <small>Перетаскивай события на нужный час</small>
      </div>

      <div class="day-mode__hours">
        <article
          v-for="hour in DAY_TIMELINE_HOURS"
          :key="hour"
          class="day-mode__hour"
          :data-calendar-drop-date="selectedDateKey"
          :data-calendar-drop-time="`${String(hour).padStart(2, '0')}:00`"
          @dragover.prevent
          @drop="handleHourDrop(hour, $event)"
        >
          <time>{{ formatHour(hour) }}</time>
          <div class="day-mode__hour-line">
            <transition-group name="list" tag="div" class="day-mode__hour-events">
              <article
                v-for="event in getEventsForHour(hour)"
                :key="event.id"
                class="day-mode__event"
                :style="{ '--event-color': getEventColor(event) }"
                draggable="true"
                @dragstart="handleDragStart(event, $event)"
                @pointerdown.stop="beginTouchDrag(event, $event, moveEvent)"
                @dblclick="$emit('edit-event', event)"
              >
                <div class="day-mode__time">{{ formatTimeRange(event.startTime, event.endTime, event.allDay) }}</div>
                <div class="day-mode__event-body">
                  <h4>
                    {{ formatEventTitle(event) }}
                    <small v-if="event.linkedEntityType === 'budget-payment'" class="day-mode__source">Бюджет</small>
                  </h4>
                  <p>{{ formatEventMembers(event.memberIds, members) }}</p>
                  <small v-if="event.location">{{ event.location }}</small>
                </div>
                <div class="day-mode__event-actions">
                  <button type="button" title="Уменьшить на 15 минут" @click="$emit('resize-event', { eventId: event.id, minutesDelta: -15 })">−15</button>
                  <button type="button" title="Увеличить на 15 минут" @click="$emit('resize-event', { eventId: event.id, minutesDelta: 15 })">+15</button>
                  <button type="button" @click="$emit('edit-event', event)">Открыть</button>
                </div>
              </article>
            </transition-group>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import UiButton from '../ui/UiButton.vue'
import EventCard from './EventCard.vue'
import { DAY_TIMELINE_HOURS } from '../../utils/constants/calendarConstants.js'
import { formatDateShort, formatTimeRange, formatWeekday } from '../../utils/formatters/dateFormatter.js'
import { formatEventMembers, formatEventTitle, getEventAccent } from '../../utils/formatters/calendarFormatter.js'
import { calendarCollectionStore } from '../../stores/calendarCollection.store.js'
import { useTouchEventDrag } from '../../composables/calendar/useTouchEventDrag.js'
import TimeWorkedSummary from '../time-tracking/TimeWorkedSummary.vue'

const props = defineProps({
  selectedDateKey: { type: String, required: true },
  events: { type: Array, default: () => [] },
  members: { type: Array, default: () => [] },
  holidays: { type: Array, default: () => [] },
  timeSummary: { type: Object, default: null },
})

const emit = defineEmits(['create-event', 'edit-event', 'move-event', 'resize-event'])
const { beginTouchDrag } = useTouchEventDrag()

const timedEvents = computed(() => props.events.filter((event) => !event.allDay))
const allDayEvents = computed(() => props.events.filter((event) => event.allDay))
const firstEvent = computed(() => timedEvents.value[0] || allDayEvents.value[0] || null)
const nextEvent = computed(() => {
  const now = new Date()
  return timedEvents.value.find((event) => new Date(`${event.date}T${event.startTime || '00:00'}`) > now) || firstEvent.value
})

const dayTitle = computed(() => `${formatWeekday(props.selectedDateKey)}, ${formatDateShort(props.selectedDateKey)}`)
const holidayNames = computed(() => props.holidays.map((holiday) => holiday.name).join(' · '))
const eventWord = computed(() => pluralize(props.events.length, ['событие', 'события', 'событий']))
const nextEventLabel = computed(() => {
  if (!nextEvent.value) return 'Можно добавить план на этот день'
  if (nextEvent.value.allDay) return 'На весь день'
  return `${formatTimeRange(nextEvent.value.startTime, nextEvent.value.endTime, false)} · ${formatEventMembers(nextEvent.value.memberIds, props.members)}`
})

function getEventsForHour(hour) {
  return timedEvents.value.filter((event) => Number(event.startTime?.split(':')?.[0]) === hour)
}

function formatHour(hour) {
  return `${String(hour).padStart(2, '0')}:00`
}

function handleDragStart(event, dragEvent) {
  dragEvent.dataTransfer.effectAllowed = 'copyMove'
  dragEvent.dataTransfer.setData('text/calendar-event-id', event.id)
  dragEvent.dataTransfer.setData('text/plain', event.id)
}

function handleDayDrop(dropEvent) {
  const eventId = dropEvent.dataTransfer.getData('text/calendar-event-id') || dropEvent.dataTransfer.getData('text/plain')
  if (!eventId) return
  emit('move-event', { eventId, date: props.selectedDateKey, copy: dropEvent.altKey })
}

function handleHourDrop(hour, dropEvent) {
  const eventId = dropEvent.dataTransfer.getData('text/calendar-event-id') || dropEvent.dataTransfer.getData('text/plain')
  if (!eventId) return
  emit('move-event', { eventId, date: props.selectedDateKey, time: `${String(hour).padStart(2, '0')}:00`, copy: dropEvent.altKey })
}

function moveEvent(payload) {
  emit('move-event', payload)
}

function getEventColor(event) {
  return calendarCollectionStore.getCollection(event.calendarId)?.color || getEventAccent(event.memberIds, props.members)
}

function pluralize(value, words) {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return words[2]
  if (last === 1) return words[0]
  if (last >= 2 && last <= 4) return words[1]
  return words[2]
}
</script>

<style scoped>
.day-mode {
  display: grid;
  gap: 12px;
}

.day-mode__holiday {
  display: inline-flex;
  width: fit-content;
  max-width: min(620px, 100%);
  margin: 7px 0 5px;
  border: 1px solid color-mix(in srgb, var(--warning) 28%, var(--border-color));
  border-radius: var(--radius-pill);
  padding: 4px 8px;
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 8%, transparent);
  font-size: 10px;
  font-weight: 750;
  line-height: 1.35;
}

.day-mode__hero {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 14px;
  background: var(--card-solid);
}

.day-mode__hero p,
.day-mode__section-heading small,
.day-mode__next span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.day-mode__hero h2 {
  margin: 2px 0 4px;
  text-transform: capitalize;
}

.day-mode__hero span,
.day-mode__next small {
  color: var(--text-secondary);
}

.day-mode__hero-side {
  display: flex;
  align-items: center;
  gap: 8px;
}

.day-mode__next {
  min-width: 180px;
  display: grid;
  gap: 3px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  background: var(--card-soft);
}

.day-mode__all-day {
  display: grid;
  gap: 6px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-md);
  padding: 10px;
  background: var(--bg-secondary);
}

.day-mode__all-day > span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.day-mode__timeline {
  display: grid;
  gap: 8px;
}

.day-mode__section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 8px;
}

.day-mode__section-heading h3 {
  margin: 0;
}

.day-mode__hours {
  display: grid;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--control-bg-solid);
}

.day-mode__hour {
  display: grid;
  grid-template-columns: 54px 1fr;
  min-height: 56px;
  border-bottom: 1px solid var(--border-color);
}

.day-mode__hour:last-child {
  border-bottom: 0;
}

.day-mode__hour time {
  padding: 10px 8px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
}

.day-mode__hour-line {
  min-width: 0;
  padding: 7px 8px;
  border-left: 1px solid var(--border-color);
}

.day-mode__hour-events {
  display: grid;
  gap: 6px;
}

.day-mode__event {
  display: grid;
  grid-template-columns: 58px 1fr auto;
  gap: 8px;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--event-color) 30%, var(--border-color));
  border-radius: var(--radius-md);
  padding: 7px;
  background: color-mix(in srgb, var(--event-color) 9%, #0d0d0d);
  cursor: grab;
}

.day-mode__time {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
}

.day-mode__event-body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.day-mode__event-body h4,
.day-mode__event-body p {
  margin: 0;
}

.day-mode__event-body h4 {
  font-size: 12px;
}

.day-mode__event-body .day-mode__source {
  display: inline-block;
  margin-left: 5px;
  border-radius: var(--radius-pill);
  padding: 2px 5px;
  color: var(--success);
  background: color-mix(in srgb, var(--success) 10%, transparent);
  font-size: 8px;
  font-weight: 800;
  vertical-align: middle;
}

.day-mode__event-body p,
.day-mode__event-body small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-mode__event-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.day-mode__event button {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 5px 8px;
  color: var(--text-secondary);
  background: var(--bg-primary);
  font-size: 11px;
}

@media (max-width: 760px) {
  .day-mode__hero,
  .day-mode__hero-side,
  .day-mode__section-heading {
    display: grid;
  }

  .day-mode__next {
    min-width: 0;
  }

  .day-mode__event {
    grid-template-columns: 1fr;
  }
}
</style>
