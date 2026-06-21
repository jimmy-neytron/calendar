<template>
  <Teleport to="body">
    <transition name="movie-drawer-fade">
      <div v-if="modelValue" class="movie-drawer" @mousedown.self="close">
        <transition name="movie-drawer-slide" appear>
          <aside class="movie-drawer__panel" role="dialog" aria-modal="true" :aria-label="movie?.title || 'Карточка фильма'">
            <button class="movie-drawer__close" type="button" aria-label="Закрыть карточку" @click="close">
              <UiIcon name="close" />
            </button>

            <MovieSearchLoader v-if="loading" class="movie-drawer__loader" title="Открываем карточку…" />

            <MovieErrorState
              v-else-if="error"
              class="movie-drawer__error"
              title="Карточка не загрузилась"
              :description="error"
              hint="Проверь TMDB-токен или повтори запрос через несколько секунд."
              @retry="$emit('retry')"
            />

            <template v-else-if="details">
              <header class="movie-drawer__hero">
                <img v-if="backdropUrl" :src="backdropUrl" alt="">
                <div class="movie-drawer__hero-shade" />
                <div class="movie-drawer__hero-copy">
                  <span>{{ details.mediaType === 'tv' ? 'Сериал' : 'Фильм' }}</span>
                  <h2>{{ details.title }}</h2>
                  <p v-if="details.tagline">{{ details.tagline }}</p>
                </div>
              </header>

              <div class="movie-drawer__body">
                <div class="movie-drawer__summary">
                  <div class="movie-drawer__poster-wrap">
                    <img v-if="posterUrl" class="movie-drawer__poster" :src="posterUrl" :alt="`Постер «${details.title}»`">
                    <div v-else class="movie-drawer__poster movie-drawer__poster--empty"><UiIcon name="movie" /></div>
                  </div>

                  <div class="movie-drawer__quick">
                    <div class="movie-drawer__rating">
                      <span><UiIcon name="star" /></span>
                      <div><strong>{{ details.voteAverage ? details.voteAverage.toFixed(1) : '—' }}</strong><small>{{ details.voteCount.toLocaleString('ru-RU') }} оценок</small></div>
                    </div>
                    <dl>
                      <div v-if="releaseYear"><dt>Год</dt><dd>{{ releaseYear }}</dd></div>
                      <div v-if="durationLabel"><dt>Длительность</dt><dd>{{ durationLabel }}</dd></div>
                      <div v-if="details.status"><dt>Статус</dt><dd>{{ details.status }}</dd></div>
                      <div v-if="details.numberOfSeasons"><dt>Сезоны</dt><dd>{{ details.numberOfSeasons }}</dd></div>
                      <div v-if="details.numberOfEpisodes"><dt>Эпизоды</dt><dd>{{ details.numberOfEpisodes }}</dd></div>
                    </dl>
                  </div>
                </div>

                <main class="movie-drawer__content">
                  <section>
                    <span class="movie-drawer__eyebrow">О фильме</span>
                    <p class="movie-drawer__overview">{{ details.overview || 'Описание пока не добавлено.' }}</p>
                  </section>

                  <section v-if="details.genres.length">
                    <span class="movie-drawer__eyebrow">Жанры</span>
                    <div class="movie-drawer__genres">
                      <span v-for="genre in details.genres" :key="genre.id">{{ genre.name }}</span>
                    </div>
                  </section>

                  <section v-if="details.originalTitle && details.originalTitle !== details.title" class="movie-drawer__original">
                    <span class="movie-drawer__eyebrow">Оригинальное название</span>
                    <strong>{{ details.originalTitle }}</strong>
                  </section>
                </main>
              </div>

              <footer class="movie-drawer__footer">
                <a
                  v-if="details.trailerKey"
                  class="movie-drawer__trailer"
                  :href="`https://www.youtube.com/watch?v=${details.trailerKey}`"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <UiIcon name="play" />Смотреть трейлер
                </a>
                <UiButton variant="secondary" :icon="planned ? '✓' : 'calendar'" @click="$emit('plan', details)">
                  {{ planned ? 'Убрать из календаря' : 'Запланировать' }}
                </UiButton>
                <UiButton :icon="saved ? '✓' : '+'" @click="$emit('toggle', details)">
                  {{ saved ? 'В списке' : 'Хочу посмотреть' }}
                </UiButton>
              </footer>
            </template>
          </aside>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { getTmdbImageUrl } from '../../services/tmdb.service'
