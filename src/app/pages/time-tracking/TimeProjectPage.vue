<template>
  <section v-if="project" class="project-page" :style="{ '--project-color': project.color }">
    <header class="project-hero panel">
      <RouterLink class="back-link" :to="{ name: 'time-tracking' }">
        <UiIcon name="left" /> Учёт времени
      </RouterLink>
      <div class="project-hero__main">
        <span class="project-mark"><UiIcon name="clock" /></span>
        <div>
          <small>Проект</small>
          <h1>{{ project.name }}</h1>
          <p>{{ entries.length }} {{ pluralize(entries.length, ['запись', 'записи', 'записей']) }} · {{ analytics.activeDays }} активных дней</p>
          <UiColorPicker
            class="project-hero__colors"
            :model-value="project.color"
            label="Цвет проекта"
            @change="updateProjectColor"
          />
        </div>
      </div>
      <button class="project-delete" type="button" @click="removeProject">
        <UiIcon name="trash" /> Удалить проект
      </button>
    </header>

    <section class="project-metrics">
      <article>
        <span>Эта неделя</span>
        <strong>{{ formatDuration(analytics.weekMinutes) }}</strong>
        <small>{{ currentWeekLabel }}</small>
      </article>
      <article>
        <span>Этот месяц</span>
        <strong>{{ formatDuration(analytics.monthMinutes) }}</strong>
        <small>{{ currentMonthLabel }}</small>
      </article>
      <article>
        <span>Всё время</span>
        <strong>{{ formatDuration(analytics.totalMinutes) }}</strong>
        <small>{{ analytics.activeDays }} активных дней</small>
      </article>
      <article>
        <span>Средняя запись</span>
        <strong>{{ formatDuration(analytics.averageEntryMinutes) }}</strong>
        <small>на одну запись</small>
      </article>
    </section>

    <section class="project-charts">
      <article class="chart-card chart-card--wide panel">
        <header>
          <div><small>Текущая неделя</small><h2>Часы по дням</h2></div>
          <span>{{ formatDuration(analytics.weekMinutes) }}</span>
        </header>
        <AnalyticsBarChart :items="analytics.weekChart" :color="project.color" compact />
      </article>

      <article class="chart-card panel">
        <header>
          <div><small>Распределение</small><h2>По дням недели</h2></div>
        </header>
        <AnalyticsDonut :items="analytics.weekdayBreakdown" label="часов" />
      </article>

      <article class="chart-card chart-card--full panel">
        <header>
          <div><small>Последние 6 месяцев</small><h2>Динамика проекта</h2></div>
          <span>{{ formatDuration(analytics.totalMinutes) }} всего</span>
        </header>
        <AnalyticsBarChart :items="analytics.monthChart" :color="project.color" compact />
      </article>
    </section>

    <section class="entries-card panel">
      <header class="entries-card__header">
        <div>
          <small>Журнал проекта</small>
          <h2>Все записи</h2>
        </div>
        <div class="period-tabs">
          <button
            v-for="option in periodOptions"
            :key="option.value"
            type="button"
            :class="{ active: period === option.value }"
            @click="period = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </header>

      <div v-if="pagedEntries.length" class="project-entry-list">
        <article v-for="entry in pagedEntries" :key="entry.id">
          <div class="entry-date">
            <strong>{{ formatDay(entry.date) }}</strong>
            <span>{{ formatMonth(entry.date) }}</span>
          </div>
          <div class="entry-copy">
            <strong>{{ formatDuration(entry.minutes) }}</strong>
            <p>{{ entry.note || 'Без комментария' }}</p>
          </div>
          <UiIconButton
            icon="trash"
            label="Удалить запись"
            size="sm"
            variant="danger"
            @click="removeEntry(entry.id)"
          />
        </article>
      </div>
      <div v-else class="entries-empty">За выбранный период записей пока нет.</div>

      <footer class="entries-card__footer">
        <span v-if="filteredEntries.length">
          {{ rangeStart }}–{{ rangeEnd }} из {{ filteredEntries.length }}
        </span>
        <CollectionPagination :page="page" :page-count="pageCount" @change="goToPage" />
      </footer>
    </section>
  </section>

  <section v-else class="project-missing panel">
    <span><UiIcon name="warning" /></span>
    <h1>Проект не найден</h1>
    <p>Возможно, он был удалён или относится к другому пространству.</p>
    <UiButton @click="router.push({ name: 'time-tracking' })">Вернуться к учёту времени</UiButton>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AnalyticsBarChart from '../analytics/components/AnalyticsBarChart.vue'
