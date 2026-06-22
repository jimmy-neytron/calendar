<template>
  <section class="calendar-board panel">
    <header class="calendar-board__toolbar">
      <div>
        <p>Общий календарь пространства</p>
        <h1>{{ heading }}</h1>
      </div>

      <div class="calendar-board__actions">
        <CalendarShortcutsHelp />
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
            :holidays="holidaysByDate[selectedDateKey] || []"
            :members="members"
            @create-event="$emit('create-event')"
            @edit-event="$emit('edit-event', $event)"
            @move-event="$emit('move-event', $event)"
            @resize-event="$emit('resize-event', $event)"
          />
        </template>

        <template v-else>
          <div v-if="mode === CALENDAR_MODES.MONTH" class="calendar-board__weekdays">
            <span v-for="day in WEEK_DAYS" :key="day">{{ day }}</span>
          </div>

          <transition-group v-if="mode === CALENDAR_MODES.MONTH" name="list" tag="div" class="calendar-board__grid">
            <CalendarDayCell
              v-for="day in monthGrid"
              :key="day.key"
              :day="day"
              :events="eventsByDate[day.key] || []"
              :members="members"
              :holidays="holidaysByDate[day.key] || []"
              :selected="day.key === selectedDateKey"
              @select="$emit('select-date', $event)"
              @edit-event="$emit('edit-event', $event)"
              @move-event="$emit('move-event', $event)"
            />
          </transition-group>

          <WeekModePanel
            v-else
            :week-range="weekRange"
            :events-by-date="eventsByDate"
            :selected-date-key="selectedDateKey"
            :members="members"
            :holidays-by-date="holidaysByDate"
            @select-date="$emit('select-date', $event)"
            @edit-event="$emit('edit-event', $event)"
            @create-event="$emit('create-event', $event)"
            @move-event="$emit('move-event', $event)"
          />
        </template>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import UiButton from '../ui/UiButton.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import MemberPill from '../family/MemberPill.vue'
import CalendarShortcutsHelp from './CalendarShortcutsHelp.vue'
import CalendarDayCell from './CalendarDayCell.vue'
import DayModePanel from './DayModePanel.vue'
import WeekModePanel from './WeekModePanel.vue'
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
  holidaysByDate: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:mode', 'previous', 'next', 'today', 'select-date', 'edit-event', 'create-event', 'move-event', 'resize-event'])

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
