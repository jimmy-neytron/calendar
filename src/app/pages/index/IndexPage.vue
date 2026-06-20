<template>
  <section class="index-page">
    <div class="index-page__main">
      <CalendarFilters
        :filters="filters"
        :members="members"
        @update-filter="updateFilter"
        @reset="resetFilters"
      />

      <CalendarBoard
        :heading="heading"
        :mode="mode"
        :month-grid="monthGrid"
        :week-range="weekRange"
        :events-by-date="filteredEventsByDate"
        :selected-date-key="selectedDateKey"
        :period-key="periodKey"
        :calendar-transition-name="calendarTransitionName"
        :members="members"
        @update:mode="mode = $event"
        @previous="goPrevious"
        @next="goNext"
        @today="goToday"
        @select-date="selectDate"
        @edit-event="editEvent"
        @create-event="createEvent"
        @move-event="handleMoveEvent"
        @resize-event="handleResizeEvent"
      />
    </div>

    <TodayRail
      :selected-date-key="selectedDateKey"
      :selected-events="selectedEvents"
      :members="members"
      :reminders="upcomingReminders"
      @create-event="createEvent"
      @edit-event="editEvent"
    />

    <EventDrawer
      v-model="isEventDrawerOpen"
      :editing-event="editingEvent"
      :selected-date-key="selectedDateKey"
      :members="members"
      @create="handleCreateEvent"
      @update="handleUpdateEvent"
      @delete="handleDeleteEvent"
      @duplicate="handleDuplicateEvent"
    />
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CalendarBoard from '../../components/calendar/CalendarBoard.vue'
import CalendarFilters from '../../components/calendar/CalendarFilters.vue'
import TodayRail from '../../components/calendar/TodayRail.vue'
import EventDrawer from '../../components/calendar/EventDrawer.vue'
import { useCalendarView } from '../../composables/calendar/useCalendarView.js'
import { useCalendarEvents } from '../../composables/calendar/useCalendarEvents.js'
import { useFamilyMembers } from '../../composables/calendar/useFamilyMembers.js'
import { useModal } from '../../composables/ui/useModal.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { useCalendarPreferences } from '../../composables/preferences/useCalendarPreferences.js'
import { DEFAULT_FILTERS } from '../../utils/constants/calendarConstants.js'
import { groupEventsByDate } from '../../stores/calendar.store.js'
import { authStore } from '../../stores/auth.store.js'

const props = defineProps({
  forceCreateToken: { type: Number, default: 0 },
})

const route = useRoute()
const { defaultMode } = useCalendarPreferences()

const {
  selectedDateKey,
  mode,
  monthGrid,
  weekRange,
  heading,
  periodKey,
  calendarTransitionName,
  goToday,
  goPrevious,
  goNext,
  selectDate,
  enableDayMode,
} = useCalendarView(defaultMode.value)

const { events, sortedEvents, eventsByDate, upcomingReminders, addEvent, updateEvent, deleteEvent, moveEvent, resizeEvent, duplicateEvent } = useCalendarEvents()
const { members } = useFamilyMembers()
const { notify } = useNotification()
const { isOpen: isEventDrawerOpen, open: openEventDrawer, close: closeEventDrawer } = useModal(false)

const editingEvent = ref(null)
const filters = reactive({ ...DEFAULT_FILTERS })
const selectedEvents = computed(() => filteredEventsByDate.value[selectedDateKey.value] || [])
const filteredEvents = computed(() => sortedEvents.value.filter(matchesFilters))
const filteredEventsByDate = computed(() => groupEventsByDate(filteredEvents.value))

const createEvent = () => {
  editingEvent.value = null
  openEventDrawer()
}

const editEvent = (event) => {
  editingEvent.value = event.parentId ? events.value.find((sourceEvent) => sourceEvent.id === event.parentId) || event : event
  openEventDrawer()
}

const handleCreateEvent = (data) => {
  const result = addEvent(data)
  if (!result.ok) {
    notify(Object.values(result.errors || {})[0] || 'Не удалось создать событие', 'danger')
    return
  }
  notify('Событие добавлено', 'success')
  closeEventDrawer()
}

const handleUpdateEvent = (id, data) => {
  const result = updateEvent(id, data)
  if (!result.ok) {
    notify(Object.values(result.errors || {})[0] || 'Не удалось обновить событие', 'danger')
    return
  }
  notify('Событие обновлено', 'success')
  closeEventDrawer()
}

const handleDeleteEvent = (id) => {
  deleteEvent(id)
  notify('Событие удалено', 'danger')
  closeEventDrawer()
}

const handleMoveEvent = ({ eventId, date, time }) => {
  const result = moveEvent(eventId, date, time)
  if (!result.ok) {
    notify('Не удалось перенести событие', 'danger')
    return
  }
  selectDate(date)
  notify(time ? `Событие перенесено на ${date} в ${time}` : `Событие перенесено на ${date}`, 'success')
}

const handleResizeEvent = ({ eventId, minutesDelta }) => {
  const result = resizeEvent(eventId, minutesDelta)
  if (!result.ok) {
    notify('Не удалось изменить длительность', 'danger')
    return
  }
  notify('Длительность обновлена', 'success')
}

const handleDuplicateEvent = ({ eventId, mode, dates }) => {
  const result = duplicateEvent(eventId, mode, dates)
  if (!result.ok) {
    notify(result.message || 'Не удалось дублировать событие', 'danger')
    return
  }
  notify(`Создано копий: ${result.events.length}`, 'success')
}

function updateFilter(key, value) {
  filters[key] = value
}

function resetFilters() {
  Object.assign(filters, DEFAULT_FILTERS)
}

function matchesFilters(event) {
  const query = filters.search.trim().toLowerCase()
  if (query) {
    const source = [event.title, event.location, event.notes].join(' ').toLowerCase()
    if (!source.includes(query)) return false
  }

  if (filters.category !== 'all' && event.category !== filters.category) return false
  if (filters.importance !== 'all' && (event.importance || 'normal') !== filters.importance) return false
  if (filters.memberId === 'family' && event.memberIds?.length) return false
  if (filters.memberId !== 'all' && filters.memberId !== 'family' && !event.memberIds?.includes(filters.memberId)) return false
  if (filters.onlyMine) {
    const currentUserId = authStore.currentUserId.value
    if (event.memberIds?.length && !event.memberIds.includes(currentUserId)) return false
  }

  return true
}

watch(
  () => route.query,
  (query) => {
    if (query.mode === 'day') enableDayMode()
    if (query.today) goToday()
  },
  { immediate: true }
)

watch(
  () => props.forceCreateToken,
  (token) => {
    if (token > 0) createEvent()
  },
  { immediate: true }
)

defineExpose({
  goToday,
  createEvent,
  enableDayMode,
})
</script>

<style scoped>
.index-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 14px;
}

.index-page__main {
  display: grid;
  align-content: start;
  gap: 10px;
  min-width: 0;
}

@media (max-width: 1100px) {
  .index-page {
    grid-template-columns: 1fr;
  }
}
</style>
