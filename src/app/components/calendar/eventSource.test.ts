import { describe, expect, it } from 'vitest'
import { getEventSourceRoute } from './eventSource'

describe('переход к источнику события', () => {
  it('открывает фильм по ключу, который ожидает страница фильмов', () => {
    expect(getEventSourceRoute({ linkedEntityType: 'movie-watchlist', linkedEntityId: 'workspace:tv:123' }))
      .toEqual({ name: 'movies', query: { movie: 'tv:123' } })
  })
  it('открывает напоминание через исходный день рождения', () => {
    expect(getEventSourceRoute({ linkedEntityType: 'birthday-reminder', linkedEntityId: 'birthday-id' }))
      .toEqual({ name: 'birthdays', query: { birthday: 'birthday-id' } })
  })
  it('не создаёт маршрут без связи или для неизвестного раздела', () => {
    expect(getEventSourceRoute({ linkedEntityType: 'idea' })).toBeNull()
    expect(getEventSourceRoute({ linkedEntityType: 'unknown', linkedEntityId: 'id' })).toBeNull()
  })
})
