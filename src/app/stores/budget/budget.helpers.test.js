import { describe, expect, it } from 'vitest'
import {
  createBudgetMonthRecord,
  findDuplicateBudgetName,
  getBudgetDueDate,
  normalizeBudgetDateKey,
  toBudgetMonthKey,
  toBudgetPaymentView,
} from './budget.helpers.js'

describe('чистые функции бюджета', () => {
  it('ограничивает срок платежа последним днём месяца', () => {
    expect(getBudgetDueDate('2026-02', 31)).toBe('2026-02-28')
    expect(getBudgetDueDate('2024-02', 31)).toBe('2024-02-29')
  })

  it('строго нормализует дату и месяц', () => {
    expect(normalizeBudgetDateKey('2026-08-16T12:00:00')).toBe('2026-08-16')
    expect(normalizeBudgetDateKey('2026-02-30')).toBe('')
    expect(toBudgetMonthKey('2026-08-16')).toBe('2026-08')
    expect(toBudgetMonthKey('2026-13')).toBe('')
  })

  it('создаёт запись месяца только из валидного ключа периода', () => {
    expect(createBudgetMonthRecord({
      id: 'month-1',
      workspaceId: 'workspace-1',
      month: '2026-08-23',
      plannedIncome: '1000,50',
      status: 'active',
      createdAt: '2026-08-01T00:00:00.000Z',
    })).toEqual({
      id: 'month-1',
      workspaceId: 'workspace-1',
      month: '2026-08-01',
      plannedIncome: 1000.5,
      status: 'active',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    })
    expect(createBudgetMonthRecord({
      id: 'month-2',
      workspaceId: 'workspace-1',
      month: '2026-13',
    })).toBeNull()
  })

  it('находит повтор названия без учёта регистра и пробелов', () => {
    expect(findDuplicateBudgetName([{ name: ' Дом ' }, { title: 'дом' }])).toBe('дом')
  })

  it('создаёт представление платежа для интерфейса', () => {
    expect(toBudgetPaymentView({ plannedAmount: '10,5', dueDate: '2026-08-16', status: 'paid' })).toMatchObject({
      amount: 10.5,
      date: '2026-08-16',
      paid: true,
    })
  })
})
