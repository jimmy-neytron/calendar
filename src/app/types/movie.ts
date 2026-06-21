export type MediaType = 'movie' | 'tv'

export interface MovieMedia {
  id: number
  mediaType: MediaType
  title: string
  originalTitle: string
  overview: string
  posterPath: string
  backdropPath: string
  releaseDate: string
  voteAverage: number
  voteCount: number
  popularity: number
  genreIds: number[]
}

export interface MovieGenre {
  id: number
  name: string
}

export interface MovieSearchResult {
  movies: MovieMedia[]
  page: number
  totalPages: number
  totalResults: number
}

export interface MovieDetails extends MovieMedia {
  genres: MovieGenre[]
  runtime: number
  numberOfSeasons: number
  numberOfEpisodes: number
  status: string
  tagline: string
  trailerKey: string
}

export interface WatchlistMovie extends MovieMedia {
  workspaceId: string
  addedAt: string
  plannedEventId: string
}

export interface TmdbListResponse {
  page: number
  results: TmdbMediaResponse[]
  total_pages: number
  total_results: number
}

export interface TmdbMediaResponse {
  id: number
  media_type?: 'movie' | 'tv' | 'person'
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number
  vote_count?: number
  popularity?: number
  genre_ids?: number[]
  genres?: MovieGenre[]
  runtime?: number
  episode_run_time?: number[]
  number_of_seasons?: number
  number_of_episodes?: number
  status?: string
  tagline?: string
  videos?: {
    results?: Array<{
      key: string
      site: string
      type: string
      official?: boolean
    }>
  }
}
