// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => ({
  repositoryInstances: [],
  idCounter: 1,
  activityLog: [],
  activeWorkspaceId: { value: 'space-test' },
  activeWorkspace: {
    value: {
      id: 'space-test',
      name: 'Test workspace',
      roles: { 'user-1': 'owner', 'user-2': 'member' },
    },
  },
  activeWorkspaceMembers: {
    value: [
      { id: 'user-1', name: 'Аня', role: 'owner' },
      { id: 'user-2', name: 'Паша', role: 'member' },
    ],
  },
  activeCollections: {
    value: [
      {
        id: 'calendar-main',
        workspaceId: 'space-test',
        name: 'Основной',
        visible: true,
      },
    ],
  },
  currentUserId: { value: 'user-1' },
  currentUser: {
    value: {
      id: 'user-1',
      name: 'Аня',
      email: 'anya@example.com',
    },
  },
  notifyEventChange: vi.fn(),
  notifyEventComment: vi.fn(),
  notifyEventReminder: vi.fn(),
}))

class MockSyncedCollectionRepository {
  constructor(_storageKey, initialValue = []) {
    this.items = { value: [...initialValue] }
    this.lastError = { value: '' }
    this.pendingCount = { value: 0 }
    mockState.repositoryInstances.push(this)
  }

  create(item) {
    this.items.value = [...this.items.value, item]
    return item
  }

  async createAndWait(item) {
    this.create(item)
    return { ok: true, item }
  }

  update(id, updates) {
    let updatedItem = null

    this.items.value = this.items.value.map((item) => {
      if (item.id !== id) return item

      updatedItem = { ...item, ...updates }
      return updatedItem
    })

    return updatedItem
  }

  delete(id) {
    this.items.value = this.items.value.filter((item) => item.id !== id)
  }

  async deleteAndWait(id) {
    this.delete(id)
    return { ok: true }
  }

  findById(id) {
    return this.items.value.find((item) => item.id === id)
  }

  loadWorkspace() {
    return []
  }
}

vi.mock('../repositories/SyncedCollectionRepository.js', () => ({
  SyncedCollectionRepository: MockSyncedCollectionRepository,
}))

vi.mock('../config/app.config.js', () => ({
  APP_CONFIG: {
    name: 'Test Calendar',
    storageKey: 'test-calendar',
    version: 'test',
  },
}))

vi.mock('../utils/seed/sampleData.js', () => ({
  defaultEvents: [],
}))

vi.mock('../utils/helpers/idGenerator.js', () => ({
  generateId: () => `generated-${mockState.idCounter++}`,
}))

vi.mock('../utils/validators/calendarValidator.js', () => ({
  validateEvent: (event) => {
    const errors = {}

    if (!event.title || !event.title.trim()) {
      errors.title = 'Введите название события'
    }

    if (!event.date) {
      errors.date = 'Выберите дату'
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
      errors.date = 'Дата должна быть в формате ГГГГ-ММ-ДД'
    }

    if (!event.allDay && event.startTime && event.endTime && event.endTime < event.startTime) {
      errors.endTime = 'Время окончания должно быть позже начала'
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    }
  },
}))

vi.mock('../utils/formatters/dateFormatter.js', () => ({
  toDateKey: (date) => toDateKey(date),
}))

vi.mock('../utils/date/dateHelper.js', () => ({
  DateHelper: {
    parseKey: parseDateKey,
    toKey: toDateKey,
    addDays: (date, days) => {
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + days)
      return nextDate
    },
    addMonths: (date, months) => {
      const nextDate = new Date(date)
      nextDate.setMonth(nextDate.getMonth() + months)
      return nextDate
    },
    addYears: (date, years) => {
      const nextDate = new Date(date)
      nextDate.setFullYear(nextDate.getFullYear() + years)
      return nextDate
    },
    isValidKey: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseDateKey(value).getTime()),
  },
}))

vi.mock('../composables/preferences/useBudgetSettings.js', () => ({
  readBudgetSetting: () => true,
}))

vi.mock('../composables/recurrence/useRecurringEvents.js', () => ({
  useRecurringEvents: () => ({
    expandRecurringEvents: (events) => events,
  }),
}))

vi.mock('../composables/history/useActivityLog.js', () => ({
  useActivityLog: () => ({
    addActivity: vi.fn((...args) => mockState.activityLog.push(args)),
  }),
}))

vi.mock('./workspace.store.js', () => ({
  workspaceStore: {
    activeWorkspaceId: mockState.activeWorkspaceId,
    activeWorkspace: mockState.activeWorkspace,
    activeWorkspaceMembers: mockState.activeWorkspaceMembers,
  },
}))

