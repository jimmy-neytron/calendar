<template>
  <button
    class="calendar-day"
    :class="{
      'calendar-day--muted': !day.isCurrentMonth,
      'calendar-day--today': day.isToday,
      'calendar-day--selected': selected,
      'calendar-day--drag-over': isDragOver,
      'calendar-day--birthday': hasBirthday,
    }"
    type="button"
    @click="$emit('select', day.key)"
    @dragenter.prevent="isDragOver = true"
    @dragover.prevent="isDragOver = true"
    @dragleave="isDragOver = false"
    @drop="handleDrop"
  >
    <header class="calendar-day__header">
      <span>{{ day.date.getDate() }}</span>
      <small v-if="hasBirthday" class="calendar-day__birthday-label">♡ День рождения</small>
      <small v-else-if="day.isToday">Сегодня</small>
    </header>

    <div class="calendar-day__events">
      <span
        v-for="event in visibleEvents"
        :key="event.id"
        class="calendar-day__event"
        :class="{ 'calendar-day__event--birthday': isBirthdayEvent(event) }"
        :style="{ '--event-color': getEventColor(event) }"
        draggable="true"
        @dragstart.stop="handleDragStart(event, $event)"
        @click.stop="$emit('edit-event', event)"
      >
        <b>{{ isBirthdayEvent(event) ? '🎁' : event.allDay ? 'Весь день' : event.startTime }}</b>
        {{ event.title }}
      </span>
      <span v-if="hiddenCount" class="calendar-day__more">+{{ hiddenCount }} ещё</span>
    </div>
  </button>
</template>

<script setup>
import { computed, ref } from 'vue'
import { getEventAccent } from '../../utils/formatters/calendarFormatter.js'
import { calendarCollectionStore } from '../../stores/calendarCollection.store.js'

const props = defineProps({
  day: { type: Object, required: true },
  events: { type: Array, default: () => [] },
  members: { type: Array, default: () => [] },
  selected: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'edit-event', 'move-event'])
const isDragOver = ref(false)

const visibleEvents = computed(() => [...props.events]
  .sort((first, second) => Number(isBirthdayEvent(second)) - Number(isBirthdayEvent(first)))
  .slice(0, 3))
const hiddenCount = computed(() => Math.max(0, props.events.length - visibleEvents.value.length))
const hasBirthday = computed(() => props.events.some(isBirthdayEvent))

function handleDragStart(event, dragEvent) {
  dragEvent.dataTransfer.effectAllowed = 'copyMove'
  dragEvent.dataTransfer.setData('text/calendar-event-id', event.id)
  dragEvent.dataTransfer.setData('text/plain', event.id)
}

function handleDrop(dropEvent) {
  isDragOver.value = false
  const eventId = dropEvent.dataTransfer.getData('text/calendar-event-id') || dropEvent.dataTransfer.getData('text/plain')
  if (!eventId) return
  emit('move-event', { eventId, date: props.day.key, copy: dropEvent.altKey })
}

function getEventColor(event) {
  return calendarCollectionStore.getCollection(event.calendarId)?.color || getEventAccent(event.memberIds, props.members)
}

function isBirthdayEvent(event) {
  return event.category === 'birthday' && /^день рождения:/i.test(event.title || '')
}
</script>

<style scoped>
.calendar-day {
  min-height: 112px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 8px;
  color: var(--text-primary);
  background: var(--control-bg);
  text-align: left;
  overflow: hidden;
  transition: transform 0.18s var(--ease-out), border 0.18s var(--ease-out), background 0.18s var(--ease-out);
}

.calendar-day:hover,
.calendar-day--drag-over {
  transform: translateY(-1px);
  border-color: var(--border-strong);
  background: var(--control-bg-hover);
}

.calendar-day--drag-over {
  outline: 1px dashed var(--accent-hover);
  outline-offset: -4px;
}

.calendar-day--muted {
  opacity: 0.42;
}

.calendar-day--today {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.calendar-day--selected {
  box-shadow: inset 0 0 0 1px var(--accent-hover);
}

.calendar-day--birthday {
  position: relative;
  border-color: color-mix(in srgb, var(--pink) 42%, var(--border-color));
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--pink) 18%, transparent), transparent 55%),
    color-mix(in srgb, var(--pink) 5%, var(--control-bg));
}

.calendar-day--birthday::after {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--pink);
  box-shadow: -9px 5px 0 color-mix(in srgb, var(--pink) 50%, transparent);
  content: '';
}

.calendar-day__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.calendar-day__header span {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--control-bg-hover);
  font-weight: 700;
}

.calendar-day__header small {
  color: var(--accent-hover);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.calendar-day__header .calendar-day__birthday-label {
  margin-right: 12px;
  color: var(--pink);
  letter-spacing: .02em;
  text-transform: none;
}

.calendar-day__events {
  display: grid;
  gap: 4px;
}

.calendar-day__event {
  overflow: hidden;
  border-left: 3px solid var(--event-color);
  border-radius: 6px;
  padding: 3px 5px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--event-color) 16%, var(--control-bg));
  font-size: 10px;
  line-height: 1.22;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: grab;
}

.calendar-day__event:active {
  cursor: grabbing;
}

.calendar-day__event--birthday {
  border-left-color: var(--pink);
  color: color-mix(in srgb, var(--pink) 75%, var(--text-primary));
  background: color-mix(in srgb, var(--pink) 14%, var(--control-bg));
  font-weight: 700;
}

.calendar-day__event b {
  margin-right: 4px;
  color: var(--text-secondary);
}

.calendar-day__more {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 600;
}

@media (max-width: 720px) {
  .calendar-day {
    min-height: 86px;
    padding: 7px;
    border-radius: 12px;
  }

  .calendar-day__event b {
    display: none;
  }
}
</style>