import type { MovieDetails, MovieMedia } from '../../types/movie'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
import MovieSearchLoader from './MovieSearchLoader.vue'
import MovieErrorState from './MovieErrorState.vue'

const props = defineProps<{
  modelValue: boolean
  movie: MovieMedia | null
  details: MovieDetails | null
  loading: boolean
  error: string
  saved: boolean
  planned: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  toggle: [movie: MovieMedia]
  plan: [movie: MovieMedia]
  retry: []
}>()

const posterUrl = computed(() => getTmdbImageUrl(props.details?.posterPath || '', 'w500'))
const backdropUrl = computed(() => getTmdbImageUrl(props.details?.backdropPath || '', 'original'))
const releaseYear = computed(() => props.details?.releaseDate?.slice(0, 4) || '')
const durationLabel = computed(() => {
  const runtime = props.details?.runtime || 0
  if (!runtime) return ''
  const hours = Math.floor(runtime / 60)
  const minutes = runtime % 60
  return hours ? `${hours} ч ${minutes ? `${minutes} мин` : ''}`.trim() : `${minutes} мин`
})

function close(): void {
  emit('update:modelValue', false)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.modelValue) close()
}

watch(() => props.modelValue, (open) => {
  document.documentElement.style.overflow = open ? 'hidden' : ''
})
onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.documentElement.style.overflow = ''
})
</script>

