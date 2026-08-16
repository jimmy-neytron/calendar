// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { LocalCollectionRepository } from './LocalCollectionRepository.js'

describe('локальный репозиторий коллекции', () => {
  beforeEach(() => localStorage.clear())

  it('выполняет полный CRUD', () => {
    const repository = new LocalCollectionRepository('test-items', [])
    repository.create({ id: '1', title: 'Первый' })
    repository.create({ id: '2', title: 'Второй' })

    expect(repository.update('1', { title: 'Обновлённый' })).toEqual({ id: '1', title: 'Обновлённый' })
    expect(repository.update('missing', { title: 'Нет' })).toBeNull()
    expect(repository.findById('2')).toEqual({ id: '2', title: 'Второй' })

    repository.delete('2')
    expect(repository.getAll()).toEqual([{ id: '1', title: 'Обновлённый' }])
  })

  it('объединяет элементы по id без потери существующих полей', () => {
    const repository = new LocalCollectionRepository('test-items', [
      { id: '1', title: 'Первый', color: 'red' },
    ])
    repository.mergeById([
      { id: '1', title: 'Новый' },
      { id: '2', title: 'Второй' },
    ])

    expect(repository.getAll()).toEqual([
      { id: '1', title: 'Новый', color: 'red' },
      { id: '2', title: 'Второй' },
    ])
  })

  it('защищает коллекцию от не-массива при полной замене', () => {
    const repository = new LocalCollectionRepository('test-items', [{ id: '1' }])
    repository.replaceAll(null)
    expect(repository.getAll()).toEqual([])
  })
})
