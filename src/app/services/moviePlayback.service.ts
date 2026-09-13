import type { MovieMedia } from '../types/movie'

export function normalizeKinopoiskUrl(value: string): string {
  try {
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol) || !['kinopoisk.ru', 'www.kinopoisk.ru'].includes(url.hostname)) return ''
    const match = url.pathname.match(/^\/(film|series)\/([1-9]\d*)\/?$/)
    return match ? `https://www.kinopoisk.ru/${match[1]}/${match[2]}/` : ''
  } catch { return '' }
}

export function getPlaybackLinks(value: string) {
  const url = normalizeKinopoiskUrl(value)
  return url ? [
    { label: 'Смотреть', href: url.replace('www.kinopoisk.ru', 'qqpoisk.ru') },
  ] : []
}

export function getMovieGoogleUrl(movie: MovieMedia): string {
  const query = `${movie.title} ${movie.originalTitle} ${movie.releaseDate.slice(0, 4)} site:kinopoisk.ru/${movie.mediaType === 'tv' ? 'series' : 'film'}/`
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

export async function findKinopoiskUrl(movie: MovieMedia, signal?: AbortSignal): Promise<string> {
  if (!Number.isSafeInteger(movie.id) || movie.id <= 0) return ''
  const property = movie.mediaType === 'tv' ? 'P4983' : 'P4947'
  const query = `SELECT DISTINCT ?id WHERE { ?item wdt:${property} "${movie.id}"; wdt:P2603 ?id. } LIMIT 2`
  const params = new URLSearchParams({ query, format: 'json' })
  const response = await fetch(`https://query.wikidata.org/sparql?${params}`, { signal, headers: { Accept: 'application/sparql-results+json' } })
  if (!response.ok) throw new Error('Не удалось найти ссылку')
  const data: { results?: { bindings?: Array<{ id?: { value?: string } }> } } = await response.json()
  const matches = data.results?.bindings || []
  const id = matches.length === 1 ? matches[0].id?.value || '' : ''
  return /^[1-9]\d*$/.test(id) ? `https://www.kinopoisk.ru/${movie.mediaType === 'tv' ? 'series' : 'film'}/${id}/` : ''
}
