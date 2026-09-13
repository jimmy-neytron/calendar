// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { calendarStore } from '../../stores/calendar.store.js'
import { useFlexibleSchedule } from './useFlexibleSchedule'
import { planSchedule, type ScheduledEvent } from '../../services/flexibleSchedule'
vi.mock('../../stores/workspace.store.js', async () => {
  const { ref } = await import('vue')
  return { workspaceStore: { activeWorkspaceId: ref('test') } }
})
vi.mock('../../stores/calendar.store.js', async () => {
  const { ref } = await import('vue')
  const events = ref<ScheduledEvent[]>([])
  return { calendarStore: {
    events,
    addEventAndWait: vi.fn(async (data: ScheduledEvent) => { const event = { ...data, id: `saved-${events.value.length}` }; events.value.push(event); return { ok: true, event } }),
    updateFlexibleEventAndWait: vi.fn(async (id: string, data: ScheduledEvent) => { events.value = events.value.map(e => e.id === id ? { ...data } : e); return { ok: true, event: data } }),
    deleteEventAndWait: vi.fn(async (id: string) => { events.value = events.value.filter(e => e.id !== id); return { ok: true } }),
  } }
})
const request = { from: '2026-09-07', weeks: 1, count: 2, weekdays: [1, 2, 3, 4, 5], startTime: '18:00', endTime: '21:00', duration: 45, buffer: 15 }
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-09-07T09:00:00')); calendarStore.events.value = []; vi.clearAllMocks() })
it('сохраняет предпросмотр и отменяет только созданные записи', async () => {
  const flow = useFlexibleSchedule()
  const planned = planSchedule(request, [], 'group').planned
  expect(await flow.apply(planned, 'main')).toBe(true)
  expect(calendarStore.events.value).toHaveLength(2)
  await flow.undo()
  expect(calendarStore.events.value).toEqual([])
  expect(flow.undoEntries.value).toEqual([])
})
it('повторно проверяет занятость перед сохранением', async () => {
  const flow = useFlexibleSchedule()
  const planned = planSchedule(request, [], 'group').planned
  calendarStore.events.value.push({ ...planned[0], id: 'new-meeting', flexibleRule: undefined })
  expect(await flow.apply(planned, 'main')).toBe(false)
  expect(calendarStore.addEventAndWait).not.toHaveBeenCalled()
})
it('не отменяет событие, отредактированное после добавления', async () => {
  const flow = useFlexibleSchedule()
  await flow.apply(planSchedule({ ...request, count: 1 }, [], 'group').planned, 'main')
  calendarStore.events.value[0].title = 'Новая правка'
  await flow.undo()
  expect(calendarStore.deleteEventAndWait).not.toHaveBeenCalled()
  expect(flow.message.value).toContain('Событие изменилось')
})
it('сохраняет возможность отмены частично записанного набора', async () => {
  const flow = useFlexibleSchedule()
  vi.mocked(calendarStore.addEventAndWait).mockImplementationOnce(async data => {
    const event = { ...data, id: 'saved-first' }
    calendarStore.events.value.push(event)
    return { ok: true, event }
  }).mockResolvedValueOnce({ ok: false, errors: { backend: 'Нет связи' } })
  expect(await flow.apply(planSchedule(request, [], 'group').planned, 'main')).toBe(false)
  expect(flow.undoEntries.value).toHaveLength(1)
  await flow.undo()
  expect(calendarStore.events.value).toHaveLength(0)
})

afterEach(() => vi.useRealTimers())