import AnalyticsDonut from '../analytics/components/AnalyticsDonut.vue'
import CollectionPagination from '../../components/collections/CollectionPagination.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiColorPicker from '../../components/ui/UiColorPicker.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import UiIconButton from '../../components/ui/UiIconButton.vue'
import { usePaginatedView } from '../../composables/collections/usePaginatedView.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { timeTrackingStore } from '../../stores/timeTracking.store'

type Period = 'week' | 'month' | 'all'

const route = useRoute()
const router = useRouter()
const { notify } = useNotification()
const projectId = computed(() => String(route.params.projectId || ''))
const project = computed(() => timeTrackingStore.getProjectById(projectId.value))
const entries = computed(() => timeTrackingStore.getProjectEntries(projectId.value))
const analytics = computed(() => timeTrackingStore.getProjectAnalytics(projectId.value))
const period = ref<Period>('month')
const periodOptions: Array<{ value: Period; label: string }> = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'all', label: 'Всё время' },
]

const filteredEntries = computed(() => {
  if (period.value === 'all') return entries.value
  const now = new Date()
  const start = period.value === 'week'
    ? getWeekStart(now)
    : new Date(now.getFullYear(), now.getMonth(), 1)
  const end = period.value === 'week'
    ? addDays(start, 6)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const startKey = toDateKey(start)
  const endKey = toDateKey(end)
  return entries.value.filter((entry) => entry.date >= startKey && entry.date <= endKey)
})

const {
  pageSize,
  page,
  pageCount,
  pagedItems: pagedEntries,
  rangeStart,
  rangeEnd,
  goToPage,
  resetPage,
} = usePaginatedView(filteredEntries, 'time-project-entries')
pageSize.value = 10

const currentMonthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date())
const currentWeekLabel = computed(() => {
  const start = getWeekStart(new Date())
  const end = addDays(start, 6)
  return `${formatShortDate(start)} — ${formatShortDate(end)}`
})

watch([period, projectId], resetPage)

async function removeEntry(id: string) {
  const result = await timeTrackingStore.removeEntry(id)
  notify(
    result.ok ? 'Запись удалена' : result.message || 'Не удалось удалить запись',
    result.ok ? 'info' : 'danger',
  )
}

async function removeProject() {
  if (!project.value) return
  const projectName = project.value.name
  const projectToDeleteId = project.value.id
  if (!window.confirm(`Удалить проект «${projectName}» и все его записи (${entries.value.length})?`)) return
  const result = await timeTrackingStore.removeProject(projectToDeleteId)
  if (!result.ok) {
    notify(result.message || 'Не удалось удалить проект', 'danger')
    return
  }
  notify(`Проект «${projectName}» удалён`, 'info')
  await router.replace({ name: 'time-tracking' })
}

