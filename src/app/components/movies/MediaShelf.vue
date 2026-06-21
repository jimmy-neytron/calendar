<template>
  <section class="media-shelf">
    <div class="media-shelf__heading"><div><span>{{ eyebrow }}</span><h2>{{ title }}</h2></div></div>
    <div v-if="loading" class="media-shelf__rail">
      <div v-for="index in 6" :key="index" class="media-shelf__skeleton" />
    </div>
    <div v-else class="media-shelf__rail">
      <MovieCard
        v-for="movie in movies.slice(0, 12)"
        :key="`${movie.mediaType}:${movie.id}`"
        :movie="movie"
        :saved="movieWatchlistStore.isSaved(movie)"
        :planned="movieWatchlistStore.isPlanned(movie)"
        @toggle="$emit('toggle', $event)"
        @plan="$emit('plan', $event)"
        @open="$emit('open', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { movieWatchlistStore } from '../../stores/movieWatchlist.store'
import type { MovieMedia } from '../../types/movie'
import MovieCard from './MovieCard.vue'

defineProps<{ title: string; eyebrow: string; movies: MovieMedia[]; loading?: boolean }>()
defineEmits<{ toggle: [movie: MovieMedia]; plan: [movie: MovieMedia]; open: [movie: MovieMedia] }>()
</script>

<style scoped>
.media-shelf{display:grid;gap:10px;min-width:0}.media-shelf__heading{display:flex;align-items:end;justify-content:space-between;padding:3px 2px}.media-shelf__heading span{color:var(--text-muted);font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.media-shelf__heading h2{margin:2px 0 0}.media-shelf__rail{display:grid;grid-auto-columns:minmax(145px,1fr);grid-auto-flow:column;gap:10px;overflow-x:auto;padding:0 1px 8px;scroll-snap-type:x proximity}.media-shelf__rail>*{scroll-snap-align:start}.media-shelf__skeleton{aspect-ratio:2/3;border-radius:var(--radius-lg);background:var(--control-bg);animation:shelf-pulse 1.5s ease-in-out infinite}@keyframes shelf-pulse{50%{opacity:.45}}@media(min-width:1180px){.media-shelf__rail{grid-auto-columns:calc((100% - 50px)/6)}}@media(max-width:520px){.media-shelf__rail{grid-auto-columns:minmax(135px,44vw);gap:8px}}
</style>
