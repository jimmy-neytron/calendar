import type {
  MediaType,
  MovieDetails,
  MovieGenre,
  MovieMedia,
  MovieSearchResult,
  TmdbListResponse,
  TmdbMediaResponse,
} from '../types/movie'

const API_URL = 'https://api.themoviedb.org/3'
const IMAGE_URL = 'https://image.tmdb.org/t/p'
const readAccessToken = cleanCredential(import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN, true)
const apiKey = cleanCredential(import.meta.env.VITE_TMDB_API_KEY)

export const isTmdbConfigured = Boolean(readAccessToken || apiKey)

export async function getTrendingMedia(): Promise<MovieMedia[]> {
  const response = await request<TmdbListResponse>('/trending/all/week')
  return response.results.filter(isMovieOrTv).map((item) => normalizeMedia(item))
}

export async function getPopularMedia(type: MediaType): Promise<MovieMedia[]> {
  const response = await request<TmdbListResponse>(`/${type}/popular`)
  return response.results.map((item) => normalizeMedia(item, type))
}

export async function searchMedia(
  query: string,
  options: {
    page?: number
    mediaType?: MediaType | 'all'
    year?: string
    genreId?: number
    minRating?: number
  } = {},
): Promise<MovieSearchResult> {
  const mediaType = options.mediaType || 'all'
  const path = mediaType === 'all' ? '/search/multi' : `/search/${mediaType}`
  const params: Record<string, string> = {
    query: query.trim(),
    include_adult: 'false',
    page: String(options.page || 1),
  }
  if (options.year && mediaType !== 'all') {
    params[mediaType === 'tv' ? 'first_air_date_year' : 'primary_release_year'] = options.year
  }

  const response = await request<TmdbListResponse>(path, params)
  const movies = response.results
    .filter((item) => mediaType !== 'all' || isMovieOrTv(item))
    .map((item) => normalizeMedia(item, mediaType === 'all' ? undefined : mediaType))
    .filter((movie) => mediaType !== 'all' || !options.year || movie.releaseDate.startsWith(options.year))
    .filter((movie) => !options.genreId || movie.genreIds.includes(options.genreId))
    .filter((movie) => !options.minRating || movie.voteAverage >= options.minRating)

  return {
    movies,
    page: response.page,
    totalPages: Math.min(response.total_pages, 500),
    totalResults: response.total_results,
  }
}

export async function getMediaGenres(): Promise<MovieGenre[]> {
  const [movieGenres, tvGenres] = await Promise.all([
    request<{ genres: MovieGenre[] }>('/genre/movie/list'),
    request<{ genres: MovieGenre[] }>('/genre/tv/list'),
  ])
  const genres = new Map<number, MovieGenre>()
  ;[...movieGenres.genres, ...tvGenres.genres].forEach((genre) => genres.set(genre.id, genre))
  return [...genres.values()].sort((first, second) => first.name.localeCompare(second.name, 'ru'))
}

export async function getMediaDetails(movie: Pick<MovieMedia, 'id' | 'mediaType'>): Promise<MovieDetails> {
  const response = await request<TmdbMediaResponse>(`/${movie.mediaType}/${movie.id}`, {
    append_to_response: 'videos',
  })
  const normalized = normalizeMedia(response, movie.mediaType)
  const trailer = response.videos?.results?.find((video) => (
    video.site === 'YouTube' && video.type === 'Trailer' && video.official
  )) || response.videos?.results?.find((video) => video.site === 'YouTube' && video.type === 'Trailer')

  return {
    ...normalized,
    genres: response.genres || [],
    runtime: Number(response.runtime || response.episode_run_time?.[0] || 0),
    numberOfSeasons: Number(response.number_of_seasons || 0),
    numberOfEpisodes: Number(response.number_of_episodes || 0),
    status: response.status || '',
    tagline: response.tagline || '',
    trailerKey: trailer?.key || '',
  }
}

export function getTmdbImageUrl(path: string, size = 'w500'): string {
  return path ? `${IMAGE_URL}/${size}${path}` : ''
}

async function request<T>(path: string, query: Record<string, string> = {}): Promise<T> {
  if (!isTmdbConfigured) throw new Error('TMDB_NOT_CONFIGURED')

  const url = new URL(`${API_URL}${path}`)
  url.searchParams.set('language', 'ru-RU')
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value))
  if (apiKey && !readAccessToken) url.searchParams.set('api_key', apiKey)

  const response = await fetch(url, {
    headers: readAccessToken
      ? { Authorization: `Bearer ${readAccessToken}`, accept: 'application/json' }
      : { accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(response.status === 401 ? 'TMDB_UNAUTHORIZED' : 'TMDB_REQUEST_FAILED')
  }
  return response.json() as Promise<T>
}

function isMovieOrTv(item: TmdbMediaResponse): boolean {
  return item.media_type === 'movie' || item.media_type === 'tv'
}

function normalizeMedia(item: TmdbMediaResponse, fallbackType?: MediaType): MovieMedia {
  const mediaType: MediaType = item.media_type === 'tv' || fallbackType === 'tv' ? 'tv' : 'movie'
  return {
    id: item.id,
    mediaType,
    title: item.title || item.name || 'Без названия',
    originalTitle: item.original_title || item.original_name || '',
    overview: item.overview || '',
    posterPath: item.poster_path || '',
    backdropPath: item.backdrop_path || '',
    releaseDate: item.release_date || item.first_air_date || '',
    voteAverage: Number(item.vote_average || 0),
    voteCount: Number(item.vote_count || 0),
    popularity: Number(item.popularity || 0),
    genreIds: Array.isArray(item.genre_ids) ? item.genre_ids.map(Number) : [],
  }
}

function cleanCredential(value: unknown, removeBearer = false): string {
  const credential = String(value || '').trim().replace(/^['"]|['"]$/g, '')
  return removeBearer ? credential.replace(/^Bearer\s+/i, '').trim() : credential
}
