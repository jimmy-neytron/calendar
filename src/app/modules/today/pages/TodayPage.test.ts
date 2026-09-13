// @vitest-environment jsdom
import { createApp, ref, type App } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import TodayPage from './TodayPage.vue'
const state = vi.hoisted(() => ({ notify: vi.fn(), update: vi.fn(), challenge: vi.fn(), exercise: vi.fn(), events: [] as Array<{id: string; completedAt: string | null}>, item: { id: 'item', action: 'toggle-exercise', done: false } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../../../composables/ui/useNotification.js', () => ({ useNotification: () => ({ notify: state.notify }) }))
vi.mock('../../../stores/calendar.store.js', () => ({ calendarStore: { todayEvents: { get value() { return state.events } }, updateEvent: state.update } }))
vi.mock('../../../stores/challenge.store.js', () => ({ challengeStore: { toggleDate: state.challenge } }))
vi.mock('../../../stores/sport.store.js', () => ({ sportStore: { todayKey: { value: '2026-09-13' }, toggleExercise: state.exercise } }))
vi.mock('../composables/useTodaySections', () => ({ useTodaySections: () => ({ sections: ref([{ id: 'tasks', items: [state.item] }]), todayTitle: 'сегодня' }) }))
vi.mock('../composables/useTodayPreferences', () => ({ useTodayPreferences: () => ({ preferences: ref({ sectionOrder: ['tasks'] }), hiddenSectionIds: ref(new Set()), setSectionVisible: vi.fn(), moveSection: vi.fn(), reset: vi.fn() }) }))
vi.mock('../components/TodaySectionCard.vue', () => ({ default: { props: ['items'], emits: ['item-action'], template: `<button class="test-action" @click="$emit('item-action', items[0])">Действие</button>` } }))
vi.mock('../components/TodayCustomizeModal.vue', () => ({ default: { template: '<div />' } }))
let app: App
beforeEach(() => { state.notify.mockClear(); state.events = []; state.item = { id: 'item', action: 'toggle-exercise', done: false } })
afterEach(() => { app?.unmount(); document.body.replaceChildren() })
function run() {
  const host = document.createElement('div'); document.body.append(host)
  app = createApp(TodayPage); app.mount(host)
  host.querySelector<HTMLButtonElement>('.test-action')!.click()
}
it('uses returned exercise completion state instead of a stale card state', () => {
  state.exercise.mockReturnValue({ ok: true, completed: false })
  run()
  expect(state.notify).toHaveBeenCalledWith('Отметка выполнения упражнения снята', 'info')
})
it('never confirms exercise completion after a failed operation', () => {
  state.exercise.mockReturnValue({ ok: false, message: 'Сначала войди в аккаунт' })
  run()
  expect(state.notify).toHaveBeenCalledWith('Сначала войди в аккаунт', 'warning')
  expect(state.notify).not.toHaveBeenCalledWith(expect.anything(), 'success')
})
it('uses the pre-update state when an event object is mutated', () => {
  state.item.action = 'toggle-event'
  state.events = [{ id: 'item', completedAt: '2026-09-13T10:00:00Z' }]
  state.update.mockImplementation((_id, changes) => { Object.assign(state.events[0], changes); return { ok: true } })
  run()
  expect(state.notify).toHaveBeenCalledWith('Отметка выполнения события снята', 'info')
})
it('announces undoing a daily goal as information', () => {
  state.item.action = 'toggle-challenge'
  state.challenge.mockReturnValue({ ok: true, completed: false })
  run()
  expect(state.notify).toHaveBeenCalledWith('Отметка выполнения цели за сегодня снята', 'info')
})