async function updateProjectColor(color: string) {
  if (!project.value) return
  const result = await timeTrackingStore.updateProjectColor(project.value.id, color)
  if (!result.ok) notify(result.message || 'Не удалось изменить цвет', 'danger')
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} мин`
  if (!rest) return `${hours} ч`
  return `${hours} ч ${rest} мин`
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit' }).format(new Date(`${date}T12:00:00`))
}

function formatMonth(date: string) {
  return new Intl.DateTimeFormat('ru-RU', { month: 'short', weekday: 'short' })
    .format(new Date(`${date}T12:00:00`))
    .replace('.', '')
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date)
}

function getWeekStart(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day))
  return start
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function pluralize(value: number, words: [string, string, string]) {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return words[2]
  if (last === 1) return words[0]
  if (last >= 2 && last <= 4) return words[1]
  return words[2]
}
</script>

<style scoped>
.project-page{display:grid;gap:12px;width:min(100%,1160px);margin:0 auto;animation:fadeSlideUp .42s var(--ease-out)}.project-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:18px;overflow:hidden;padding:24px 26px;background:radial-gradient(circle at 88% 25%,color-mix(in srgb,var(--project-color) 18%,transparent),transparent 250px),var(--panel-bg)}.back-link{grid-column:1/-1;display:flex;align-items:center;gap:5px;width:max-content;color:var(--text-muted);font-size:10px;text-decoration:none}.project-hero__main{display:flex;align-items:center;gap:13px}.project-mark{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;color:var(--project-color);background:color-mix(in srgb,var(--project-color) 12%,var(--control-bg));font-size:23px}.project-hero__main small,.chart-card header small,.entries-card__header small{color:var(--project-color);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.project-hero h1{margin:2px 0 4px}.project-hero p{margin:0;color:var(--text-muted)}.project-hero__colors{width:min(100%,220px);margin-top:9px}.project-delete{display:flex;align-items:center;gap:6px;border:1px solid color-mix(in srgb,var(--danger) 24%,var(--border-color));border-radius:var(--radius-pill);padding:8px 11px;color:var(--danger);background:color-mix(in srgb,var(--danger) 7%,var(--control-bg));font-size:10px;font-weight:750}.project-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.project-metrics article{display:grid;gap:2px;border:1px solid var(--border-color);border-radius:14px;padding:16px 17px;background:var(--card-bg)}.project-metrics span{color:var(--text-muted);font-size:9px;font-weight:800;text-transform:uppercase}.project-metrics strong{font-size:22px}.project-metrics small{color:var(--text-muted);font-size:9px}.project-charts{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(320px,.7fr);gap:12px}.chart-card{display:grid;gap:18px;padding:19px}.chart-card--full{grid-column:1/-1}.chart-card header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.chart-card h2{margin:2px 0 0}.chart-card header>span{color:var(--text-muted);font-size:10px}.entries-card{display:grid;gap:12px;padding:20px}.entries-card__header{display:flex;align-items:center;justify-content:space-between;gap:14px}.entries-card__header h2{margin:2px 0 0}.period-tabs{display:flex;gap:4px;border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:3px;background:var(--control-bg)}.period-tabs button{min-height:30px;border:0;border-radius:var(--radius-pill);padding:0 11px;color:var(--text-muted);background:transparent;font-size:10px;font-weight:750}.period-tabs button.active{color:var(--text-inverse);background:var(--accent)}.project-entry-list{display:grid}.project-entry-list article{display:grid;grid-template-columns:58px minmax(0,1fr) auto;align-items:center;gap:13px;border-top:1px solid var(--border-color);padding:13px 0}.entry-date{display:grid;justify-items:center;border:1px solid var(--border-color);border-radius:11px;padding:6px;background:var(--control-bg)}.entry-date strong{font-size:18px;line-height:1}.entry-date span{margin-top:3px;color:var(--text-muted);font-size:8px;text-transform:uppercase}.entry-copy{min-width:0}.entry-copy p{overflow:hidden;margin:3px 0 0;color:var(--text-secondary);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.entries-empty{padding:38px;text-align:center;color:var(--text-muted)}.entries-card__footer{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;border-top:1px solid var(--border-color);padding-top:10px}.entries-card__footer>span{color:var(--text-muted);font-size:9px}.entries-card__footer :deep(.collection-pagination){grid-column:2}.project-missing{display:grid;justify-items:center;gap:7px;width:min(100%,520px);margin:50px auto;padding:42px;text-align:center}.project-missing>span{display:grid;place-items:center;width:50px;height:50px;border-radius:15px;color:var(--warning);background:color-mix(in srgb,var(--warning) 10%,var(--control-bg));font-size:22px}.project-missing h1{margin:5px 0 0}.project-missing p{color:var(--text-muted)}@media(max-width:850px){.project-metrics{grid-template-columns:repeat(2,1fr)}.project-charts{grid-template-columns:1fr}.chart-card--full{grid-column:auto}}@media(max-width:620px){.project-hero{grid-template-columns:1fr;padding:18px}.project-delete{width:max-content}.project-metrics{grid-template-columns:1fr 1fr}.entries-card{padding:15px}.entries-card__header{align-items:flex-start;display:grid}.project-entry-list article{grid-template-columns:50px minmax(0,1fr) auto}.entries-card__footer{grid-template-columns:1fr}.entries-card__footer :deep(.collection-pagination){grid-column:auto}.entries-card__footer>span{text-align:center}}@media(max-width:420px){.project-metrics{grid-template-columns:1fr}}
</style>
