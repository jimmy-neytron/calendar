<template>
  <section class="calendar-board panel">
    <header class="calendar-board__toolbar">
      <div>
        <p>Общий календарь пространства</p>
        <h1>{{ heading }}</h1>
      </div>

      <div class="calendar-board__actions">
        <div class="calendar-board__segmented">
          <button :class="{ active: mode === CALENDAR_MODES.MONTH }" type="button" @click="$emit('update:mode', CALENDAR_MODES.MONTH)">Месяц</button>
          <button :class="{ active: mode === CALENDAR_MODES.WEEK }" type="button" @click="$emit('update:mode', CALENDAR_MODES.WEEK)">Неделя</button>
          <button :class="{ active: mode === CALENDAR_MODES.DAY }" type="button" @click="$emit('update:mode', CALENDAR_MODES.DAY)">День</button>
        </div>
        <UiIconButton icon="left" label="Предыдущий период" @click="$emit('previous')" />
        <UiButton variant="secondary" @click="$emit('today')">Сегодня</UiButton>
        <UiIconButton icon="right" label="Следующий период" @click="$emit('next')" />
      </div>
    </header>

    <div class="calendar-board__members">
      <MemberPill v-for="member in members" :key="member.id" :member="member" />
    </div>

    <Transition :name="calendarTransitionName" mode="out-in">
      <div :key="periodKey" class="calendar-board__viewport">
        <template v-if="mode === CALENDAR_MODES.DAY">
          <DayModePanel
            :selected-date-key="selectedDateKey"
            :events="eventsByDate[selectedDateKey] || []"
            :members="members"
            @create-event="$emit('create-event')"
            @edit-event="$emit('edit-event', $event)"
            @move-event="$emit('move-event', $event)"
            @resize-event="$emit('resize-event', $event)"
          />
        </template>

        <template v-else>
          <div class="calendar-board__weekdays">
            <span v-for="day in WEEK_DAYS" :key="day">{{ day }}</span>
          </div>

          <transition-group v-if="mode === CALENDAR_MODES.MONTH" name="list" tag="div" class="calendar-board__grid">
            <CalendarDayCell
              v-for="day in monthGrid"
              :key="day.key"
              :day="day"
              :events="eventsByDate[day.key] || []"
              :members="members"
              :selected="day.key === selectedDateKey"
              @select="$emit('select-date', $event)"
              @edit-event="$emit('edit-event', $event)"
              @move-event="$emit('move-event', $event)"
            />
          </transition-group>

          <div v-else class="calendar-board__week">
            <div
              v-for="day in weekRange"
              :key="day.key"
              class="calendar-board__week-day"
              :class="{
                'calendar-board__week-day--today': day.isToday,
                'calendar-board__week-day--selected': day.key === selectedDateKey,
                'calendar-board__week-day--birthday': hasBirthday(eventsByDate[day.key] || []),
              }"
              @click="$emit('select-date', day.key)"
              @dragover.prevent
              @drop.stop="handleWeekDrop(day.key, $event)"
            >
              <div class="calendar-board__week-date">
                <span>{{ day.date.getDate() }}</span>
                <b>{{ WEEK_DAYS[day.date.getDay()] }}</b>
                <small v-if="hasBirthday(eventsByDate[day.key] || [])">♡ Праздник</small>
              </div>
              <EventCard
                v-for="event in eventsByDate[day.key] || []"
                :key="event.id"
                :event="event"
                :members="members"
                @edit="$emit('edit-event', event)"
              />
              <p v-if="!(eventsByDate[day.key] || []).length" class="calendar-board__empty">Свободный день</p>
            </div>
          </div>
        </template>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import UiButton from '../ui/UiButton.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import MemberPill from '../family/MemberPill.vue'
import CalendarDayCell from './CalendarDayCell.vue'
import EventCard from './EventCard.vue'
import DayModePanel from './DayModePanel.vue'
import { CALENDAR_MODES, WEEK_DAYS } from '../../utils/constants/calendarConstants.js'

defineProps({
  heading: { type: String, required: true },
  mode: { type: String, required: true },
  monthGrid: { type: Array, required: true },
  weekRange: { type: Array, required: true },
  eventsByDate: { type: Object, required: true },
  selectedDateKey: { type: String, required: true },
  periodKey: { type: String, required: true },
  calendarTransitionName: { type: String, default: 'calendar-fade' },
  members: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:mode', 'previous', 'next', 'today', 'select-date', 'edit-event', 'create-event', 'move-event', 'resize-event'])

function handleWeekDrop(date, dropEvent) {
  const eventId = dropEvent.dataTransfer.getData('text/calendar-event-id') || dropEvent.dataTransfer.getData('text/plain')
  if (!eventId) return
  emit('move-event', { eventId, date, copy: dropEvent.altKey })
}

function hasBirthday(events) {
  return events.some((event) => event.category === 'birthday' && /^день рождения:/i.test(event.title || ''))
}
</script>

<style scoped>
.calendar-board {
  padding: 16px;
  overflow: hidden;
  animation: fadeSlideUp 0.42s var(--ease-out);
}

.calendar-board__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.calendar-board__toolbar p {
  margin-bottom: 4px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.calendar-board__toolbar h1 {
  margin-bottom: 0;
  text-transform: capitalize;
}

.calendar-board__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.calendar-board__segmented {
  display: flex;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 3px;
  background: var(--control-bg);
}

.calendar-board__segmented button {
  min-height: 28px;
  border: 0;
  border-radius: var(--radius-pill);
  padding: 0 10px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 11px;
  font-weight: 600;
}

.calendar-board__segmented .active {
  color: var(--text-inverse);
  background: var(--accent);
}

.calendar-board__members {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.calendar-board__viewport {
  min-width: 0;
  will-change: transform, opacity;
}

.calendar-board__weekdays,
.calendar-board__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.calendar-board__weekdays {
  margin-bottom: 6px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.calendar-board__weekdays span {
  padding-left: 6px;
}

.calendar-board__week {
  display: grid;
  grid-template-columns: repeat(7, minmax(150px, 1fr));
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.calendar-board__week-day {
  min-height: 340px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 12px;
  background: var(--control-bg);
}

.calendar-board__week-day--today,
.calendar-board__week-day--selected {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.calendar-board__week-day--birthday {
  border-color: color-mix(in srgb, var(--pink) 40%, var(--border-color));
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--pink) 16%, transparent), transparent 48%),
    color-mix(in srgb, var(--pink) 5%, var(--control-bg));
}

.calendar-board__week-date {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.calendar-board__week-date span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--field-bg-focus);
  font-weight: 700;
}

.calendar-board__week-date small {
  margin-left: auto;
  color: var(--pink);
  font-size: 9px;
  font-weight: 800;
}

.calendar-board__empty {
  margin: auto 0;
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 980px) {
  .calendar-board__toolbar {
    display: grid;
  }
}

@media (max-width: 720px) {
  .calendar-board {
    padding: 12px;
    border-radius: 16px;
  }

  .calendar-board__actions {
    flex-wrap: wrap;
  }

  .calendar-board__segmented {
    width: 100%;
    overflow-x: auto;
  }

  .calendar-board__segmented button {
    white-space: nowrap;
  }

  .calendar-board__weekdays,
  .calendar-board__grid {
    gap: 5px;
  }
}
</style>
