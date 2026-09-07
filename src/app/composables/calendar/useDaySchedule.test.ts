import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useDaySchedule, type ScheduleEvent } from './useDaySchedule'

describe('useDaySchedule', () => {
  it('counts overlapping time only once and updates with events', () => {
    const events = ref<ScheduleEvent[]>([
      { startTime: '09:00', endTime: '11:00' },
      { startTime: '10:00', endTime: '12:00' },
      { startTime: '14:00', endTime: '14:30' },
    ])
    const summary = useDaySchedule(events)
    expect(summary.busyMinutes.value).toBe(210)
    expect(summary.intervals.value).toHaveLength(2)
    events.value = []
    expect(summary.busyMinutes.value).toBe(0)
  })
  it('separates all-day events and ignores incomplete or invalid intervals', () => {
    const summary = useDaySchedule(ref([
      { allDay: true, startTime: '00:00', endTime: '23:59' },
      { startTime: '10:00' },
      { startTime: '25:00', endTime: '26:00' },
      { startTime: '12:00', endTime: '11:00' },
      { startTime: '10:00:00', endTime: '10:30:00' },
    ]))
    expect(summary.allDayCount.value).toBe(1)
    expect(summary.busyMinutes.value).toBe(30)
  })
})
