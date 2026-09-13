// @vitest-environment jsdom
import { createApp, nextTick, reactive } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import MovieCard from './MovieCard.vue'
import type { MovieMedia } from '../../types/movie'

const cleanup: Array<() => void> = []
afterEach(() => cleanup.splice(0).forEach(fn => fn()))

it('exposes independent actions, selected states, and disables actions while saving', async () => {
  const movie = { id: 550, mediaType: 'movie', title: 'Фильм', posterPath: '', releaseDate: '1999-01-01' } as MovieMedia
  const onWatched = vi.fn(), onToggle = vi.fn(), onPlan = vi.fn(), onOpen = vi.fn()
  const state = reactive({ movie, saved: false, watched: false, planned: false, updating: false })
  const element = document.createElement('div')
  document.body.append(element)
  const { h } = await import('vue')
  const app = createApp({ setup: () => () => h(MovieCard, { ...state, onWatched, onToggle, onPlan, onOpen }) })
  app.mount(element)
  cleanup.push(() => { app.unmount(); element.remove() })
  const buttons = [...element.querySelectorAll<HTMLButtonElement>('.movie-card__action')]
  expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(['Добавить в «Хочу посмотреть»', 'Отметить просмотренным', 'Запланировать просмотр'])
  buttons.forEach(button => button.click())
  for (const handler of [onWatched, onToggle, onPlan]) expect(handler).toHaveBeenCalledWith(movie)
  expect(onOpen).not.toHaveBeenCalled()
  Object.assign(state, { watched: true, saved: true, planned: true, updating: true })
  await nextTick()
  expect(buttons.every(button => button.getAttribute('aria-pressed') === 'true' && button.disabled)).toBe(true)
  buttons.forEach(button => button.click())
  for (const handler of [onWatched, onToggle, onPlan]) expect(handler).toHaveBeenCalledTimes(1)
})
