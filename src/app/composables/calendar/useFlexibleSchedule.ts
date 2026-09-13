import { computed, ref, watch } from 'vue'
import { calendarStore } from '../../stores/calendar.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'
import { useRecurringEvents } from '../recurrence/useRecurringEvents.js'
import { addDays, availableSlots, canReschedule, dateKey, isSlotFree, type ScheduledEvent, type Slot } from '../../services/flexibleSchedule'

export function useFlexibleSchedule() {
  const busy = ref(false)
  const message = ref('')
  const undoEntries = ref<{ id: string; before?: ScheduledEvent; after: ScheduledEvent }[]>([])
  watch(workspaceStore.activeWorkspaceId, () => { undoEntries.value = []; message.value = '' })
  const { expandRecurringEvents } = useRecurringEvents()
  const events = computed<ScheduledEvent[]>(() => expandRecurringEvents(calendarStore.events.value, new Date(), new Date(`${addDays(dateKey(new Date()), 63)}T23:59:59`)))
  const flexibleEvents = computed(() => events.value.filter(e => e.flexibleRule && e.date >= dateKey(new Date()) && !e.completedAt))
  const conflicts = computed(() => flexibleEvents.value.filter(e => canReschedule(e) && !isSlotFree(e as Slot, events.value.filter(other => other.id !== e.id), e.flexibleRule?.buffer)))
  function alternatives(event: ScheduledEvent, extra: ScheduledEvent[] = []) {
    if (!event.flexibleRule) return []
    return availableSlots(event.flexibleRule, [...events.value.filter(e => e.id !== event.id), ...extra])
  }
  async function apply(planned: ScheduledEvent[], calendarId: string, moving = false) {
    if (busy.value) return false
    busy.value = true
    message.value = ''
    undoEntries.value = []
    const workspaceId = workspaceStore.activeWorkspaceId.value
    try {
      for (const entry of planned) {
        if (workspaceStore.activeWorkspaceId.value !== workspaceId) throw new Error('Пространство изменилось. Сохранение остановлено.')
        const current = events.value.find(e => e.id === entry.id)
        if (moving && (!current || !canReschedule(current))) throw new Error('Событие изменилось или закреплено. Подберите перенос заново.')
        if (moving && JSON.stringify(current?.flexibleRule) !== JSON.stringify(entry.flexibleRule)) throw new Error('Условия события изменились. Подберите перенос заново.')
        const others = events.value.filter(e => !moving || e.id !== entry.id)
        if (!entry.flexibleRule || !availableSlots(entry.flexibleRule, others).some(slot => slot.date === entry.date && slot.startTime === entry.startTime && slot.endTime === entry.endTime)) throw new Error('Расписание изменилось. Подберите свободное время заново.')
        const result = moving
          ? await calendarStore.updateFlexibleEventAndWait(entry.id, entry)
          : await calendarStore.addEventAndWait({ ...entry, calendarId, category: 'other', repeat: 'none', allDay: false, reminder: '1h' })
        if (!result.ok) throw new Error(Object.values(result.errors || {}).join(' ') || 'Не удалось сохранить событие.')
        if (workspaceStore.activeWorkspaceId.value !== workspaceId) throw new Error('Событие сохранено в исходном пространстве. Вернитесь в него для просмотра.')
        undoEntries.value.push({ id: result.event.id, before: moving ? { ...current! } : undefined, after: { ...result.event } })
      }
      message.value = moving ? 'Перенос сохранён.' : `Добавлено занятий: ${planned.length}.`
      return true
    } catch (error) {
      message.value = `${error instanceof Error ? error.message : 'Ошибка сохранения.'}${undoEntries.value.length ? ` Сохранено: ${undoEntries.value.length}. Можно отменить.` : ''}`
      return false
    } finally { busy.value = false }
  }
  async function undo() {
    if (busy.value) return
    busy.value = true
    try {
      for (const entry of [...undoEntries.value].reverse()) {
        const current = calendarStore.events.value.find((e: ScheduledEvent) => e.id === entry.id)
        if (!current || JSON.stringify(current) !== JSON.stringify(entry.after)) throw new Error('Событие изменилось после сохранения. Автоматическая отмена остановлена, чтобы сохранить правки.')
        const result = entry.before ? await calendarStore.updateFlexibleEventAndWait(entry.id, entry.before) : await calendarStore.deleteEventAndWait(entry.id)
        if (!result.ok) throw new Error('Не удалось отменить изменение. Попробуйте снова.')
        undoEntries.value = undoEntries.value.filter(e => e.id !== entry.id)
      }
      message.value = 'Изменения отменены.'
    } catch (error) { message.value = error instanceof Error ? error.message : 'Ошибка отмены.' }
    finally { busy.value = false }
  }
  async function toggleLock(event: ScheduledEvent) {
    if (busy.value || !event.flexibleRule) return
    busy.value = true
    const result = await calendarStore.updateFlexibleEventAndWait(event.id, { ...event, flexibleRule: { ...event.flexibleRule, locked: !event.flexibleRule.locked } })
    message.value = result.ok ? (event.flexibleRule.locked ? 'Подбор переноса разрешён.' : 'Время закреплено.') : 'Не удалось изменить закрепление.'
    busy.value = false
  }
  return { events, flexibleEvents, conflicts, alternatives, apply, undo, toggleLock, busy, message, undoEntries }
}


