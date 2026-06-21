<template>
  <section class="movies-page">
    <header class="movies-hero panel">
      <div class="movies-hero__copy">
        <span>Кино на вечер</span>
        <h1>Что будем смотреть?</h1>
        <p>Ищи фильмы и сериалы, сохраняй понравившееся и возвращайся к списку, когда появится свободный вечер.</p>
      </div>
      <form class="movie-search" @submit.prevent="runSearch(1)">
        <UiIcon name="search" />
        <input v-model="searchQuery" type="search" placeholder="Название фильма или сериала" aria-label="Поиск фильмов и сериалов" @input="scheduleSearch">
        <button v-if="searchQuery" type="button" aria-label="Очистить поиск" @click="clearSearch"><UiIcon name="close" /></button>
        <span v-else>Enter</span>
      </form>
    </header>

    <div v-if="!isTmdbConfigured" class="movies-setup panel">
      <span class="movies-setup__icon"><UiIcon name="key" /></span>
      <div>
        <strong>Осталось подключить TMDB</strong>
        <p>Добавь Read Access Token в файл <code>.env.local</code> и перезапусти приложение.</p>
        <code>VITE_TMDB_READ_ACCESS_TOKEN=твой_токен</code>
      </div>
    </div>

    <template v-else>
      <nav class="movies-tabs" aria-label="Разделы фильмов">
        <button v-for="tab in tabs" :key="tab.value" type="button" :class="{ active: activeTab === tab.value }" @click="selectTab(tab.value)">
          {{ tab.label }}<small v-if="tab.value === 'watchlist'">{{ watchlist.length }}</small>
        </button>
      </nav>

      <section v-if="isSearching" class="movies-section">
        <div class="movie-filters panel">
          <label>
            <span>Тип</span>
            <UiSelect v-model="searchMediaType" @update:model-value="applyFilters">
              <option value="all">Фильмы и сериалы</option>
              <option value="movie">Только фильмы</option>
              <option value="tv">Только сериалы</option>
            </UiSelect>
          </label>
          <label>
            <span>Год</span>
            <UiSelect v-model="searchYear" @update:model-value="applyFilters">
              <option value="">Любой год</option>
              <option v-for="year in yearOptions" :key="year" :value="String(year)">{{ year }}</option>
            </UiSelect>
          </label>
          <label>
            <span>Жанр</span>
            <UiSelect v-model="searchGenreId" @update:model-value="applyFilters">
              <option value="0">Все жанры</option>
              <option v-for="genre in genres" :key="genre.id" :value="String(genre.id)">{{ genre.name }}</option>
            </UiSelect>
          </label>
          <label>
            <span>Рейтинг</span>
            <UiSelect v-model="searchMinRating" @update:model-value="applyFilters">
              <option value="0">Любой рейтинг</option>
              <option value="6">От 6</option>
              <option value="7">От 7</option>
              <option value="8">От 8</option>
              <option value="9">От 9</option>
            </UiSelect>
          </label>
          <button v-if="hasActiveFilters" type="button" @click="resetFilters"><UiIcon name="refresh" />Сбросить</button>
        </div>
        <SectionHeading eyebrow="Результаты поиска" :title="`«${submittedQuery}»`" :count="searchCountLabel" />
        <MovieSearchLoader v-if="searchLoading" :title="searchPage > 1 ? `Загружаем страницу ${searchPage}…` : 'Ищем кино…'" />
        <MovieGrid v-else :movies="visibleMovies" empty-title="Ничего не нашли" empty-text="Попробуй другое название или ослабь фильтры." @toggle="toggleWatchlist" @plan="handlePlanAction" @open="openMovieDetails" />
        <nav v-if="!searchLoading && searchTotalPages > 1" class="movie-pagination" aria-label="Страницы результатов">
          <button type="button" :disabled="searchPage === 1" aria-label="Предыдущая страница" @click="changePage(searchPage - 1)"><UiIcon name="left" /></button>
          <template v-for="item in paginationItems" :key="item.key">
            <span v-if="item.type === 'ellipsis'">…</span>
            <button v-else type="button" :class="{ active: item.page === searchPage }" :aria-current="item.page === searchPage ? 'page' : undefined" @click="changePage(item.page)">
              {{ item.page }}
            </button>
          </template>
          <button type="button" :disabled="searchPage === searchTotalPages" aria-label="Следующая страница" @click="changePage(searchPage + 1)"><UiIcon name="right" /></button>
        </nav>
      </section>

      <template v-else-if="activeTab === 'all'">
        <section v-if="featuredMovie" class="movie-feature panel">
          <img v-if="featuredBackdrop" :src="featuredBackdrop" :alt="`Кадр из «${featuredMovie.title}»`">
          <div class="movie-feature__shade" />
          <div class="movie-feature__content">
            <span>В тренде на этой неделе</span>
            <h2>{{ featuredMovie.title }}</h2>
            <p>{{ featuredMovie.overview || 'Один из самых обсуждаемых проектов этой недели.' }}</p>
            <div>
              <b v-if="featuredMovie.voteAverage">★ {{ featuredMovie.voteAverage.toFixed(1) }}</b>
              <small>{{ featuredMovie.mediaType === 'movie' ? 'Фильм' : 'Сериал' }} · {{ featuredMovie.releaseDate?.slice(0, 4) || 'Скоро' }}</small>
              <UiButton :icon="movieWatchlistStore.isSaved(featuredMovie) ? '✓' : '+'" @click="toggleWatchlist(featuredMovie)">
                {{ movieWatchlistStore.isSaved(featuredMovie) ? 'В списке' : 'Хочу посмотреть' }}
              </UiButton>
              <UiButton variant="secondary" icon="calendar" @click="handlePlanAction(featuredMovie)">
                {{ movieWatchlistStore.isPlanned(featuredMovie) ? 'Убрать из календаря' : 'В календарь' }}
              </UiButton>
              <UiButton variant="ghost" @click="openMovieDetails(featuredMovie)">Подробнее</UiButton>
            </div>
          </div>
        </section>
        <section v-else class="movie-feature-empty panel">
          <div class="movie-feature-empty__visual">
            <span><UiIcon name="movie" /></span><i /><i /><i />
          </div>
          <div>
            <span>Кино на вечер</span>
            <h2>Каталог скоро вернётся</h2>
            <p>Пока TMDB недоступен, можно открыть сохранённое, подготовить поиск или повторить подключение.</p>
            <footer>
              <UiButton variant="secondary" icon="refresh" @click="retryLastRequest">Повторить подключение</UiButton>
              <UiButton icon="heart" @click="selectTab('watchlist')">Хочу посмотреть · {{ watchlist.length }}</UiButton>
            </footer>
          </div>
        </section>
        <MediaShelf title="Сейчас популярно" eyebrow="Фильмы" :movies="popularMovies" :loading="loading" @toggle="toggleWatchlist" @plan="handlePlanAction" @open="openMovieDetails" />
        <MediaShelf title="Сериалы, о которых говорят" eyebrow="Сериалы" :movies="popularTv" :loading="loading" @toggle="toggleWatchlist" @plan="handlePlanAction" @open="openMovieDetails" />
      </template>

      <section v-else class="movies-section">
        <SectionHeading :eyebrow="sectionEyebrow" :title="sectionTitle" :count="`${visibleMovies.length} ${activeTab === 'watchlist' ? 'в списке' : 'популярных'}`" />
        <MovieGrid
          :movies="visibleMovies"
          :loading="loading"
          :empty-title="activeTab === 'watchlist' ? 'Список пока пуст' : 'Ничего не загрузилось'"
          :empty-text="activeTab === 'watchlist' ? 'Нажми плюс на карточке — фильм останется здесь.' : 'Попробуй обновить страницу чуть позже.'"
          @toggle="toggleWatchlist"
          @plan="handlePlanAction"
          @open="openMovieDetails"
        />
      </section>

      <MovieErrorModal
        v-model="isErrorModalOpen"
        :title="errorTitle"
        :description="errorMessage"
        :hint="errorHint"
        @retry="retryLastRequest"
      />

      <UiModal v-model="isPlannerOpen" title="Запланировать просмотр" eyebrow="Фильмы" width="440px">
        <div class="movie-planner">
          <div class="movie-planner__title">
            <span><UiIcon name="movie" /></span>
            <div><small>{{ planningMovie?.mediaType === 'movie' ? 'Фильм' : 'Сериал' }}</small><strong>{{ planningMovie?.title }}</strong></div>
          </div>
          <div class="movie-planner__row">
            <UiInput v-model="planDate" type="date" label="Дата" />
            <UiInput v-model="planTime" type="time" label="Время" />
          </div>
          <label class="movie-planner__field">
            <span>Календарь</span>
            <UiSelect v-model="planCalendarId">
              <option v-for="calendar in calendars" :key="calendar.id" :value="calendar.id">{{ calendar.name }}</option>
            </UiSelect>
          </label>
          <label class="movie-planner__field">
            <span>Напоминание</span>
            <UiSelect v-model="planReminder">
              <option value="none">Не напоминать</option>
              <option value="15m">За 15 минут</option>
              <option value="1h">За 1 час</option>
              <option value="1d">За 1 день</option>
            </UiSelect>
          </label>
          <footer>
            <UiButton variant="secondary" @click="isPlannerOpen = false">Отмена</UiButton>
            <UiButton :loading="planning" @click="confirmPlan">Добавить в календарь</UiButton>
          </footer>
        </div>
      </UiModal>

      <MovieDetailsDrawer
        v-model="isDetailsOpen"
        :movie="selectedMovie"
        :details="movieDetails"
        :loading="detailsLoading"
        :error="detailsError"
        :saved="selectedMovie ? movieWatchlistStore.isSaved(selectedMovie) : false"
        :planned="selectedMovie ? movieWatchlistStore.isPlanned(selectedMovie) : false"
        @toggle="toggleWatchlist"
        @plan="handleDetailsPlanAction"
        @retry="loadMovieDetails"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MediaShelf from '../../components/movies/MediaShelf.vue'
