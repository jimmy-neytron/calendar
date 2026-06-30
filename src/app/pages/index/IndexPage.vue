<template>
  <section class="index-page" :class="{ 'index-page--week': mode === CALENDAR_MODES.WEEK }">
    <div class="index-page__main">
      <CalendarFilters
        :filters="filters"
        :members="members"
        :calendars="calendars"
        @update-filter="updateFilter"
        @reset="resetFilters"
      />

      <SmartEventInput
        v-model="smartEventQuery"
        :suggestion="smartEventSuggestion"
        @submit="handleSmartEventCreate"
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
        :holidays-by-date="holidaysByDate"
        @update:mode="mode = $event"
        @previous="goPrevious"
        @next="goNext"
        @today="goToday"
        @select-date="selectDateAndOpenRail"
        @edit-event="editEvent"
        @create-event="createEvent"
        @move-event="handleMoveEvent"
        @resize-event="handleResizeEvent"
      />
    </div>

    <TodayRail
      v-if="mode !== CALENDAR_MODES.WEEK"
      class="index-page__rail"
      :class="{ 'index-page__rail--open': isDayRailOpen }"
      closable
      :selected-date-key="selectedDateKey"
      :selected-events="selectedEvents"
      :members="members"
      :calendars="calendars"
      :reminders="upcomingReminders"
      @close="isDayRailOpen = false"
      @create-event="createEvent"
      @edit-event="editEvent"
      @quick-create="quickCreateAt"
    />
    <button
      v-if="mode !== CALENDAR_MODES.WEEK && isDayRailOpen"
      class="index-page__rail-backdrop"
      type="button"
      aria-label="Закрыть день"
      @click="isDayRailOpen = false"
    />

    <EventDrawer
      v-model="isEventDrawerOpen"
      :editing-event="editingEvent"
      :selected-date-key="selectedDateKey"
      :members="members"
      :calendars="calendars"
      :initial-start-time="quickStartTime"
      @create="handleCreateEvent"
      @update="handleUpdateEvent"
      @delete="handleDeleteEvent"
      @duplicate="handleDuplicateEvent"
      @comment="handleAddComment"
      @open-linked="openLinkedBudget"
    />
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CalendarBoard from '../../components/calendar/CalendarBoard.vue'
import CalendarFilters from '../../components/calendar/CalendarFilters.vue'
import SmartEventInput from '../../components/calendar/SmartEventInput.vue'
import TodayRail from '../../components/calendar/TodayRail.vue'
import EventDrawer from '../../components/calendar/EventDrawer.vue'
import { useCalendarView } from '../../composables/calendar/useCalendarView.js'
import { useCalendarEvents } from '../../composables/calendar/useCalendarEvents.js'
import { useFamilyMembers } from '../../composables/calendar/useFamilyMembers.js'
import { usePublicHolidays } from '../../composables/calendar/usePublicHolidays.js'
import { useModal } from '../../composables/ui/useModal.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { useCalendarPreferences } from '../../composables/preferences/useCalendarPreferences.js'
import { CALENDAR_MODES, DEFAULT_FILTERS } from '../../utils/constants/calendarConstants.js'
import { groupEventsByDate } from '../../stores/calendar.store.js'
import { authStore } from '../../stores/auth.store.js'
import { calendarCollectionStore } from '../../stores/calendarCollection.store.js'
import { parseSmartEvent } from '../../services/smartEventParser.js'
import { budgetStore } from '../../stores/budget.store.js'

const props = defineProps({
  forceCreateToken: { type: Number, default: 0 },
})
const emit = defineEmits(['view-mode-change'])

const route = useRoute()
const router = useRouter()
const { defaultMode, holidayCountry } = useCalendarPreferences()
calendarCollectionStore.ensureWorkspaceCollections()
const calendars = calendarCollectionStore.activeCollections
const visibleCalendarIds = calendarCollectionStore.visibleCollectionIds

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

const { events, sortedEvents, eventsByDate, upcomingReminders, addEvent, updateEvent, deleteEvent, moveEvent, resizeEvent, duplicateEvent, addComment } = useCalendarEvents()
const { members } = useFamilyMembers()
const { notify } = useNotification()
const { isOpen: isEventDrawerOpen, open: openEventDrawer, close: closeEventDrawer } = useModal(false)

const editingEvent = ref(null)
const quickStartTime = ref('')
const smartEventQuery = ref('')
const handledCreateToken = ref(props.forceCreateToken)
const isDayRailOpen = ref(false)
const filters = reactive({ ...DEFAULT_FILTERS })
const selectedEvents = computed(() => filteredEventsByDate.value[selectedDateKey.value] || [])
const smartEventSuggestion = computed(() => parseSmartEvent(smartEventQuery.value, {
  members: members.value,
  calendars: calendars.value,
}))
const filteredEvents = computed(() => sortedEvents.value.filter(matchesFilters))
const filteredEventsByDate = computed(() => groupEventsByDate(filteredEvents.value))
const visibleHolidayYears = computed(() => {
  const days = mode.value === CALENDAR_MODES.MONTH ? monthGrid.value : weekRange.value
  return [...new Set(days.map((day) => day.date.getFullYear()))]
})
const { holidaysByDate } = usePublicHolidays(holidayCountry, visibleHolidayYears)