vi.mock('./notification.store.js', () => ({
  notificationStore: {
    notifyEventChange: mockState.notifyEventChange,
    notifyEventComment: mockState.notifyEventComment,
    notifyEventReminder: mockState.notifyEventReminder,
  },
}))

vi.mock('./calendarCollection.store.js', () => ({
  calendarCollectionStore: {
    activeCollections: mockState.activeCollections,
    ensureWorkspaceCollections: vi.fn(() => ({ ok: true, collections: mockState.activeCollections.value })),
  },
}))

vi.mock('./auth.store.js', () => ({
  authStore: {
    currentUserId: mockState.currentUserId,
    currentUser: mockState.currentUser,
  },
}))

vi.mock('../utils/constants/linkedEntityTypes.js', () => ({
  CALENDAR_LINK_CHANGE_EVENT: 'calendar-linked-event-change',
  LINKED_ENTITY_TYPES: {
    BUDGET_PAYMENT: 'budget-payment',
  },
}))

describe('calendarStore: события календаря', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    localStorage.clear()
    mockState.repositoryInstances.length = 0
    mockState.activityLog.length = 0
    mockState.idCounter = 1
    mockState.activeWorkspaceId.value = 'space-test'
    mockState.activeWorkspace.value = {
      id: 'space-test',
      name: 'Test workspace',
      roles: { 'user-1': 'owner', 'user-2': 'member' },
    }
    mockState.currentUserId.value = 'user-1'
    mockState.currentUser.value = {
      id: 'user-1',
      name: 'Аня',
      email: 'anya@example.com',
    }
  })

  it('создаёт событие, нормализует поля и отправляет уведомление', async () => {
    const { calendarStore, repository } = await importCalendarStore()

    const result = calendarStore.addEvent({
      title: '  Созвон команды  ',
      date: '2026-07-01',
      startTime: '10:00',
      endTime: '11:00',
      memberIds: ['user-2'],
      category: 'work',
      reminder: '15m',
    })

    expect(result.ok).toBe(true)
    expect(result.event).toMatchObject({
      id: 'generated-1',
      workspaceId: 'space-test',
      calendarId: 'calendar-main',
      title: 'Созвон команды',
      date: '2026-07-01',
      startTime: '10:00',
      endTime: '11:00',
      memberIds: ['user-2'],
      reminder: '1h',
    })
    expect(repository.items.value).toHaveLength(1)
    expect(mockState.notifyEventChange).toHaveBeenCalledWith('create', result.event)
    expect(mockState.activityLog[0][0]).toBe('event:create')
  })

  it('не создаёт событие без названия', async () => {
    const { calendarStore, repository } = await importCalendarStore()

    const result = calendarStore.addEvent({
      title: '   ',
      date: '2026-07-01',
    })

    expect(result.ok).toBe(false)
    expect(result.errors.title).toBe('Введите название события')
    expect(repository.items.value).toHaveLength(0)
    expect(mockState.notifyEventChange).not.toHaveBeenCalled()
  })

  it('переносит событие на другую дату и сохраняет длительность', async () => {
    const { calendarStore, repository } = await importCalendarStore()
    const event = createBaseEvent(calendarStore)

    const result = calendarStore.moveEvent(event.id, '2026-07-03', '13:30')

    expect(result.ok).toBe(true)
    expect(repository.findById(event.id)).toMatchObject({
      date: '2026-07-03',
      startTime: '13:30',
      endTime: '14:30',
    })
    expect(mockState.notifyEventChange).toHaveBeenLastCalledWith(
      'move',
      expect.objectContaining({ id: event.id, date: '2026-07-03' }),
      expect.objectContaining({ id: event.id, date: '2026-07-01' })
    )
    expect(mockState.activityLog.some(([type]) => type === 'event:move')).toBe(true)
  })

  it('при переносе all-day события не проставляет время', async () => {
    const { calendarStore, repository } = await importCalendarStore()
    const result = calendarStore.addEvent({
      title: 'Отпуск',
      date: '2026-07-01',
      allDay: true,
    })

    calendarStore.moveEvent(result.event.id, '2026-07-05', '12:00')

    expect(repository.findById(result.event.id)).toMatchObject({
      date: '2026-07-05',
      startTime: '',
      endTime: '',
      allDay: true,
    })
  })

  it('изменяет длительность события, но не делает её меньше 15 минут', async () => {
    const { calendarStore, repository } = await importCalendarStore()
    const event = createBaseEvent(calendarStore)

    expect(calendarStore.resizeEvent(event.id, 30).ok).toBe(true)
    expect(repository.findById(event.id).endTime).toBe('11:30')

    expect(calendarStore.resizeEvent(event.id, -120).ok).toBe(true)
    expect(repository.findById(event.id).endTime).toBe('10:15')
  })

  it('не изменяет длительность события на весь день', async () => {
    const { calendarStore } = await importCalendarStore()
    const result = calendarStore.addEvent({
      title: 'День рождения',
      date: '2026-07-01',
      allDay: true,
    })

    expect(calendarStore.resizeEvent(result.event.id, 60)).toEqual({
      ok: false,
      errors: { event: 'Нельзя изменить длительность' },
    })
  })

  it('дублирует событие на завтра и сбрасывает повтор', async () => {
    const { calendarStore, repository } = await importCalendarStore()
    const event = createBaseEvent(calendarStore, {
      repeat: 'weekly',
      repeatUntil: '2026-08-01',
      repeatEndType: 'until',
    })

    const result = calendarStore.duplicateEvent(event.id, 'tomorrow')

    expect(result.ok).toBe(true)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toMatchObject({
      id: 'generated-2',
      date: '2026-07-02',
      repeat: 'none',
      repeatUntil: '',
      repeatEndType: 'never',
      repeatCount: 0,
    })
    expect(result.events[0].parentId).toBeUndefined()
    expect(repository.items.value).toHaveLength(2)
    expect(mockState.notifyEventChange).toHaveBeenLastCalledWith('create', result.events[0], event)
  })

  it('обновляет исходное событие при работе с occurrence id повторяющегося события', async () => {
    const { calendarStore, repository } = await importCalendarStore()
    const event = createBaseEvent(calendarStore)

    const result = calendarStore.updateEvent(`${event.id}::2026-07-08`, {
      title: 'Обновлённый созвон',
    })

    expect(result.ok).toBe(true)
    expect(repository.findById(event.id).title).toBe('Обновлённый созвон')
  })

  it('добавляет комментарий и не создаёт обычное уведомление об обновлении события', async () => {
    const { calendarStore, repository } = await importCalendarStore()
    const event = createBaseEvent(calendarStore, {
      memberIds: ['user-1', 'user-2'],
    })

    mockState.notifyEventChange.mockClear()

    const result = calendarStore.addComment(event.id, '  Буду на 10 минут позже  ')

    expect(result.ok).toBe(true)
    expect(repository.findById(event.id).comments).toHaveLength(1)
    expect(repository.findById(event.id).comments[0]).toMatchObject({
      userId: 'user-1',
      userName: 'Аня',
      text: 'Буду на 10 минут позже',
    })
    expect(mockState.notifyEventComment).toHaveBeenCalledWith(
      expect.objectContaining({ id: event.id }),
      expect.objectContaining({ text: 'Буду на 10 минут позже' })
    )
    expect(mockState.notifyEventChange).not.toHaveBeenCalled()
  })

  it('сохраняет ответ участника на событие', async () => {
    const { calendarStore, repository } = await importCalendarStore()
    const event = createBaseEvent(calendarStore, {
      memberIds: ['user-1', 'user-2'],
    })

    const result = calendarStore.respondToEvent(event.id, 'accepted')

    expect(result.ok).toBe(true)
    expect(repository.findById(event.id).attendeeResponses).toEqual({
      'user-1': 'accepted',
    })
    expect(calendarStore.respondToEvent(event.id, 'unknown')).toEqual({ ok: false })
  })

  it('сообщает связанным разделам об обновлении и удалении события', async () => {
    const { calendarStore } = await importCalendarStore()
    const event = createBaseEvent(calendarStore)
    const linkedChanges = []

    window.addEventListener('calendar-linked-event-change', (customEvent) => {
      linkedChanges.push(customEvent.detail)
    })

    calendarStore.updateEvent(event.id, { location: 'Переговорка 1' })
    calendarStore.deleteEvent(event.id)

    expect(linkedChanges).toEqual([
      {
        action: 'update',
        event: expect.objectContaining({ id: event.id, location: 'Переговорка 1' }),
      },
      {
        action: 'delete',
        event: expect.objectContaining({ id: event.id }),
      },
    ])
  })
})

async function importCalendarStore() {
  const { calendarStore } = await import('./calendar.store.js')
  const repository = mockState.repositoryInstances[0]

  return {
    calendarStore,
    repository,
  }
}

function createBaseEvent(calendarStore, overrides = {}) {
  const result = calendarStore.addEvent({
    title: 'Созвон команды',
    date: '2026-07-01',
    startTime: '10:00',
    endTime: '11:00',
    category: 'work',
    ...overrides,
  })

  expect(result.ok).toBe(true)

  return result.event
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`)
}

function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}
