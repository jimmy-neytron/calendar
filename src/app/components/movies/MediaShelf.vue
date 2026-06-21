<template>
  <section class="media-shelf">
    <div class="media-shelf__heading"><div><span>{{ eyebrow }}</span><h2>{{ title }}</h2></div></div>
    <div v-if="loading" class="media-shelf__rail">
      <div v-for="index in 6" :key="index" class="media-shelf__skeleton" />
    </div>
    <div v-else-if="movies.length" class="media-shelf__rail">
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
    <div v-else class="media-shelf__fallback">
      <article v-for="item in fallbackItems" :key="item.title">
        <span><UiIcon :name="item.icon" /></span>
        <div><small>{{ item.eyebrow }}</small><strong>{{ item.title }}</strong><p>{{ item.text }}</p></div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { movieWatchlistStore } from '../../stores/movieWatchlist.store'
import type { MovieMedia } from '../../types/movie'
import UiIcon from '../ui/UiIcon.vue'
import MovieCard from './MovieCard.vue'

const props = defineProps<{ title: string; eyebrow: string; movies: MovieMedia[]; loading?: boolean }>()
defineEmits<{ toggle: [movie: MovieMedia]; plan: [movie: MovieMedia]; open: [movie: MovieMedia] }>()

const fallbackItems = computed(() => props.eyebrow === 'Сериалы'
  ? [
      { icon: 'search', eyebrow: 'Поиск', title: 'Найди сериал по названию', text: 'Каталог появится сразу после восстановления доступа к TMDB.' },
      { icon: 'star', eyebrow: 'Подборка', title: 'Выбери рейтинг и год', text: 'Фильтры помогут быстро отсеять лишнее после подключения.' },
      { icon: 'calendar', eyebrow: 'На вечер', title: 'Запланируй просмотр', text: 'Сохранённые сериалы можно отправить прямо в календарь.' },
    ]
  : [
      { icon: 'search', eyebrow: 'Поиск', title: 'Начни с любимого фильма', text: 'Введи название — запрос повторится, когда TMDB будет доступен.' },
      { icon: 'sparkles', eyebrow: 'Настроение', title: 'Приключение или драма?', text: 'Жанры и рейтинг уже готовы для точного поиска.' },
      { icon: 'heart', eyebrow: 'Коллекция', title: 'Собери список на потом', text: 'Watchlist синхронизируется между участниками пространства.' },
    ])
</script>

<style scoped>
.media-shelf{display:grid;gap:10px;min-width:0}.media-shelf__heading{display:flex;align-items:end;justify-content:space-between;padding:3px 2px}.media-shelf__heading span{color:var(--text-muted);font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.media-shelf__heading h2{margin:2px 0 0}.media-shelf__rail{display:grid;grid-auto-columns:minmax(145px,1fr);grid-auto-flow:column;gap:10px;overflow-x:auto;padding:0 1px 8px;scroll-snap-type:x proximity}.media-shelf__rail>*{scroll-snap-align:start}.media-shelf__skeleton{aspect-ratio:2/3;border-radius:var(--radius-lg);background:var(--control-bg);animation:shelf-pulse 1.5s ease-in-out infinite}.media-shelf__fallback{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.media-shelf__fallback article{display:grid;grid-template-columns:42px minmax(0,1fr);gap:11px;min-height:132px;border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:14px;background:linear-gradient(145deg,var(--card-solid),var(--card-soft))}.media-shelf__fallback article>span{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:var(--control-bg);font-size:18px}.media-shelf__fallback small{display:block;color:var(--text-muted);font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.media-shelf__fallback strong{display:block;margin-top:3px}.media-shelf__fallback p{margin:5px 0 0;color:var(--text-muted);font-size:11px}@keyframes shelf-pulse{50%{opacity:.45}}@media(min-width:1180px){.media-shelf__rail{grid-auto-columns:calc((100% - 50px)/6)}}@media(max-width:700px){.media-shelf__fallback{grid-template-columns:1fr}}@media(max-width:520px){.media-shelf__rail{grid-auto-columns:minmax(135px,44vw);gap:8px}}
</style>
