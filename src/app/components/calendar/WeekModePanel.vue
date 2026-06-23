<template>
  <div class="week-mode">
    <article
      v-for="day in weekRange"
      :key="day.key"
      class="week-mode__day"
      :data-calendar-drop-date="day.key"
      :class="{
        'week-mode__day--today': day.isToday,
        'week-mode__day--selected': day.key === selectedDateKey,
        'week-mode__day--birthday': hasBirthday(eventsByDate[day.key] || []),
        'week-mode__day--holiday': (holidaysByDate[day.key] || []).length,
      }"
      @click="$emit('select-date', day.key)"
      @dragover.prevent
      @drop.stop="handleDrop(day.key, $event)"
    >
      <header class="week-mode__header">
        <div>
          <span>{{ getWeekday(day.date) }}</span>
          <strong>{{ day.date.getDate() }}</strong>
        </div>
        <small v-if="day.isToday">Сегодня</small>
        <small v-else>{{ getMonth(day.date) }}</small>
      </header>

      <p v-if="(holidaysByDate[day.key] || []).length" class="week-mode__holiday">
        ✦ {{ formatHolidayNames(holidaysByDate[day.key]) }}
      </p>

      <div v-if="(eventsByDate[day.key] || []).length" class="week-mode__events">
        <EventCard
          v-for="event in eventsByDate[day.key]"
          :key="event.id"
          :event="event"
          :members="members"
          compact
          @edit="$emit('edit-event', event)"
          @move-event="$emit('move-event', $event)"
        />
      </div>

      <button v-else class="week-mode__empty" type="button" @click.stop="$emit('create-event', day.key)">
        <span>＋</span>
        Свободный день
      </button>
    </article>
  </div>
</template>

<script setup>
import EventCard from './EventCard.vue'

defineProps({
  weekRange: { type: Array, required: true },
  eventsByDate: { type: Object, required: true },
  selectedDateKey: { type: String, required: true },
  members: { type: Array, default: () => [] },
  holidaysByDate: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['select-date', 'edit-event', 'create-event', 'move-event'])

const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'short' })

function getWeekday(date) {
  return weekdayFormatter.format(date).replace('.', '')
}

function getMonth(date) {
  return monthFormatter.format(date).replace('.', '')
}

function handleDrop(date, dropEvent) {
  const eventId = dropEvent.dataTransfer.getData('text/calendar-event-id') || dropEvent.dataTransfer.getData('text/plain')
  if (!eventId) return
  emit('move-event', { eventId, date, copy: dropEvent.altKey })
}

function hasBirthday(events) {
  return events.some((event) => event.category === 'birthday' && /^день рождения:/i.test(event.title || ''))
}

function formatHolidayNames(holidays) {
  return holidays.map((holiday) => holiday.name).join(' · ')
}
</script>

<style scoped>
.week-mode {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 7px;
}

.week-mode__day {
  min-width: 0;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 9px;
  background: var(--control-bg);
  overflow: hidden;
  transition: border-color 0.18s var(--ease-out), background 0.18s var(--ease-out), transform 0.18s var(--ease-out);
}

.week-mode__day:hover {
  transform: translateY(-1px);
  border-color: var(--border-strong);
  background: var(--control-bg-hover);
}

.week-mode__day--selected {
  border-color: var(--accent-border);
}

.week-mode__day--today {
  border-color: var(--accent-hover);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent) 12%, transparent), transparent 110px),
    var(--control-bg);
  box-shadow: inset 0 3px 0 var(--accent);
}

.week-mode__day--holiday {
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--warning) 13%, transparent), transparent 50%),
    var(--control-bg);
}

.week-mode__day--birthday {
  border-color: color-mix(in srgb, var(--pink) 42%, var(--border-color));
}

.week-mode__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 5px;
  min-height: 43px;
  padding-bottom: 7px;
  border-bottom: 1px solid var(--border-color);
}

.week-mode__header div {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.week-mode__header span {
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.week-mode__header strong {
  font-size: 22px;
  line-height: 1;
}

.week-mode__header small {
  border-radius: var(--radius-pill);
  padding: 3px 5px;
  color: var(--text-muted);
  background: var(--field-bg-focus);
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
}

.week-mode__day--today .week-mode__header small {
  color: var(--text-inverse);
  background: var(--accent);
}

.week-mode__holiday {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--warning);
  font-size: 9px;
  font-weight: 750;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.week-mode__events {
  display: grid;
  align-content: start;
  gap: 6px;
}

.week-mode__empty {
  flex: 1;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 5px;
  min-height: 100px;
  border: 1px dashed transparent;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  background: transparent;
  font-size: 9px;
}

.week-mode__empty:hover {
  border-color: var(--border-strong);
  color: var(--text-secondary);
  background: var(--field-bg-focus);
}

.week-mode__empty span {
  font-size: 18px;
  line-height: 1;
}

@media (max-width: 1050px) {
  .week-mode {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .week-mode__day {
    min-height: 240px;
  }
}

@media (max-width: 760px) {
  .week-mode {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .week-mode__day {
    min-height: 210px;
  }
}

@media (max-width: 480px) {
  .week-mode {
    grid-template-columns: 1fr;
  }

  .week-mode__day {
    min-height: 150px;
  }
}
</style>