import MovieGrid from '../../components/movies/MovieGrid.vue'
import MovieDetailsDrawer from '../../components/movies/MovieDetailsDrawer.vue'
import MovieErrorModal from '../../components/movies/MovieErrorModal.vue'
import MovieSearchLoader from '../../components/movies/MovieSearchLoader.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import UiInput from '../../components/ui/UiInput.vue'
import UiModal from '../../components/ui/UiModal.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import { useNotification } from '../../composables/ui/useNotification.js'
import { getMediaDetails, getMediaGenres, getPopularMedia, getTmdbImageUrl, getTrendingMedia, isTmdbConfigured, searchMedia } from '../../services/tmdb.service'
import { movieWatchlistStore } from '../../stores/movieWatchlist.store'
import { calendarCollectionStore } from '../../stores/calendarCollection.store.js'
import type { MediaType, MovieDetails, MovieGenre, MovieMedia } from '../../types/movie'
import { DateHelper } from '../../utils/date/dateHelper.js'

type MoviesTab = 'all' | 'movie' | 'tv' | 'watchlist'
const tabs: Array<{ value: MoviesTab; label: string }> = [
  { value: 'all', label: 'Обзор' }, { value: 'movie', label: 'Фильмы' },
  { value: 'tv', label: 'Сериалы' }, { value: 'watchlist', label: 'Хочу посмотреть' },
]

