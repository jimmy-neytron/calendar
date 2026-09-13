// @vitest-environment jsdom
import { createApp, nextTick } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import type { MovieDetails } from '../../types/movie'
import MoviePlaybackLinks from './MoviePlaybackLinks.vue'

vi.mock('../../stores/movieWatchlist.store', () => ({ movieWatchlistStore: {
  getSaved: () => ({ kinopoiskUrl: 'https://www.kinopoisk.ru/film/361/' }),
  isSaved: () => true,
} }))
const cleanup: Array<() => void> = []
afterEach(() => cleanup.splice(0).forEach(fn => fn()))

it.each(['trailer123', ''])('shows the playback link with trailer=%s', async (trailerKey) => {
  const element = document.createElement('div')
  document.body.append(element)
  const app = createApp(MoviePlaybackLinks, { movie: {
    id: 550, mediaType: 'movie', title: 'Бойцовский клуб', originalTitle: 'Fight Club', releaseDate: '1999-10-15', trailerKey,
  } as MovieDetails })
  app.mount(element)
  cleanup.push(() => { app.unmount(); element.remove() })
  await nextTick()
  const links = [...element.querySelectorAll<HTMLAnchorElement>('.movie-playback__links a')]
  expect(links.map(link => link.href)).toEqual([
    ...(trailerKey ? [`https://www.youtube.com/watch?v=${trailerKey}`] : []),
    'https://qqpoisk.ru/film/361/',
  ])
  expect(links.every(link => link.target === '_blank' && link.rel.includes('noopener'))).toBe(true)
})
