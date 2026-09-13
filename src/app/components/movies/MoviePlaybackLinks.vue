<template>
  <div class="movie-playback">
    <div class="movie-playback__links">
      <a v-if="movie.trailerKey" :href="`https://www.youtube.com/watch?v=${movie.trailerKey}`" target="_blank" rel="noopener noreferrer">Смотреть трейлер</a>
      <a v-for="link in links" :key="link.href" :href="link.href" target="_blank" rel="noopener noreferrer">{{ link.label }}</a>
    </div>
    <small v-if="loading">Ищем ссылку на просмотр…</small>
    <details v-else :open="!links.length">
      <summary>{{ links.length ? 'Изменить ссылку' : 'Добавить ссылку на просмотр' }}</summary>
      <a :href="googleUrl" target="_blank" rel="noopener noreferrer">Найти фильм в Google</a>
      <form @submit.prevent="save">
        <label>Ссылка с Кинопоиска<input v-model="input" type="url" placeholder="https://www.kinopoisk.ru/film/…/" required></label>
        <button type="submit" :disabled="saving">{{ saving ? 'Сохраняем…' : 'Применить' }}</button>
      </form>
      <small v-if="message" role="status">{{ message }}</small>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MovieDetails } from '../../types/movie'
import { findKinopoiskUrl, getMovieGoogleUrl, getPlaybackLinks, normalizeKinopoiskUrl } from '../../services/moviePlayback.service'
import { movieWatchlistStore } from '../../stores/movieWatchlist.store'

const props = defineProps<{ movie: MovieDetails }>()
const resolvedUrl = ref('')
const input = ref('')
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const savedUrl = computed(() => movieWatchlistStore.getSaved(props.movie)?.kinopoiskUrl || '')
const links = computed(() => getPlaybackLinks(savedUrl.value || resolvedUrl.value))
const googleUrl = computed(() => getMovieGoogleUrl(props.movie))

watch(() => `${props.movie.mediaType}:${props.movie.id}`, async (_, __, onCleanup) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  let current = true
  onCleanup(() => { current = false; controller.abort(); clearTimeout(timeout) })
  resolvedUrl.value = savedUrl.value
  input.value = savedUrl.value
  message.value = ''
  loading.value = !savedUrl.value
  try {
    if (!savedUrl.value) {
      const url = await findKinopoiskUrl(props.movie, controller.signal)
      if (current) { resolvedUrl.value = url; input.value = url }
    }
  } catch {
    if (current) message.value = 'Автопоиск недоступен. Найди фильм в Google и скопируй адрес результата, не открывая Кинопоиск.'
  } finally {
    clearTimeout(timeout)
    if (current) loading.value = false
  }
}, { immediate: true })

// Persist a resolved link when the movie is added to either list.
watch([() => movieWatchlistStore.isSaved(props.movie), resolvedUrl], async ([saved, url]) => {
  if (saved && url && !savedUrl.value) {
    const result = await movieWatchlistStore.saveKinopoiskUrl(props.movie, url)
    if (!result.ok) message.value = result.message || 'Не удалось сохранить ссылку'
  }
})

async function save() {
  const url = normalizeKinopoiskUrl(input.value)
  if (!url) { message.value = 'Нужна ссылка на фильм или сериал с kinopoisk.ru.'; return }
  saving.value = true
  try {
    if (movieWatchlistStore.isSaved(props.movie)) {
      const result = await movieWatchlistStore.saveKinopoiskUrl(props.movie, url)
      if (!result.ok) { message.value = result.message || 'Не удалось сохранить ссылку'; return }
    }
    resolvedUrl.value = url
    message.value = movieWatchlistStore.isSaved(props.movie) ? 'Ссылка сохранена' : 'Ссылки готовы. Добавь фильм в список, чтобы сохранить их.'
  } finally { saving.value = false }
}
</script>

<style scoped>
.movie-playback{width:100%;display:grid;gap:8px}.movie-playback__links{display:flex;flex-wrap:wrap;gap:8px}.movie-playback a{color:var(--text-primary)}.movie-playback__links a,.movie-playback button{border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:9px 13px;background:var(--control-bg);color:var(--text-primary);text-decoration:none;font-size:12px}.movie-playback details{font-size:12px}.movie-playback summary{cursor:pointer;margin-bottom:8px}.movie-playback form{display:flex;align-items:end;gap:8px;margin-top:8px}.movie-playback label{flex:1;display:grid;gap:4px;min-width:0}.movie-playback input{width:100%;box-sizing:border-box;border:1px solid var(--border-color);border-radius:8px;padding:9px;background:var(--field-bg);color:var(--text-primary)}.movie-playback small{color:var(--text-muted)}
</style>
