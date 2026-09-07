<template>
  <UiModal :model-value="modelValue" :title="event?.title || 'Событие'" width="500px" dialog-class="event-preview-dialog" @update:model-value="emit('update:modelValue', $event)">
    <template #header-badge>
      <div class="event-preview__eyebrow" :style="{ '--preview-accent': accent }">
        <span v-if="calendarName"><i />{{ calendarName }}</span>
        <span v-if="event?.completedAt"><UiIcon name="check" />Выполнено</span>
        <span v-if="event?.importance === 'important' || event?.importance === 'urgent'">{{ event.importance === 'urgent' ? 'Срочное' : 'Важное' }}</span>
      </div>
    </template>
    <article v-if="event" class="event-preview">
      <div v-if="source" class="event-preview__origin" :style="{ '--source-color': source.color }">
        <span class="event-preview__origin-label">{{ event.linkedEntityType === 'birthday-reminder' ? 'Напоминание из' : 'Связано с' }}</span>
        <button
          v-if="linkedLabel"
          type="button"
          class="event-preview__source"
          :aria-label="linkedLabel"
          @click="emit('open-linked', event)"
        >
          <span class="event-preview__source-icon"><UiIcon :name="source.icon" /></span>
          <strong>{{ source.label }}</strong>
          <span class="event-preview__source-arrow"><UiIcon name="right" /></span>
        </button>
        <span v-else class="event-preview__source event-preview__source--static">
          <span class="event-preview__source-icon"><UiIcon :name="source.icon" /></span>
          <strong>{{ source.label }}</strong>
        </span>
      </div>

      <dl class="event-preview__details">
        <div class="event-preview__date-row"><dt><UiIcon name="calendar" /><span class="event-preview__sr-only">Когда</span></dt><dd><span class="event-preview__time">{{ formatDate(event.date) }}</span><span class="event-preview__secondary">{{ formatTimeRange(event.startTime, event.endTime, event.allDay) }}</span></dd></div>
        <div><dt><UiIcon name="users" /><span class="event-preview__sr-only">Участники</span></dt><dd class="event-preview__people"><EventMemberAvatars :member-ids="event.memberIds || []" :members="members" />{{ participants }}</dd></div>
        <div v-if="event.location"><dt><UiIcon name="pin" /><span class="event-preview__sr-only">Место</span></dt><dd>{{ event.location }}</dd></div>
        <div v-if="reminderLabel"><dt><UiIcon name="clock" /><span class="event-preview__sr-only">Напоминание</span></dt><dd>Напомнить {{ reminderLabel.toLocaleLowerCase('ru-RU') }}</dd></div>
      </dl>
      <section v-if="event.notes" class="event-preview__notes" aria-label="Заметки"><p>{{ event.notes }}</p></section>
      <p v-if="isRepeating" class="event-preview__hint"><UiIcon name="refresh" /><span>Повторяется. Изменения применяются ко всей серии.</span></p>
      <footer>
        <UiButton variant="danger" icon="trash" @click="isDeleteConfirmOpen = true">Удалить</UiButton>
        <UiButton variant="secondary" icon="edit" @click="emit('edit', event)">Изменить событие</UiButton>
      </footer>
    </article>
  </UiModal>
  <UiConfirmModal
    v-model="isDeleteConfirmOpen"
    title="Удалить событие?"
    :message="deleteMessage"
    confirm-label="Удалить"
    @confirm="confirmDelete"
  />
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UiModal from '../ui/UiModal.vue'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiConfirmModal from '../ui/UiConfirmModal.vue'
import EventMemberAvatars from './EventMemberAvatars.vue'
import { getEventSource } from './eventSource'
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
  importance?: string
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
  members: { id: string; name: string; color?: string; avatar?: string }[]
  calendars: { id: string; name: string; color?: string }[]
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  edit: [event: PreviewEvent]
  delete: [event: PreviewEvent]
  'open-linked': [event: PreviewEvent]
}>()
const isDeleteConfirmOpen = ref(false)
const calendarName = computed(() => props.calendars.find(item => item.id === props.event?.calendarId)?.name)
const participants = computed(() => props.event?.memberIds?.length
  ? props.event.memberIds.map(id => props.members.find(member => member.id === id)?.name || 'Участник недоступен').join(', ')
  : 'Все участники')
const reminderLabel = computed(() => props.event?.reminder && props.event.reminder !== 'none'
  ? REMINDER_OPTIONS.find(item => item.value === props.event?.reminder)?.label : '')