const SectionHeading = defineComponent({
  props: { eyebrow: String, title: String, count: String },
  setup: (props) => () => h('div', { class: 'movies-section__heading' }, [
    h('div', [h('span', props.eyebrow), h('h2', props.title)]), h('small', props.count),
  ]),
})

const { notify } = useNotification()
const activeTab = ref<MoviesTab>('all')
const searchQuery = ref('')
const submittedQuery = ref('')
const trending = ref<MovieMedia[]>([])
const popularMovies = ref<MovieMedia[]>([])
const popularTv = ref<MovieMedia[]>([])
const searchResults = ref<MovieMedia[]>([])
const loading = ref(false)
const searchLoading = ref(false)
const errorMessage = ref('')
const isErrorModalOpen = ref(false)
const searchPage = ref(1)
const searchTotalPages = ref(1)
const searchTotalResults = ref(0)
const searchMediaType = ref<MediaType | 'all'>('all')
const searchYear = ref('')
const searchGenreId = ref('0')
const searchMinRating = ref('0')
const genres = ref<MovieGenre[]>([])
const isPlannerOpen = ref(false)
const planningMovie = ref<MovieMedia | null>(null)
const planDate = ref(DateHelper.toKey(new Date()))
const planTime = ref('20:00')
const planCalendarId = ref('')
const planReminder = ref('1h')
const planning = ref(false)
const isDetailsOpen = ref(false)
const selectedMovie = ref<MovieMedia | null>(null)
const movieDetails = ref<MovieDetails | null>(null)
const detailsLoading = ref(false)
const detailsError = ref('')
let detailsRequestId = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined
let searchRequestId = 0

