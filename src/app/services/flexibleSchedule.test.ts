import { describe, expect, it } from 'vitest'
import { availableSlots, canReschedule, isSlotFree, planSchedule, validateRequest, type ScheduleRequest, type ScheduledEvent } from './flexibleSchedule'
const now = new Date('2026-09-07T09:00:00')
const request: ScheduleRequest = { from: '2026-09-07', weeks: 2, count: 3, weekdays: [1, 2, 3, 4, 5], startTime: '18:00', endTime: '21:00', duration: 45, buffer: 15 }
const fixed: ScheduledEvent = { id: 'fixed', title: 'Встреча', date: '2026-09-07', startTime: '18:00', endTime: '19:00' }
describe('гибкое расписание', () => {
  it('размещает нужное количество в каждой неделе, по одному в день, с паузами', () => {
    const result = planSchedule(request, [fixed], 'group', now)
    expect(result.planned).toHaveLength(6)
    expect(result.shortages).toEqual([])
    expect(new Set(result.planned.map(e => e.date)).size).toBe(6)
    expect(result.planned[0].startTime).toBe('19:15')
    expect(fixed.startTime).toBe('18:00')
  })
  it('показывает нехватку отдельно для неполной первой недели', () => {
    const result = planSchedule({ ...request, from: '2026-09-11' }, [], 'group', now)
    expect(result.shortages).toEqual([{ week: '2026-09-07', missing: 2 }])
    expect(result.planned).toHaveLength(4)
  })
  it('не предлагает прошедшие интервалы сегодняшнего дня', () => {
    const result = planSchedule({ ...request, weeks: 1 }, [], 'group', new Date('2026-09-07T18:20:00'))
    expect(result.planned[0].startTime).toBe('18:30')
  })
  it('события на весь день блокируют дату', () => {
    const result = planSchedule({ ...request, weeks: 1, weekdays: [1] }, [{ ...fixed, allDay: true }], 'group', now)
    expect(result.planned).toEqual([])
    expect(result.shortages[0].missing).toBe(3)
  })
  it('учитывает паузу существующего гибкого события', () => {
    const [event] = planSchedule(request, [], 'group', now).planned
    expect(isSlotFree({ date: event.date, startTime: '18:45', endTime: '19:30' }, [event])).toBe(false)
    expect(isSlotFree({ date: event.date, startTime: '19:00', endTime: '19:45' }, [event])).toBe(true)
  })
  it('занимает час для события без окончания', () => {
    expect(isSlotFree({ date: fixed.date, startTime: '18:45', endTime: '19:00' }, [{ ...fixed, endTime: '' }])).toBe(false)
  })
  it('перенос сохраняет неделю, разрешённые дни и не дублирует занятие в день', () => {
    const planned = planSchedule(request, [], 'group', now).planned
    const alternatives = availableSlots(planned[0].flexibleRule!, planned.slice(1), now)
    expect(alternatives.every(s => s.date >= '2026-09-07' && s.date <= '2026-09-11')).toBe(true)
    expect(alternatives.some(s => s.date === planned[1].date)).toBe(false)
  })
  it('исключает закреплённые, завершённые, связанные и обычные события из переноса', () => {
    const [event] = planSchedule(request, [], 'group', now).planned
    expect(canReschedule(event)).toBe(true)
    expect(canReschedule({ ...event, flexibleRule: { ...event.flexibleRule!, locked: true } })).toBe(false)
    expect(canReschedule({ ...event, completedAt: '2026-09-07' })).toBe(false)
    expect(canReschedule({ ...event, linkedEntityType: 'course' })).toBe(false)
    expect(canReschedule(fixed)).toBe(false)
    expect(canReschedule({ ...event, repeat: 'weekly' })).toBe(false)
  })
  it.each([{ weeks: 0 }, { count: 1.5 }, { duration: 0 }, { buffer: -1 }, { weekdays: [] }, { from: '2026-02-31' }, { endTime: '17:00' }, { startTime: '25:00' }])('проверяет условия %j', patch => {
    expect(validateRequest({ ...request, ...patch })).not.toBe('')
  })
})
