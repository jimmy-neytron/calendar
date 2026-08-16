import { describe, expect, it } from 'vitest'
import { fromDatabaseRow, toDatabaseRow } from './entityMapper.js'

describe('маппинг данных Supabase', () => {
  it('преобразует camelCase в snake_case и удаляет undefined', () => {
    expect(toDatabaseRow({ workspaceId: 'w1', startTime: '10:00', ignored: undefined })).toEqual({
      workspace_id: 'w1',
      start_time: '10:00',
    })
  })

  it('заменяет пустые внешние ключи на null', () => {
    expect(toDatabaseRow({ calendarId: '', linkedEntityId: '', title: '' })).toEqual({
      calendar_id: null,
      linked_entity_id: null,
      title: '',
    })
  })

  it('преобразует ответ базы в camelCase', () => {
    expect(fromDatabaseRow({ workspace_id: 'w1', created_at: 'now', title: 'Событие' })).toEqual({
      workspaceId: 'w1',
      createdAt: 'now',
      title: 'Событие',
    })
  })
})
