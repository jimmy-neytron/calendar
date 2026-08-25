<template>
  <section class="detail-page">
    <RouterLink class="back-link" :to="{ name: 'analytics' }">← Аналитика</RouterLink>
    <UiPageHeader :title="config.title" :description="config.description">
      <template #actions><RouterLink class="open-section" :to="{ name: config.targetRoute }">Открыть раздел</RouterLink></template>
    </UiPageHeader>

    <section class="metrics">
      <article v-for="metricItem in config.metrics" :key="metricItem.label">
        <span>{{ metricItem.label }}</span><strong>{{ metricItem.value }}</strong><small>{{ metricItem.note }}</small>
      </article>
    </section>

    <section class="detail-grid">
      <article class="chart-card chart-card--wide">
        <header><div><h2>{{ config.chartTitle }}</h2><p>{{ config.chartDescription }}</p></div><span>За всё время</span></header>
        <AnalyticsBarChart :items="config.chartItems" :color="config.color" :aria-label="config.chartTitle" />
      </article>

      <article class="chart-card">
        <header><div><h2>{{ config.breakdownTitle }}</h2><p>Все сохранённые данные</p></div></header>
        <AnalyticsDonut :items="config.breakdown" :label="config.donutLabel" />
      </article>

      <article class="chart-card chart-card--ranking">
        <header><div><h2>{{ config.listTitle }}</h2><p>Сравнение за весь период</p></div></header>
        <AnalyticsBarChart v-if="config.ranking.length" :items="config.ranking" :color="config.color" horizontal compact :aria-label="config.listTitle" />
        <p v-else class="empty-state">Данных пока нет.</p>
      </article>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import UiPageHeader from '../../components/ui/UiPageHeader.vue'
import AnalyticsBarChart from './components/AnalyticsBarChart.vue'
import AnalyticsDonut from './components/AnalyticsDonut.vue'
import { useAnalyticsData } from './useAnalyticsData.js'

const route = useRoute()
const data = useAnalyticsData()
const configs = computed(() => ({
  calendar: {
    title: 'Календарь', color: 'var(--info)', targetRoute: 'calendar', description: 'Статистика всех сохранённых событий.',
    metrics: [
      metric('События', data.events.value.length, 'за всё время'),
      metric('Занято', formatMinutes(data.busyMinutes.value), 'по событиям со временем'),
      metric('Активные дни', data.eventActiveDays.value, 'дней с событиями'),
      metric('Категории', data.eventCategories.value.length, 'использовано'),
    ],
    chartTitle: 'События по месяцам', chartDescription: 'Количество событий в каждом месяце', chartItems: data.eventTimeline.value,
    breakdownTitle: 'Категории', breakdown: data.eventCategories.value, donutLabel: 'событий',
    listTitle: 'Самые загруженные месяцы', ranking: ranked(data.eventTimeline.value),
  },
  activity: {
    title: 'Активность', color: 'var(--cyan)', targetRoute: 'activity', description: 'Полная история изменений пространства.',
    metrics: [
      metric('Действия', data.workspaceActivity.value.length, 'за всё время'),
      metric('Активные дни', data.activityActiveDays.value, 'дней с изменениями'),
      metric('Разделы', data.activityDomains.value.length, 'с активностью'),
      metric('Среднее', average(data.workspaceActivity.value.length, data.activityActiveDays.value), 'действия в активный день'),
    ],
    chartTitle: 'Действия по месяцам', chartDescription: 'Все записи журнала активности', chartItems: data.activityTimeline.value,
    breakdownTitle: 'По разделам', breakdown: data.activityDomains.value, donutLabel: 'действий',
    listTitle: 'Самые активные разделы', ranking: data.activityDomains.value,
  },
  sport: {
    title: 'Спорт', color: 'var(--success)', targetRoute: 'sport', description: 'Выполненные упражнения за весь период.',
    metrics: [
      metric('Выполнено', data.sportHistory.value.totalCompletions, 'упражнений'),
      metric('Активные дни', data.sportHistory.value.activeDays, 'дней с тренировками'),
      metric('Среднее', average(data.sportHistory.value.totalCompletions, data.sportHistory.value.activeDays), 'за активный день'),
      metric('Лучшая серия', data.sportHistory.value.longestStreak, 'дней подряд'),
    ],
    chartTitle: 'Упражнения по месяцам', chartDescription: 'История всех отметок выполнения', chartItems: data.sportTimeline.value,
    breakdownTitle: 'Группы мышц', breakdown: data.sportHistory.value.muscleActivity.filter((item) => item.value), donutLabel: 'упражнений',
    listTitle: 'По дням недели', ranking: data.sportHistory.value.weekdayActivity,
  },
  movies: {
    title: 'Фильмы и сериалы', color: 'var(--pink)', targetRoute: 'movies', description: 'Весь список просмотра и история его наполнения.',
    metrics: [
      metric('В списке', data.watchlist.value.length, 'всего'),
      metric('Запланировано', data.plannedMovies.value, 'в календаре'),
      metric('Фильмы', data.watchlist.value.filter((item) => item.mediaType === 'movie').length, 'в списке'),
      metric('Сериалы', data.watchlist.value.filter((item) => item.mediaType === 'tv').length, 'в списке'),
    ],
    chartTitle: 'Добавлено по месяцам', chartDescription: 'История пополнения списка', chartItems: data.movieTimeline.value,
    breakdownTitle: 'Тип контента', breakdown: data.movieTypes.value, donutLabel: 'в списке',
    listTitle: 'Высокие оценки', ranking: data.watchlist.value.filter((item) => item.voteAverage).sort((a, b) => b.voteAverage - a.voteAverage).slice(0, 10).map((item) => ({ label: item.title, value: Math.round(item.voteAverage * 10) / 10 })),
  },
  ideas: {
    title: 'Идеи', color: 'var(--warning)', targetRoute: 'ideas', description: 'Все сохранённые и запланированные идеи.',
    metrics: [
      metric('Всего идей', data.ideas.value.length, 'за всё время'),
      metric('Запланировано', data.plannedIdeas.value, 'в календаре'),
      metric('Не запланировано', Math.max(0, data.ideas.value.length - data.plannedIdeas.value), 'идей'),
      metric('Типы', data.ideaTypes.value.length, 'использовано'),
    ],
    chartTitle: 'Добавлено по месяцам', chartDescription: 'История создания идей', chartItems: data.ideaTimeline.value,
    breakdownTitle: 'Типы идей', breakdown: data.ideaTypes.value, donutLabel: 'идей',
    listTitle: 'Распределение идей', ranking: data.ideaTypes.value,
  },
  birthdays: {
    title: 'Дни рождения', color: 'var(--orange)', targetRoute: 'birthdays', description: 'Все даты и состояние подготовки подарков.',
    metrics: [
      metric('Даты', data.birthdays.value.length, 'всего'),
      metric('Ближайший', data.birthdays.value[0]?.daysUntil ?? '—', 'дней'),
      metric('Идеи подарков', data.totalGifts.value, 'сохранено'),
      metric('Куплено', data.completedGifts.value, 'подарков'),
    ],
    chartTitle: 'Дни рождения по месяцам', chartDescription: 'Сезонное распределение всех дат', chartItems: data.birthdayMonths.value,
    breakdownTitle: 'Подготовка подарков', breakdown: [
      { label: 'Куплено', value: data.completedGifts.value, color: 'var(--success)' },
      { label: 'Осталось', value: Math.max(0, data.totalGifts.value - data.completedGifts.value), color: 'var(--orange)' },
    ].filter((item) => item.value), donutLabel: 'подарков',
    listTitle: 'Ближайшие даты', ranking: data.birthdays.value.slice(0, 10).map((item) => ({ label: item.name, value: item.daysUntil })),
  },
}))
const config = computed(() => configs.value[route.meta.analyticsSection] || configs.value.calendar)
const metric = (label, value, note) => ({ label, value, note })
const average = (total, days) => days ? (total / days).toFixed(1).replace('.', ',') : '0'
const ranked = (items) => [...items].filter((item) => item.value).sort((a, b) => b.value - a.value).slice(0, 12)
const formatMinutes = (minutes) => minutes >= 60 ? `${Math.round(minutes / 6) / 10} ч` : `${minutes} мин`
</script>

