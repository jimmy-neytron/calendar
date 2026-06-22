<template>
  <article
    class="event-card"
    :class="[
      `event-card--${event.importance || 'normal'}`,
      { 'event-card--compact': compact },
    ]"
    :style="{ '--event-color': calendarColor || accent }"
    draggable="true"
    @dragstart="handleDragStart"
    @dblclick="$emit('edit', event)"
  >
    <div class="event-card__meta">
      <div class="event-card__time">{{ formatTimeRange(event.startTime, event.endTime, event.allDay) }}</div>
      <EventMemberAvatars
        :member-ids="event.memberIds"
        :members="members"
        :compact="compact"
      />
    </div>
    <div class="event-card__content">
      <strong>
        <span v-if="importanceIcon" class="event-card__importance">{{ importanceIcon }}</span>
        {{ event.title }}
      </strong>
      <span v-if="event.location">{{ event.location }}</span>
      <small>
        {{ category.label }}
        <template v-if="event.repeat && event.repeat !== 'none'"> · ↻</template>
        <template v-if="event.reminder && event.reminder !== 'none'"> · ⏰</template>
      </small>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { formatTimeRange } from '../../utils/formatters/dateFormatter.js'
import { getCategoryMeta, getEventAccent } from '../../utils/formatters/calendarFormatter.js'
import { IMPORTANCE_OPTIONS } from '../../utils/constants/calendarConstants.js'
import { calendarCollectionStore } from '../../stores/calendarCollection.store.js'
import EventMemberAvatars from './EventMemberAvatars.vue'

const props = defineProps({
  event: { type: Object, required: true },
  members: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
})

defineEmits(['edit'])

const accent = computed(() => getEventAccent(props.event.memberIds, props.members))
const category = computed(() => getCategoryMeta(props.event.category))
const importanceIcon = computed(() => IMPORTANCE_OPTIONS.find((item) => item.value === props.event.importance)?.icon || '')
const calendarColor = computed(() => calendarCollectionStore.getCollection(props.event.calendarId)?.color || '')

function handleDragStart(dragEvent) {
  dragEvent.dataTransfer.effectAllowed = 'copyMove'
  dragEvent.dataTransfer.setData('text/calendar-event-id', props.event.id)
  dragEvent.dataTransfer.setData('text/plain', props.event.id)
}
</script>

<style scoped>
.event-card {
  display: grid;
  grid-template-columns: 54px 1fr;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--event-color) 35%, transparent);
  border-left-width: 3px;
  border-radius: var(--radius-md);
  padding: 7px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--event-color) 10%, transparent), var(--control-bg));
  transition: transform 0.2s var(--ease-out), background 0.2s var(--ease-out), border-color 0.2s var(--ease-out);
  cursor: grab;
}

.event-card:hover {
  transform: translateY(-1px);
  background: linear-gradient(90deg, color-mix(in srgb, var(--event-color) 15%, transparent), var(--control-bg));
}

.event-card--important {
  border-color: rgba(234, 179, 8, 0.42);
}

.event-card--urgent {
  border-color: rgba(239, 68, 68, 0.48);
}

.event-card__time {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.event-card__content {
  display: grid;
  gap: 2px;
}

.event-card__content strong {
  font-size: 11px;
}

.event-card__importance {
  display: inline-grid;
  place-items: center;
  min-width: 15px;
  height: 15px;
  margin-right: 4px;
  border-radius: 50%;
  background: var(--danger);
  color: #fff;
  font-size: 9px;
  line-height: 1;
}

.event-card__content span,
.event-card__content small {
  color: var(--text-muted);
  font-size: 11px;
}

.event-card__meta {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 5px;
}

.event-card--compact {
  grid-template-columns: 1fr;
  gap: 3px;
  padding: 7px 6px;
}

.event-card--compact .event-card__time {
  overflow: hidden;
  color: var(--event-color);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-card--compact .event-card__meta {
  align-items: center;
}

.event-card--compact .event-card__content {
  min-width: 0;
}

.event-card--compact .event-card__content strong {
  display: -webkit-box;
  overflow: hidden;
  font-size: 10px;
  line-height: 1.3;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.event-card--compact .event-card__content > span {
  overflow: hidden;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-card--compact .event-card__content small {
  overflow: hidden;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