<style scoped>
.movie-drawer{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.62);backdrop-filter:blur(8px)}.movie-drawer__panel{position:absolute;top:10px;right:10px;bottom:10px;width:min(760px,calc(100vw - 30px));display:flex;flex-direction:column;border:1px solid var(--border-strong);border-radius:22px;background:var(--card-solid);box-shadow:-20px 0 70px rgba(0,0,0,.5);overflow:hidden}.movie-drawer__close{position:absolute;z-index:5;top:14px;right:14px;display:grid;place-items:center;width:38px;height:38px;border:1px solid rgba(255,255,255,.17);border-radius:50%;color:#fff;background:rgba(0,0,0,.52);backdrop-filter:blur(12px)}.movie-drawer__hero{position:relative;flex:0 0 min(330px,40vh);overflow:hidden;background:var(--card-soft)}.movie-drawer__hero>img,.movie-drawer__hero-shade{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.movie-drawer__hero-shade{background:linear-gradient(0deg,var(--card-solid) 0%,rgba(8,8,8,.4) 48%,rgba(0,0,0,.15) 100%),linear-gradient(90deg,rgba(0,0,0,.62),transparent 65%)}.movie-drawer__hero-copy{position:absolute;z-index:1;left:clamp(22px,5vw,44px);right:70px;bottom:28px;color:#fff}.movie-drawer__hero-copy>span,.movie-drawer__eyebrow{font-size:10px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.movie-drawer__hero-copy h2{max-width:610px;margin:5px 0 7px;font-size:clamp(32px,5vw,54px);line-height:.98;letter-spacing:-.045em}.movie-drawer__hero-copy p{margin:0;color:rgba(255,255,255,.7);font-size:15px;font-style:italic}.movie-drawer__body{flex:1;display:grid;grid-template-columns:210px minmax(0,1fr);gap:25px;padding:0 34px 26px;overflow-y:auto}.movie-drawer__summary{position:relative;margin-top:-9px}.movie-drawer__poster-wrap{position:relative;z-index:2;aspect-ratio:2/3;border:1px solid var(--border-strong);border-radius:15px;padding:5px;background:var(--card-solid);box-shadow:var(--shadow-lg)}.movie-drawer__poster{display:block;width:100%;height:100%;border-radius:10px;object-fit:cover}.movie-drawer__poster--empty{display:grid;place-items:center;color:var(--text-muted);background:var(--control-bg);font-size:34px}.movie-drawer__quick{display:grid;gap:12px;margin-top:15px}.movie-drawer__rating{display:flex;align-items:center;gap:10px}.movie-drawer__rating>span{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;color:#facc15;background:color-mix(in srgb,#facc15 12%,transparent);font-size:18px}.movie-drawer__rating strong,.movie-drawer__rating small{display:block}.movie-drawer__rating strong{font-size:20px;line-height:1}.movie-drawer__rating small{margin-top:3px;color:var(--text-muted);font-size:9px}.movie-drawer__quick dl{display:grid;gap:6px;margin:0}.movie-drawer__quick dl div{display:flex;justify-content:space-between;gap:8px;padding-bottom:6px;border-bottom:1px solid var(--border-color)}.movie-drawer__quick dt{color:var(--text-muted);font-size:10px}.movie-drawer__quick dd{margin:0;color:var(--text-secondary);font-size:10px;text-align:right}.movie-drawer__content{display:grid;align-content:start;gap:24px;padding-top:28px}.movie-drawer__eyebrow{display:block;margin-bottom:8px;color:var(--text-muted)}.movie-drawer__overview{margin:0;color:var(--text-secondary);font-size:14px;line-height:1.75}.movie-drawer__genres{display:flex;flex-wrap:wrap;gap:6px}.movie-drawer__genres span{border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:6px 10px;color:var(--text-secondary);background:var(--control-bg);font-size:10px;font-weight:700}.movie-drawer__original strong{font-size:15px}.movie-drawer__footer{flex:0 0 auto;display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:14px 22px;border-top:1px solid var(--border-color);background:color-mix(in srgb,var(--card-solid) 90%,transparent);backdrop-filter:blur(16px)}.movie-drawer__trailer{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:34px;margin-right:auto;border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:0 13px;color:var(--text-primary);background:var(--control-bg);font-size:12px;font-weight:600;text-decoration:none}.movie-drawer__loader{margin:auto;width:calc(100% - 40px)}.movie-drawer__error{display:grid;place-items:center;margin:auto;padding:30px;color:var(--text-muted);text-align:center}.movie-drawer__error>span{display:grid;place-items:center;width:52px;height:52px;border-radius:15px;color:#fff;background:var(--danger);font-size:22px}.movie-drawer__error strong{margin-top:12px;color:var(--text-primary);font-size:16px}.movie-drawer__error p{margin:3px 0 14px}.movie-drawer-fade-enter-active,.movie-drawer-fade-leave-active{transition:opacity .24s var(--ease-out)}.movie-drawer-fade-enter-from,.movie-drawer-fade-leave-to{opacity:0}.movie-drawer-slide-enter-active,.movie-drawer-slide-leave-active{transition:transform .34s var(--ease-out),opacity .24s var(--ease-out)}.movie-drawer-slide-enter-from,.movie-drawer-slide-leave-to{opacity:.6;transform:translateX(105%)}@media(max-width:650px){.movie-drawer__panel{inset:0;width:100%;border:0;border-radius:0}.movie-drawer__hero{flex-basis:290px}.movie-drawer__hero-copy{left:18px;right:60px;bottom:22px}.movie-drawer__body{grid-template-columns:1fr;padding:0 18px 22px}.movie-drawer__summary{display:grid;grid-template-columns:125px minmax(0,1fr);gap:14px;margin-top:-8px}.movie-drawer__quick{margin-top:18px}.movie-drawer__content{padding-top:0}.movie-drawer__footer{display:grid;grid-template-columns:1fr 1fr;padding:10px}.movie-drawer__trailer{grid-column:1/-1;width:100%;margin:0}.movie-drawer__footer :deep(.ui-button){width:100%}}@media(max-width:390px){.movie-drawer__summary{grid-template-columns:105px minmax(0,1fr)}.movie-drawer__hero-copy h2{font-size:30px}}
</style>