function toggleDayMonthView() {
  mode.value = mode.value === CALENDAR_MODES.DAY ? CALENDAR_MODES.MONTH : CALENDAR_MODES.DAY
}

const createEvent = (dateKey = '') => {
  if (dateKey) selectDateAndOpenRail(dateKey)
  editingEvent.value = null
  quickStartTime.value = ''
  openEventDrawer()
}

function selectDateAndOpenRail(dateKey) {
  selectDate(dateKey)
  if (mode.value !== CALENDAR_MODES.WEEK) isDayRailOpen.value = true
}

const quickCreateAt = (time) => {
  editingEvent.value = null
  quickStartTime.value = time
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

const handleSmartEventCreate = (eventData) => {
  const { preview, ...data } = eventData
  const result = addEvent(data)
  if (!result.ok) {
    notify(Object.values(result.errors || {})[0] || 'Не удалось создать событие', 'danger')
    return
  }
  smartEventQuery.value = ''
  selectDate(result.event.date)
  notify(`Событие «${result.event.title}» добавлено`, 'success')
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

const handleAddComment = (id, comment) => {
  const result = addComment(id, comment)
  if (!result.ok) notify('Не удалось отправить сообщение', 'danger')
}

const handleMoveEvent = ({ eventId, date, time, copy }) => {
  if (copy) {
    const duplicated = duplicateEvent(eventId, 'custom-dates', [date])
    notify(duplicated.ok ? 'Событие скопировано' : 'Не удалось скопировать событие', duplicated.ok ? 'success' : 'danger')
    return
  }
  const original = events.value.find((event) => event.id === String(eventId).split('::')[0])
  const result = moveEvent(eventId, date, time)
  if (!result.ok) {
    notify('Не удалось перенести событие', 'danger')
    return
  }
  selectDate(date)
  notify(
    time ? `Событие перенесено на ${date} в ${time}` : `Событие перенесено на ${date}`,
    'success',
    original ? {
      actionLabel: 'Отменить',
      action: () => moveEvent(original.id, original.date, original.startTime || null),
    } : {}
  )
}

const editEventById = (eventId) => {
  const baseEventId = String(eventId || '').split('::')[0]
  const event = sortedEvents.value.find((item) => (
    item.id === eventId
    || item.id === baseEventId
    || item.parentId === baseEventId
  ))
  if (event) editEvent(event)
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

async function openLinkedBudget(event) {
  if (!event?.linkedEntityId) return
  budgetStore.setSelectedMonth(String(event.date).slice(0, 7))
  closeEventDrawer()
  await router.push({ name: 'budget', query: { payment: event.linkedEntityId } })
}

function updateFilter(key, value) {
  filters[key] = value
}

function resetFilters() {
  Object.assign(filters, DEFAULT_FILTERS)
}

function matchesFilters(event) {
  if (!visibleCalendarIds.value.includes(event.calendarId) && event.calendarId) return false
  if (filters.calendarId !== 'all' && event.calendarId !== filters.calendarId) return false

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

function setViewMode(nextMode) {
  if (!Object.values(CALENDAR_MODES).includes(nextMode)) return
  mode.value = nextMode
}

watch(
  mode,
  (nextMode) => {
    emit('view-mode-change', nextMode)
    if (nextMode === CALENDAR_MODES.WEEK) isDayRailOpen.value = false
  },
  { immediate: true }
)

watch(
  isEventDrawerOpen,
  (isOpen, wasOpen) => {
    if (!isOpen && wasOpen) clearEventQuery()
  }
)

watch(
  () => route.query,
  (query) => {
    if (query.mode === 'day') enableDayMode()
    if (query.today) goToday()
    if (query.event) {
      editEventById(query.eventDate ? `${query.event}::${query.eventDate}` : query.event)
    }
  },
  { immediate: true }
)

function clearEventQuery() {
  if (!route.query.event && !route.query.eventDate && !route.query.notification) return
  const { event, eventDate, notification, ...query } = route.query
  router.replace({ name: route.name, query })
}

watch(
  () => props.forceCreateToken,
  (token) => {
    if (token <= handledCreateToken.value) return
    handledCreateToken.value = token
    createEvent()
  }
)

defineExpose({
  goToday,
  createEvent,
  enableDayMode,
  toggleDayMonthView,
  setViewMode,
  editEventById,
})
</script>

<style scoped>
.index-page {
  position: relative;
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

.index-page--week {
  grid-template-columns: minmax(0, 1fr);
}

@media (max-width: 1100px) {
  .index-page {
    grid-template-columns: 1fr;
  }

  .index-page .index-page__rail {
    position: fixed;
    z-index: 42;
    top: calc(var(--header-height) + 10px);
    right: 10px;
    bottom: 74px;
    width: min(360px, calc(100vw - 22px));
    transform: translateX(calc(100% + 18px));
    opacity: 0;
    pointer-events: none;
    transition: transform .24s var(--ease-out), opacity .2s var(--ease-out);
  }

  .index-page .index-page__rail--open {
    transform: translateX(0);
    opacity: 1;
    pointer-events: auto;
  }

  .index-page__rail-backdrop {
    position: fixed;
    inset: var(--header-height) 0 0;
    z-index: 41;
    border: 0;
    background: rgba(0, 0, 0, .34);
    backdrop-filter: blur(2px);
  }
}
</style>
