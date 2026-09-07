<template>
  <UiModal :model-value="modelValue" title="Событие" width="520px" @update:model-value="$emit('update:modelValue', $event)">
    <article v-if="event" class="event-preview">
      <h3>{{ event.title }}</h3>
      <p class="event-preview__time">{{ formatDate(event.date) }} · {{ formatTimeRange(event.startTime, event.endTime, event.allDay) }}</p>
      <dl>
        <template v-if="calendarName"><dt>Календарь</dt><dd>{{ calendarName }}</dd></template>
        <dt>Участники</dt><dd>{{ participants }}</dd>
        <template v-if="event.location"><dt>Место</dt><dd>{{ event.location }}</dd></template>
        <template v-if="reminderLabel"><dt>Напоминание</dt><dd>{{ reminderLabel }}</dd></template>
      </dl>
      <p v-if="event.notes" class="event-preview__notes">{{ event.notes }}</p>
      <p v-if="event.parentId || (event.repeat && event.repeat !== 'none')" class="event-preview__hint">Повторяющееся событие. В редакторе изменения применяются ко всей серии.</p>
      <p v-if="event.completedAt" class="event-preview__hint">Событие выполнено</p>
      <footer>
        <UiButton v-if="linkedLabel" variant="secondary" @click="$emit('open-linked', event)">{{ linkedLabel }}</UiButton>
        <UiButton @click="$emit('edit', event)">Изменить</UiButton>
      </footer>
    </article>
  </UiModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UiModal from '../ui/UiModal.vue'
import UiButton from '../ui/UiButton.vue'
import { formatDate, formatTimeRange } from '../../utils/formatters/dateFormatter.js'
import { REMINDER_OPTIONS } from '../../utils/constants/calendarConstants.js'

interface PreviewEvent {
  id: string
  title: string
  date: string
  startTime?: string
  endTime?: string
  allDay?: boolean
  memberIds?: string[]
  calendarId?: string
  location?: string
  notes?: string
  reminder?: string
  repeat?: string
  parentId?: string
  completedAt?: string | null
  linkedEntityType?: string
  linkedEntityId?: string
}
const props = defineProps<{
  modelValue: boolean
  event: PreviewEvent | null
  members: { id: string; name: string }[]
  calendars: { id: string; name: string }[]
}>()
defineEmits<{
  'update:modelValue': [value: boolean]
  edit: [event: PreviewEvent]
  'open-linked': [event: PreviewEvent]
}>()
const calendarName = computed(() => props.calendars.find(item => item.id === props.event?.calendarId)?.name)
const participants = computed(() => props.event?.memberIds?.length
  ? props.event.memberIds.map(id => props.members.find(member => member.id === id)?.name || 'Участник недоступен').join(', ')
  : 'Все участники')
const reminderLabel = computed(() => props.event?.reminder && props.event.reminder !== 'none'
  ? REMINDER_OPTIONS.find(item => item.value === props.event?.reminder)?.label : '')
const linkedLabel = computed(() => !props.event?.linkedEntityId ? '' : props.event.linkedEntityType === 'budget-payment'
  ? 'Открыть платёж' : props.event.linkedEntityType === 'course-lesson' ? 'Открыть урок' : '')
</script>

<style scoped>
.event-preview { display: grid; gap: 16px; }
h3 { margin: 0; font-size: 24px; line-height: 1.3; overflow-wrap: anywhere; }
p { margin: 0; }
.event-preview__time { color: var(--accent); font-weight: 600; }
dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px 20px; margin: 0; font-size: 14px; }
dt { color: var(--text-muted); }
dd { margin: 0; overflow-wrap: anywhere; }
.event-preview__notes { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.6; }
.event-preview__hint { padding: 12px; border-radius: 10px; background: var(--control-bg); color: var(--text-secondary); font-size: 13px; line-height: 1.5; }
footer { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 14px; }
@media (max-width: 400px) { dl { grid-template-columns: 1fr; gap: 6px; } dd { margin-bottom: 8px; } }
</style>
