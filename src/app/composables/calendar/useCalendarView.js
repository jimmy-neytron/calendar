import { computed, ref } from 'vue'
import {
  addDays,
  formatDayHeading,
  formatMonthHeading,
  getMonthGrid,
  getWeekRange,
  toDateKey,
} from '../../utils/formatters/dateFormatter.js'
import { CALENDAR_MODES } from '../../utils/constants/calendarConstants.js'

export function useCalendarView(initialMode = CALENDAR_MODES.MONTH) {
  const activeDate = ref(new Date())
  const selectedDateKey = ref(toDateKey(new Date()))
  const mode = ref(initialMode || CALENDAR_MODES.MONTH)
  const calendarTransitionName = ref('calendar-fade')

  const monthGrid = computed(() => getMonthGrid(activeDate.value))
  const weekRange = computed(() => getWeekRange(activeDate.value))
  const heading = computed(() => {
    if (mode.value === CALENDAR_MODES.DAY) return formatDayHeading(activeDate.value)
    return formatMonthHeading(activeDate.value)
  })
  const periodKey = computed(() => {
    const year = activeDate.value.getFullYear()
    const month = String(activeDate.value.getMonth() + 1).padStart(2, '0')
    const day = String(activeDate.value.getDate()).padStart(2, '0')

    if (mode.value === CALENDAR_MODES.MONTH) return `month-${year}-${month}`
    if (mode.value === CALENDAR_MODES.WEEK) return `week-${weekRange.value[0]?.key || selectedDateKey.value}`
    return `day-${year}-${month}-${day}`
  })

  const goToday = () => {
    const today = new Date()
    calendarTransitionName.value = getDirectionTransition(activeDate.value, today)
    activeDate.value = today
    selectedDateKey.value = toDateKey(today)
  }

  const goPrevious = () => {
    calendarTransitionName.value = 'calendar-slide-prev'

    if (mode.value === CALENDAR_MODES.DAY) {
      activeDate.value = addDays(activeDate.value, -1)
      selectedDateKey.value = toDateKey(activeDate.value)
      return
    }

    if (mode.value === CALENDAR_MODES.WEEK) {
      activeDate.value = addDays(activeDate.value, -7)
      selectedDateKey.value = toDateKey(activeDate.value)
      return
    }

    activeDate.value = new Date(activeDate.value.getFullYear(), activeDate.value.getMonth() - 1, 1)
  }

  const goNext = () => {
    calendarTransitionName.value = 'calendar-slide-next'

    if (mode.value === CALENDAR_MODES.DAY) {
      activeDate.value = addDays(activeDate.value, 1)
      selectedDateKey.value = toDateKey(activeDate.value)
      return
    }

    if (mode.value === CALENDAR_MODES.WEEK) {
      activeDate.value = addDays(activeDate.value, 7)
      selectedDateKey.value = toDateKey(activeDate.value)
      return
    }

    activeDate.value = new Date(activeDate.value.getFullYear(), activeDate.value.getMonth() + 1, 1)
  }

  const selectDate = (dateKey) => {
    const previousDate = activeDate.value
    const [year, month, day] = dateKey.split('-').map(Number)
    const nextDate = new Date(year, month - 1, day)

    calendarTransitionName.value = getDirectionTransition(previousDate, nextDate)
    selectedDateKey.value = dateKey
    activeDate.value = nextDate
  }

  const enableDayMode = () => {
    calendarTransitionName.value = 'calendar-fade'
    mode.value = CALENDAR_MODES.DAY
    selectDate(selectedDateKey.value)
  }

  return {
    activeDate,
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
  }
}

function getDirectionTransition(previousDate, nextDate) {
  if (nextDate.getTime() === previousDate.getTime()) return 'calendar-fade'
  return nextDate > previousDate ? 'calendar-slide-next' : 'calendar-slide-prev'
}
