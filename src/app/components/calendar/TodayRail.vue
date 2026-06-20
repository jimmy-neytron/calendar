<template>
  <aside class="today-rail panel">
    <header class="today-rail__header">
      <div>
        <p>{{ formatWeekday(selectedDateKey) }}</p>
        <h2>{{ formatDateShort(selectedDateKey) }}</h2>
      </div>
      <UiButton icon="＋" icon-only @click="$emit('create-event')" />
    </header>

    <section v-if="reminders.length" class="today-rail__section today-rail__section--reminders">
      <h3>Скоро</h3>
      <article v-for="event in reminders" :key="event.id" class="today-rail__reminder">
        <strong>{{ event.title }}</strong>
        <small>{{ event.date }} · {{ event.startTime }}</small>
      </article>
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
import UiButton from '../ui/UiButton.vue'
import EventCard from './EventCard.vue'
import { formatDateShort, formatWeekday } from '../../utils/formatters/dateFormatter.js'

defineProps({
  selectedDateKey: { type: String, required: true },
  selectedEvents: { type: Array, default: () => [] },
  members: { type: Array, default: () => [] },
  reminders: { type: Array, default: () => [] },
})

defineEmits(['create-event', 'edit-event'])
</script>

<style scoped>
.today-rail {
  position: sticky;
  top: calc(var(--header-height) + 14px);
  align-self: start;
  display: grid;
  gap: 10px;
  padding: 12px;
  animation: fadeSlideUp 0.46s var(--ease-out);
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

.today-rail__header h2 {
  margin: 0;
  text-transform: capitalize;
}

.today-rail__section {
  display: grid;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.today-rail__section h3 {
  margin: 0;
}

.today-rail__events {
  display: grid;
  gap: 8px;
}

.today-rail__reminder {
  display: grid;
  gap: 2px;
  border: 1px solid rgba(234, 179, 8, 0.24);
  border-radius: var(--radius-md);
  padding: 8px;
  background: rgba(234, 179, 8, 0.06);
}

.today-rail__reminder strong {
  font-size: 12px;
}

.today-rail__reminder small,
.today-rail__empty {
  margin: 0;
  color: var(--text-muted);
}

@media (max-width: 1100px) {
  .today-rail {
    position: static;
  }
}
</style>
