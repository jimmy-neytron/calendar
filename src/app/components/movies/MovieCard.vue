<template>
  <article class="movie-card">
    <button class="movie-card__poster" type="button" :aria-label="`Открыть карточку «${movie.title}»`" @click="$emit('open', movie)">
      <img v-if="posterUrl" :src="posterUrl" :alt="`Постер «${movie.title}»`" loading="lazy">
      <div v-else class="movie-card__poster-empty"><UiIcon name="movie" /></div>
      <span class="movie-card__type">{{ movie.mediaType === 'movie' ? 'Фильм' : 'Сериал' }}</span>
      <span v-if="movie.voteAverage" class="movie-card__rating">
        <UiIcon name="star" />{{ movie.voteAverage.toFixed(1) }}
      </span>
    </button>

    <div class="movie-card__body">
      <div>
        <button class="movie-card__title" type="button" @click="$emit('open', movie)"><h3>{{ movie.title }}</h3></button>
        <p>{{ releaseYear }}</p>
      </div>
      <div class="movie-card__actions">
        <button
          class="movie-card__action"
          :class="{ 'movie-card__action--planned': planned }"
          type="button"
          :aria-label="planned ? 'Убрать фильм из календаря' : 'Добавить фильм в календарь'"
          :title="planned ? 'Убрать из календаря' : 'Запланировать просмотр'"
          @click="$emit('plan', movie)"
        >
          <UiIcon :name="planned ? 'check' : 'calendar'" />
        </button>
        <button
          class="movie-card__action"
          :class="{ 'movie-card__action--saved': saved }"
          type="button"
          :aria-label="saved ? 'Убрать из списка «Хочу посмотреть»' : 'Добавить в список «Хочу посмотреть»'"
          :title="saved ? 'Убрать из списка' : 'Хочу посмотреть'"
          @click="$emit('toggle', movie)"
        >
          <UiIcon :name="saved ? 'check' : 'plus'" />
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getTmdbImageUrl } from '../../services/tmdb.service'
import type { MovieMedia } from '../../types/movie'
import UiIcon from '../ui/UiIcon.vue'

const props = defineProps<{ movie: MovieMedia; saved: boolean; planned: boolean }>()
defineEmits<{ toggle: [movie: MovieMedia]; plan: [movie: MovieMedia]; open: [movie: MovieMedia] }>()

const posterUrl = computed(() => getTmdbImageUrl(props.movie.posterPath, 'w500'))
const releaseYear = computed(() => props.movie.releaseDate?.slice(0, 4) || 'Дата не указана')
</script>

<style scoped>
.movie-card{min-width:0;overflow:hidden;border:1px solid var(--border-color);border-radius:var(--radius-lg);background:var(--card-solid);transition:transform .2s var(--ease-out),border-color .2s var(--ease-out),box-shadow .2s var(--ease-out)}
.movie-card:hover{transform:translateY(-3px);border-color:var(--border-strong);box-shadow:var(--shadow-md)}
.movie-card__poster{position:relative;display:block;width:100%;aspect-ratio:2/3;overflow:hidden;border:0;padding:0;background:var(--card-soft);text-align:left}
.movie-card__poster img{width:100%;height:100%;display:block;object-fit:cover;transition:transform .45s var(--ease-out)}
.movie-card:hover .movie-card__poster img{transform:scale(1.035)}
.movie-card__poster-empty{display:grid;place-items:center;width:100%;height:100%;color:var(--text-muted);font-size:32px;background:linear-gradient(145deg,var(--card-soft),var(--control-bg))}
.movie-card__type,.movie-card__rating{position:absolute;top:8px;display:flex;align-items:center;gap:3px;min-height:22px;border:1px solid rgba(255,255,255,.12);border-radius:var(--radius-pill);padding:0 7px;color:#fff;background:rgba(0,0,0,.68);backdrop-filter:blur(9px);font-size:9px;font-weight:800}
.movie-card__type{left:8px;text-transform:uppercase;letter-spacing:.08em}.movie-card__rating{right:8px}.movie-card__rating :deep(svg){color:#facc15}
.movie-card__body{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding:10px}
.movie-card__title{display:block;max-width:100%;border:0;padding:0;background:transparent;text-align:left}.movie-card__body h3{margin:0;overflow:hidden;color:var(--text-primary);font-size:13px;line-height:1.25;text-overflow:ellipsis;white-space:nowrap}.movie-card__title:hover h3{text-decoration:underline}.movie-card__body p{margin:2px 0 0;color:var(--text-muted);font-size:10px}
.movie-card__actions{display:flex;gap:5px}.movie-card__action{display:grid;place-items:center;width:29px;height:29px;border:1px solid var(--border-color);border-radius:50%;color:var(--text-secondary);background:var(--control-bg);transition:.18s var(--ease-out)}
.movie-card__action:hover{color:var(--text-primary);border-color:var(--border-strong);transform:scale(1.05)}.movie-card__action--saved{color:var(--text-inverse);border-color:var(--accent);background:var(--accent)}.movie-card__action--planned{color:#fff;border-color:color-mix(in srgb,var(--success) 65%,transparent);background:var(--success)}
</style>
