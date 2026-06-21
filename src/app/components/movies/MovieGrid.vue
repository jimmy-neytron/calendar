<template>
  <div v-if="loading" class="movie-grid movie-grid--loading" aria-label="Загрузка">
    <div v-for="index in 10" :key="index" class="movie-skeleton"><span /><i /><i /></div>
  </div>
  <div v-else-if="movies.length" class="movie-grid">
    <MovieCard
      v-for="movie in movies"
      :key="`${movie.mediaType}:${movie.id}`"
      :movie="movie"
      :saved="movieWatchlistStore.isSaved(movie)"
      :planned="movieWatchlistStore.isPlanned(movie)"
      @toggle="$emit('toggle', $event)"
      @plan="$emit('plan', $event)"
      @open="$emit('open', $event)"
    />
  </div>
  <div v-else class="movie-grid-empty">
    <UiIcon name="movie" />
    <strong>{{ emptyTitle }}</strong>
    <p>{{ emptyText }}</p>
  </div>
</template>

<script setup lang="ts">
import { movieWatchlistStore } from '../../stores/movieWatchlist.store'
import type { MovieMedia } from '../../types/movie'
import UiIcon from '../ui/UiIcon.vue'
import MovieCard from './MovieCard.vue'

withDefaults(defineProps<{
  movies: MovieMedia[]
  loading?: boolean
  emptyTitle?: string
  emptyText?: string
}>(), {
  loading: false,
  emptyTitle: 'Здесь пока пусто',
  emptyText: 'Подходящие фильмы появятся здесь.',
})
defineEmits<{ toggle: [movie: MovieMedia]; plan: [movie: MovieMedia]; open: [movie: MovieMedia] }>()
</script>

<style scoped>
.movie-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.movie-skeleton{display:grid;gap:8px}.movie-skeleton span{aspect-ratio:2/3;border-radius:var(--radius-lg);background:var(--control-bg)}.movie-skeleton i{width:75%;height:10px;border-radius:var(--radius-pill);background:var(--control-bg)}.movie-skeleton i:last-child{width:42%;height:7px}.movie-grid--loading>*{animation:skeleton-pulse 1.5s ease-in-out infinite}.movie-grid-empty{display:grid;place-items:center;min-height:240px;border:1px dashed var(--border-color);border-radius:var(--radius-xl);padding:25px;color:var(--text-muted);text-align:center}.movie-grid-empty>svg{margin-bottom:8px;font-size:28px}.movie-grid-empty strong{color:var(--text-secondary);font-size:14px}.movie-grid-empty p{margin:3px 0 0}@keyframes skeleton-pulse{50%{opacity:.45}}@media(max-width:1100px){.movie-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:760px){.movie-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:520px){.movie-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}}
</style>
