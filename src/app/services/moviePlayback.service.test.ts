import { afterEach, describe, expect, it, vi } from 'vitest'
import { findKinopoiskUrl, getPlaybackLinks, normalizeKinopoiskUrl } from './moviePlayback.service'
import type { MovieMedia } from '../types/movie'

afterEach(() => vi.unstubAllGlobals())
describe('movie playback links', () => {
  it('preserves film and series IDs while replacing only the host', () => {
    for (const type of ['film', 'series']) {
      expect(getPlaybackLinks(`https://www.kinopoisk.ru/${type}/123/?utm_source=google`).map(link => link.href))
        .toEqual([`https://qqpoisk.ru/${type}/123/`])
    }
  })
  it('rejects unrelated hosts, scripts, and non-title pages', () => {
    for (const url of ['javascript:alert(1)', 'https://kinopoisk.ru.evil.com/film/123/', 'https://evil.com/film/123/', 'https://kinopoisk.ru/name/123/']) {
      expect(normalizeKinopoiskUrl(url)).toBe('')
    }
  })
  it('does not guess an ID when a match is ambiguous or absent', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: { bindings: [{ id: { value: '1' } }, { id: { value: '2' } }] } }) })
    vi.stubGlobal('fetch', fetch)
    expect(await findKinopoiskUrl({ id: 550, mediaType: 'movie' } as MovieMedia)).toBe('')
    expect(fetch.mock.calls[0][0]).toContain('query.wikidata.org')
    fetch.mockResolvedValue({ ok: true, json: async () => ({ results: { bindings: [] } }) })
    expect(await findKinopoiskUrl({ id: 550, mediaType: 'movie' } as MovieMedia)).toBe('')
  })
})
