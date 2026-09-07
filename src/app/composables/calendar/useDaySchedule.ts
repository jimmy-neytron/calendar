import { computed, type Ref } from 'vue'

export interface ScheduleEvent {
  allDay?: boolean
  startTime?: string
  endTime?: string
}

function minutes(value?: string): number | null {
  if (!value || !/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return null
  const [hours, mins] = value.split(':').map(Number)
  if (hours > 23 || mins > 59) return null
  return hours * 60 + mins
}

export function useDaySchedule(events: Ref<ScheduleEvent[]>) {
  const intervals = computed(() => {
    const ranges = events.value.flatMap(event => {
      if (event.allDay) return []
      const start = minutes(event.startTime)
      const end = minutes(event.endTime)
      if (start === null || end === null || end <= start) return []
      return [{ start, end }]
    }).sort((a, b) => a.start - b.start)
    const merged: { start: number; end: number }[] = []
    for (const range of ranges) {
      const previous = merged[merged.length - 1]
      if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end)
      else merged.push({ ...range })
    }
    return merged
  })
  const busyMinutes = computed(() => intervals.value.reduce((total, range) => total + range.end - range.start, 0))
  const allDayCount = computed(() => events.value.filter(event => event.allDay).length)
  return { intervals, busyMinutes, allDayCount }
}
