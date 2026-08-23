import { describe, expect, it } from 'vitest'
import { getSyncErrorMessage } from './SyncedCollectionRepository.js'

describe('сообщения синхронизации', () => {
  it('скрывает внутренние имена таблиц и ограничений', () => {
    const message = getSyncErrorMessage(new Error(
      'null value in column "period_start" of relation "budget_months" violates not-null constraint'
    ))

    expect(message).toBe('В базе не заполнено обязательное поле «period_start» (код 23502). Примени последнюю миграцию Supabase.')
    expect(message).toContain('period_start')
    expect(message).not.toContain('budget_months')
  })

  it('различает ошибки прав и уникальности', () => {
    expect(getSyncErrorMessage(new Error('new row violates row-level security policy')))
      .toBe('Недостаточно прав для сохранения этих данных.')
    expect(getSyncErrorMessage(new Error('duplicate key value violates unique constraint')))
      .toBe('Такая запись уже существует.')
  })
})