const watchlist = movieWatchlistStore.watchlist
const calendars = calendarCollectionStore.activeCollections
const isSearching = computed(() => Boolean(submittedQuery.value))
const featuredMovie = computed(() => trending.value.find((movie) => movie.backdropPath) || trending.value[0])
const featuredBackdrop = computed(() => getTmdbImageUrl(featuredMovie.value?.backdropPath || '', 'original'))
const visibleMovies = computed(() => {
  if (isSearching.value) return searchResults.value
  if (activeTab.value === 'movie') return popularMovies.value
  if (activeTab.value === 'tv') return popularTv.value
  if (activeTab.value === 'watchlist') return watchlist.value
  return trending.value
})
const sectionTitle = computed(() => ({ movie: 'Популярные фильмы', tv: 'Популярные сериалы', watchlist: 'Твой список', all: 'В тренде' })[activeTab.value])
const sectionEyebrow = computed(() => activeTab.value === 'watchlist' ? 'На потом' : 'Сейчас смотрят')
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 80 }, (_, index) => currentYear - index)
})
const hasActiveFilters = computed(() => (
  searchMediaType.value !== 'all'
  || Boolean(searchYear.value)
  || searchGenreId.value !== '0'
  || searchMinRating.value !== '0'
))
const searchCountLabel = computed(() => (
  searchGenreId.value !== '0' || searchMinRating.value !== '0'
    ? `${visibleMovies.value.length} на странице · страница ${searchPage.value} из ${searchTotalPages.value}`
    : `${searchTotalResults.value} найдено · страница ${searchPage.value} из ${searchTotalPages.value}`
))
const paginationItems = computed(() => {
  const pages = new Set([1, searchTotalPages.value, searchPage.value - 1, searchPage.value, searchPage.value + 1])
  const values = [...pages].filter((page) => page >= 1 && page <= searchTotalPages.value).sort((a, b) => a - b)
  const items: Array<{ key: string; type: 'page' | 'ellipsis'; page: number }> = []
  values.forEach((page, index) => {
    if (index && page - values[index - 1] > 1) items.push({ key: `ellipsis-${page}`, type: 'ellipsis', page: 0 })
    items.push({ key: `page-${page}`, type: 'page', page })
  })
  return items
})
const isTmdbAuthError = computed(() => errorMessage.value.includes('TMDB не принял ключ'))
const errorTitle = computed(() => isTmdbAuthError.value ? 'TMDB отклонил доступ' : 'Каталог временно недоступен')
const errorHint = computed(() => (
  isTmdbAuthError.value
    ? 'В .env.local нужен сам Read Access Token без слова Bearer и без кавычек. После изменения перезапусти Vite.'
    : 'Проверь соединение и повтори запрос.'
))

watch(errorMessage, (message) => {
  if (message) isErrorModalOpen.value = true
})

onMounted(async () => {
  await loadCatalog()
  if (isTmdbConfigured) {
    try {
      genres.value = await getMediaGenres()
    } catch {
      genres.value = []
    }
  }
})
onBeforeUnmount(() => clearTimeout(searchTimer))