const source = computed(() => getEventSource(props.event))
const linkedLabel = computed(() => props.event?.linkedEntityId ? source.value?.action : '')
const calendar = computed(() => props.calendars.find(item => item.id === props.event?.calendarId))
const accent = computed(() => calendar.value?.color || source.value?.color || 'var(--accent)')
const isRepeating = computed(() => props.event?.parentId || (props.event?.repeat && props.event.repeat !== 'none'))
const deleteMessage = computed(() => isRepeating.value
  ? `Событие «${props.event?.title || ''}» и вся серия будут удалены.`
  : `Событие «${props.event?.title || ''}» будет удалено.`)
watch(() => props.modelValue, (open) => { if (!open) isDeleteConfirmOpen.value = false })
function confirmDelete() {
  if (!props.event) return
  isDeleteConfirmOpen.value = false
  emit('delete', props.event)
}
</script>

<style scoped>
.event-preview { display: grid; gap: 24px; }
.event-preview__eyebrow { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; color: var(--text-secondary); font-size: 11px; font-weight: 500; }
.event-preview__eyebrow:empty { display: none; }
.event-preview__eyebrow span { display: inline-flex; align-items: center; gap: 6px; }
.event-preview__eyebrow i { width: 7px; height: 7px; border-radius: 50%; background: var(--preview-accent); }
.event-preview__details { display: grid; gap: 17px; margin: 0; }
.event-preview__details>div { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 14px; align-items: start; }
dt { padding-top: 2px; color: var(--text-muted); font-size: 16px; }
dd { display: grid; gap: 3px; margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
.event-preview__time { color: var(--text-primary); font-weight: 500; }
.event-preview__secondary { color: var(--text-muted); font-size: 12px; }
.event-preview__people { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.event-preview__origin { display: flex; align-items: center; gap: 10px; min-width: 0; }
.event-preview__origin-label { flex: 0 0 auto; color: var(--text-muted); font-size: 11px; }
.event-preview__source { min-width: 0; display: inline-flex; align-items: center; gap: 8px; border: 0; border-radius: 999px; padding: 5px 6px 5px 5px; color: var(--source-color); background: color-mix(in srgb, var(--source-color) 11%, var(--control-bg)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--source-color) 20%, transparent); font: inherit; cursor: pointer; transition: background .16s var(--ease-out), box-shadow .16s var(--ease-out), transform .16s var(--ease-out); }
.event-preview__source:hover { background: color-mix(in srgb, var(--source-color) 17%, var(--control-bg)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--source-color) 38%, transparent); transform: translateX(2px); }
.event-preview__source:focus-visible { outline: 2px solid var(--source-color); outline-offset: 2px; }
.event-preview__source--static { cursor: default; }
.event-preview__source--static:hover { transform: none; }
.event-preview__source-icon { width: 28px; height: 28px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 50%; color: var(--source-color); background: color-mix(in srgb, var(--source-color) 19%, var(--panel-bg)); font-size: 14px; }
.event-preview__source strong { min-width: 0; overflow: hidden; color: var(--text-primary); font-size: 11px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.event-preview__source-arrow { width: 22px; height: 22px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 50%; color: var(--source-color); background: color-mix(in srgb, var(--source-color) 12%, transparent); font-size: 11px; }
.event-preview__notes { padding-top: 20px; border-top: 1px solid var(--border-color); }
.event-preview__notes p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--text-secondary); font-size: 13px; line-height: 1.75; }
.event-preview__hint { display: flex; align-items: flex-start; gap: 8px; margin: 0; color: var(--text-muted); font-size: 11px; line-height: 1.5; }
.event-preview__hint :deep(svg) { margin-top: 2px; font-size: 13px; }
.event-preview__sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 2px; }
</style>

<style>
.event-preview-dialog.ui-modal__dialog { border-radius: 16px; }
.event-preview-dialog .ui-modal__header { padding: 26px 26px 22px; border-bottom: 0; }
.event-preview-dialog .ui-modal__header h2 { font-size: 24px; font-weight: 650; line-height: 1.25; letter-spacing: -.035em; }
.event-preview-dialog .ui-modal__body { padding: 0 26px 24px; }
@media (max-width: 480px) {
  .event-preview-dialog .ui-modal__header { padding: 22px 20px; }
  .event-preview-dialog .ui-modal__header h2 { font-size: 22px; }
  .event-preview-dialog .ui-modal__body { padding: 0 20px 20px; }
  .event-preview__origin { align-items: flex-start; flex-direction: column; gap: 7px; }
}
</style>
