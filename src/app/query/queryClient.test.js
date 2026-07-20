import { describe, expect, it } from 'vitest'
import { queryKeys } from './queryKeys.js'
import { unwrapSupabaseResult } from './queryClient.js'

describe('системный слой TanStack Query', () => {
  it('изолирует кэш коллекций по таблице и workspace', () => {
    expect(queryKeys.collections.workspace('events', 'family-a')).toEqual([
      'collections',
      'events',
      'family-a',
    ])
    expect(queryKeys.collections.workspace('events', 'family-a')).not.toEqual(
      queryKeys.collections.workspace('events', 'family-b')
    )
  })

  it('позволяет инвалидировать все запросы активности workspace общим префиксом', () => {
    const prefix = queryKeys.activity.workspace('family-a')
    const listKey = queryKeys.activity.list('family-a', { page: 1 })
    expect(listKey.slice(0, prefix.length)).toEqual(prefix)
  })

  it('возвращает данные Supabase и не скрывает ошибку', () => {
    expect(unwrapSupabaseResult({ data: ['ok'], error: null })).toEqual(['ok'])
    const error = new Error('Нет доступа')
    expect(() => unwrapSupabaseResult({ data: null, error })).toThrow(error)
  })
})