async function loadCatalog(): Promise<void> {
  if (!isTmdbConfigured) return
  loading.value = true
  errorMessage.value = ''
  try {
    const [trend, movies, tv] = await Promise.all([getTrendingMedia(), getPopularMedia('movie'), getPopularMedia('tv')])
    trending.value = trend
    popularMovies.value = movies
    popularTv.value = tv
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

function scheduleSearch(): void {
  clearTimeout(searchTimer)
  if (!searchQuery.value.trim()) return clearSearch()
  searchTimer = setTimeout(() => runSearch(1), 450)
}

async function runSearch(page = 1): Promise<void> {
  clearTimeout(searchTimer)
  const query = searchQuery.value.trim()
  if (!query) return clearSearch()
  const requestId = ++searchRequestId
  submittedQuery.value = query
  searchPage.value = page
  searchLoading.value = true
  errorMessage.value = ''
  try {
    const result = await searchMedia(query, {
      page,
      mediaType: searchMediaType.value,
      year: searchYear.value,
      genreId: Number(searchGenreId.value),
      minRating: Number(searchMinRating.value),
    })
    if (requestId === searchRequestId) {
      searchResults.value = result.movies
      searchPage.value = result.page
      searchTotalPages.value = result.totalPages
      searchTotalResults.value = result.totalResults
    }
  } catch (error) {
    if (requestId === searchRequestId) errorMessage.value = getErrorMessage(error)
  } finally {
    if (requestId === searchRequestId) searchLoading.value = false
  }
}

function clearSearch(): void {
  searchRequestId += 1
  searchQuery.value = ''
  submittedQuery.value = ''
  searchResults.value = []
  searchPage.value = 1
  searchTotalPages.value = 1
  searchTotalResults.value = 0
  searchLoading.value = false
}

function applyFilters(): void {
  if (submittedQuery.value) runSearch(1)
}

function resetFilters(): void {
  searchMediaType.value = 'all'
  searchYear.value = ''
  searchGenreId.value = '0'
  searchMinRating.value = '0'
  applyFilters()
}

function changePage(page: number): void {
  if (page < 1 || page > searchTotalPages.value || page === searchPage.value) return
  runSearch(page)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function selectTab(tab: MoviesTab): void {
  activeTab.value = tab
  clearSearch()
}

async function toggleWatchlist(movie: MovieMedia): Promise<void> {
  const result = await movieWatchlistStore.toggle(movie)
  if (result.blocked) {
    notify(result.message || 'Сначала убери фильм из календаря', 'warning')
    return
  }
  if (!result.ok) {
    notify(result.message || 'Не удалось синхронизировать список', 'warning')
    return
  }
  notify(result.saved ? 'Добавлено в «Хочу посмотреть»' : 'Убрано из списка', result.saved ? 'success' : 'info')
}

function retryLastRequest(): void {
  isErrorModalOpen.value = false
  if (isSearching.value) runSearch(searchPage.value)
  else loadCatalog()
}

async function openMovieDetails(movie: MovieMedia): Promise<void> {
  selectedMovie.value = movie
  movieDetails.value = null
  detailsError.value = ''
  isDetailsOpen.value = true
  await loadMovieDetails()
}

async function loadMovieDetails(): Promise<void> {
  if (!selectedMovie.value) return
  const requestId = ++detailsRequestId
  detailsLoading.value = true
  detailsError.value = ''
  try {
    const details = await getMediaDetails(selectedMovie.value)
    if (requestId === detailsRequestId) movieDetails.value = details
  } catch (error) {
    if (requestId === detailsRequestId) detailsError.value = getErrorMessage(error)
  } finally {
    if (requestId === detailsRequestId) detailsLoading.value = false
  }
}

async function handleDetailsPlanAction(movie: MovieMedia): Promise<void> {
  isDetailsOpen.value = false
  await handlePlanAction(movie)
}

async function handlePlanAction(movie: MovieMedia): Promise<void> {
  if (movieWatchlistStore.isPlanned(movie)) {
    const result = await movieWatchlistStore.unplanMovie(movie)
    notify(result.ok ? 'Просмотр убран из календаря' : result.message, result.ok ? 'info' : 'warning')
    return
  }

  const collectionsReady = await calendarCollectionStore.ensureWorkspaceCollections()
  if (!collectionsReady?.ok) {
    notify(collectionsReady?.message || 'Не удалось подготовить календарь', 'warning')
    return
  }
  planningMovie.value = movie
  planDate.value = DateHelper.toKey(new Date())
  planTime.value = '20:00'
  planCalendarId.value = calendars.value[0]?.id || ''
  planReminder.value = '1h'
  isPlannerOpen.value = true
}

async function confirmPlan(): Promise<void> {
  if (!planningMovie.value || !planDate.value) {
    notify('Выбери дату просмотра', 'warning')
    return
  }
  planning.value = true
  const result = await movieWatchlistStore.planMovie(planningMovie.value, {
    date: planDate.value,
    time: planTime.value,
    calendarId: planCalendarId.value,
    reminder: planReminder.value,
  })
  planning.value = false
  notify(result.ok ? 'Фильм добавлен в календарь' : result.message, result.ok ? 'success' : 'warning')
  if (result.ok) isPlannerOpen.value = false
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === 'TMDB_UNAUTHORIZED') return 'TMDB не принял ключ. Проверь Read Access Token в .env.local.'
  return 'Не удалось связаться с TMDB. Проверь интернет и попробуй ещё раз.'
}
</script>

<style scoped>
.movies-page{display:grid;gap:16px}.movies-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,520px);align-items:end;gap:24px;padding:22px;background:radial-gradient(circle at 90% 0%,color-mix(in srgb,var(--info) 10%,transparent),transparent 45%),var(--panel-bg)}.movies-hero__copy>span,.movies-section :deep(.movies-section__heading) span{color:var(--text-muted);font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.movies-hero h1{margin:4px 0 7px}.movies-hero p{max-width:600px;margin:0;color:var(--text-secondary)}.movie-search{display:grid;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;gap:8px;min-height:48px;border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:0 16px;background:var(--field-bg);transition:.18s var(--ease-out)}.movie-search:focus-within{border-color:var(--accent-border);background:var(--field-bg-focus);box-shadow:0 0 0 3px var(--accent-soft)}.movie-search>svg{color:var(--text-muted);font-size:17px}.movie-search input{min-width:0;border:0;color:var(--text-primary);background:transparent;outline:0}.movie-search input::-webkit-search-cancel-button{display:none}.movie-search button{display:grid;place-items:center;border:0;padding:4px;color:var(--text-muted);background:transparent}.movie-search>span{border:1px solid var(--border-color);border-radius:5px;padding:2px 6px;color:var(--text-muted);font-size:9px}.movies-setup{display:grid;grid-template-columns:48px minmax(0,1fr);align-items:start;gap:14px;padding:18px}.movies-setup__icon{display:grid;place-items:center;width:48px;height:48px;border-radius:14px;color:var(--text-inverse);background:var(--accent);font-size:20px}.movies-setup strong{display:block;font-size:15px}.movies-setup p{margin:3px 0 10px;color:var(--text-secondary)}.movies-setup code{display:inline-block;border:1px solid var(--border-color);border-radius:7px;padding:6px 9px;color:var(--text-secondary);background:var(--control-bg);font-size:11px}.movies-tabs{display:flex;gap:5px;overflow-x:auto}.movies-tabs button{display:flex;align-items:center;gap:6px;min-height:34px;border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:0 13px;color:var(--text-muted);background:var(--control-bg);font-size:11px;font-weight:750;white-space:nowrap}.movies-tabs button.active{color:var(--text-inverse);border-color:var(--accent);background:var(--accent)}.movies-tabs small{display:grid;place-items:center;min-width:17px;height:17px;border-radius:50%;background:color-mix(in srgb,currentColor 12%,transparent);font-size:9px}.movie-feature{position:relative;min-height:330px;overflow:hidden}.movie-feature>img,.movie-feature__shade{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.movie-feature__shade{background:linear-gradient(90deg,rgba(0,0,0,.94),rgba(0,0,0,.72) 43%,rgba(0,0,0,.08)),linear-gradient(0deg,rgba(0,0,0,.45),transparent 65%)}.movie-feature__content{position:relative;z-index:1;display:flex;flex-direction:column;justify-content:flex-end;max-width:720px;min-height:330px;padding:30px;color:#fff}.movie-feature__content>span{font-size:10px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.movie-feature h2{margin:7px 0 9px;font-size:clamp(28px,4vw,46px);line-height:1.02;letter-spacing:-.04em}.movie-feature p{display:-webkit-box;max-width:530px;margin:0 0 18px;overflow:hidden;color:rgba(255,255,255,.72);-webkit-box-orient:vertical;-webkit-line-clamp:3}.movie-feature__content>div{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.movie-feature__content b{color:#fde047}.movie-feature__content small{color:rgba(255,255,255,.65);margin-right:auto}.movies-section{display:grid;gap:10px}.movies-section :deep(.movies-section__heading){display:flex;align-items:end;justify-content:space-between;gap:12px;padding:3px 2px}.movies-section :deep(.movies-section__heading h2){margin:2px 0 0}.movies-section :deep(.movies-section__heading>small){color:var(--text-muted)}.movie-filters{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr)) auto;align-items:end;gap:8px;padding:11px}.movie-filters label{display:grid;gap:5px}.movie-filters label>span{color:var(--text-muted);font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.movie-filters>button{display:flex;align-items:center;gap:5px;min-height:36px;border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:0 11px;color:var(--text-secondary);background:var(--control-bg)}.movie-pagination{display:flex;align-items:center;justify-content:center;gap:5px;padding-top:6px}.movie-pagination button{display:grid;place-items:center;min-width:34px;height:34px;border:1px solid var(--border-color);border-radius:10px;color:var(--text-secondary);background:var(--control-bg);font-weight:750}.movie-pagination button.active{color:var(--text-inverse);border-color:var(--accent);background:var(--accent)}.movie-pagination button:disabled{opacity:.35}.movie-pagination span{padding:0 3px;color:var(--text-muted)}.movies-error{display:flex;align-items:center;gap:9px;padding:12px 14px;color:var(--danger)}.movies-error button{margin-left:auto;border:0;color:var(--text-primary);background:transparent;text-decoration:underline}.movie-planner{display:grid;gap:13px}.movie-planner__title{display:flex;align-items:center;gap:10px}.movie-planner__title>span{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;color:var(--text-inverse);background:var(--accent);font-size:18px}.movie-planner__title small,.movie-planner__title strong{display:block}.movie-planner__title small,.movie-planner__field>span{color:var(--text-muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em}.movie-planner__title strong{font-size:15px}.movie-planner__row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.movie-planner__field{display:grid;gap:5px}.movie-planner footer{display:flex;justify-content:flex-end;gap:7px;margin-top:3px}
@media(max-width:900px){.movie-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.movie-filters>button{justify-content:center}}@media(max-width:760px){.movies-hero{grid-template-columns:1fr;gap:16px;padding:17px}.movie-feature,.movie-feature__content{min-height:290px}.movie-feature__content{padding:22px}.movie-feature__shade{background:linear-gradient(0deg,rgba(0,0,0,.96),rgba(0,0,0,.25))}}@media(max-width:520px){.movies-page{gap:12px}.movies-hero{padding:14px}.movie-search{min-height:44px}.movie-search>span{display:none}.movie-feature,.movie-feature__content{min-height:320px}.movie-feature__content{padding:18px}.movie-feature__content>div{align-items:flex-start;flex-wrap:wrap}.movie-feature__content :deep(.ui-button){width:100%;margin:4px 0 0}.movies-setup{grid-template-columns:1fr}.movies-setup code{max-width:100%;overflow:auto}.movie-filters{grid-template-columns:1fr}.movie-planner__row{grid-template-columns:1fr}}
.movie-feature-empty{position:relative;display:grid;grid-template-columns:190px minmax(0,1fr);align-items:center;gap:28px;min-height:300px;padding:30px;overflow:hidden;background:radial-gradient(circle at 12% 50%,color-mix(in srgb,var(--danger) 10%,transparent),transparent 190px),var(--panel-bg)}.movie-feature-empty__visual{position:relative;display:grid;place-items:center;width:170px;height:170px;border:1px solid var(--border-color);border-radius:50%;background:var(--control-bg)}.movie-feature-empty__visual span{display:grid;place-items:center;width:74px;height:74px;border-radius:22px;color:var(--text-inverse);background:var(--accent);font-size:30px}.movie-feature-empty__visual i{position:absolute;inset:18px;border:1px solid var(--border-color);border-radius:50%}.movie-feature-empty__visual i:nth-child(3){inset:36px}.movie-feature-empty__visual i:nth-child(4){inset:-16px;border-style:dashed;animation:emptyOrbit 18s linear infinite}.movie-feature-empty>div:last-child>span{color:var(--text-muted);font-size:10px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.movie-feature-empty h2{margin:5px 0 8px;font-size:clamp(25px,4vw,38px)}.movie-feature-empty p{max-width:550px;margin:0;color:var(--text-secondary)}.movie-feature-empty footer{display:flex;flex-wrap:wrap;gap:7px;margin-top:20px}@keyframes emptyOrbit{to{transform:rotate(360deg)}}@media(max-width:650px){.movie-feature-empty{grid-template-columns:1fr;padding:22px}.movie-feature-empty__visual{width:130px;height:130px}.movie-feature-empty footer :deep(.ui-button){width:100%}}@media(prefers-reduced-motion:reduce){.movie-feature-empty__visual i{animation:none}}
</style>