<style scoped>
.detail-page { display: grid; gap: 12px; max-width: 1160px; margin: 0 auto; }
.back-link { width: max-content; color: var(--text-muted); font-size: 10px; text-decoration: none; }
.open-section { border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 11px; color: var(--text-primary); background: var(--control-bg); font-size: 10px; text-decoration: none; }
.metrics { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--border-color); border-radius: 10px; background: var(--card-solid); }
.metrics article { min-width: 0; display: grid; gap: 4px; padding: 15px 16px; }.metrics article + article { border-left: 1px solid var(--border-color); }
.metrics span, .metrics small { color: var(--text-muted); font-size: 10px; }.metrics strong { font-size: 24px; line-height: 1.1; }
.detail-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(300px, .65fr); gap: 10px; }
.chart-card { min-width: 0; display: grid; align-content: start; gap: 14px; border: 1px solid var(--border-color); border-radius: 10px; padding: 16px; background: var(--card-solid); }
.chart-card--ranking { grid-column: 1 / -1; }
.chart-card > header { display: flex; justify-content: space-between; gap: 12px; }.chart-card h2, .chart-card p { margin: 0; }.chart-card h2 { font-size: 15px; }
.chart-card header p, .chart-card header > span { margin-top: 3px; color: var(--text-muted); font-size: 10px; }.chart-card header > span { white-space: nowrap; }
.empty-state { min-height: 180px; display: grid; place-items: center; color: var(--text-muted); font-size: 11px; }
@media (max-width: 850px) { .metrics { grid-template-columns: 1fr 1fr; }.metrics article:nth-child(3) { border-left: 0; }.metrics article:nth-child(n + 3) { border-top: 1px solid var(--border-color); }.detail-grid { grid-template-columns: 1fr; }.chart-card--ranking { grid-column: auto; } }
@media (max-width: 480px) { .metrics { grid-template-columns: 1fr; }.metrics article + article { border-top: 1px solid var(--border-color); border-left: 0; }.chart-card > header { flex-direction: column; } }
</style>
