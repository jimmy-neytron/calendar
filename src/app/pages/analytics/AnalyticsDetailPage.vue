<template>
  <section class="detail-page" :style="{ '--section-color': config.color }">
    <header class="detail-hero panel">
      <div class="detail-hero__mesh" aria-hidden="true" />
      <div class="detail-hero__orb" aria-hidden="true" />
      <RouterLink class="back-link" :to="{ name: 'analytics' }"><UiIcon name="left" /> Аналитика</RouterLink>
      <div class="detail-hero__main">
        <span class="detail-icon"><UiIcon :name="config.icon" /></span>
        <div><small>{{ config.eyebrow }}</small><h1>{{ config.title }}</h1><p>{{ config.description }}</p></div>
      </div>
      <RouterLink class="open-section" :to="{ name: config.targetRoute }">Открыть раздел <UiIcon name="right" /></RouterLink>
    </header>

    <section class="metrics">
      <article v-for="(metric, index) in config.metrics" :key="metric.label" :style="{ '--delay': `${index * 65}ms` }">
        <span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.note }}</small>
      </article>
    </section>

    <section class="detail-grid">
      <article class="chart-card chart-card--wide">
        <header><div><small>Динамика</small><h2>{{ config.chartTitle }}</h2></div><span>Последние 7 дней</span></header>
        <AnalyticsBarChart :items="config.chartItems" :color="config.color" />
      </article>

      <article class="chart-card">
        <header><div><small>Структура</small><h2>{{ config.breakdownTitle }}</h2></div></header>
        <AnalyticsDonut :items="config.breakdown" :label="config.donutLabel" />
      </article>

      <article class="chart-card chart-card--wide">
        <header><div><small>Подробности</small><h2>{{ config.listTitle }}</h2></div></header>
        <div class="rank-list">
          <article v-for="(item, index) in config.ranking" :key="`${item.label}-${index}`">
            <span>{{ item.label }}</span>
            <div><i :style="{ width: `${rankPercent(item.value)}%`, '--rank-color': item.color || config.color, '--delay': `${index * 55}ms` }" /></div>
            <strong>{{ item.value }}</strong>
          </article>
          <div v-if="!config.ranking.length" class="empty-state">Здесь появится статистика, когда накопятся данные.</div>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import UiIcon from '../../components/ui/UiIcon.vue'
import AnalyticsBarChart from './components/AnalyticsBarChart.vue'
import AnalyticsDonut from './components/AnalyticsDonut.vue'
import { useAnalyticsData } from './useAnalyticsData.js'

const route = useRoute()
const data = useAnalyticsData()

const configs = computed(() => ({
  calendar: {
    title: 'Календарь', eyebrow: 'Аналитика нагрузки', icon: 'calendar', color: 'var(--info)', targetRoute: 'calendar',
    description: 'Распределение событий, занятое время и ритм недели.',
    metrics: [
      metric('События', data.weekEvents.value.length, 'за 7 дней'),
      metric('Занято', formatMinutes(data.busyMinutes.value), 'по событиям со временем'),
      metric('Активные дни', data.days.value.filter((day) => day.events).length, 'из семи'),
      metric('Категории', data.eventCategories.value.length, 'использовано'),
    ],
    chartTitle: 'События по дням', chartItems: data.days.value.map((day) => ({ label: day.label, value: day.events })),
    breakdownTitle: 'Категории', breakdown: data.eventCategories.value, donutLabel: 'событий',
    listTitle: 'Нагрузка по дням', ranking: data.days.value.map((day) => ({ label: `${day.label}, ${day.dateLabel}`, value: day.events })),
  },
  activity: {
    title: 'Активность', eyebrow: 'Жизнь пространства', icon: 'activity', color: 'var(--cyan)', targetRoute: 'activity',
    description: 'Какие разделы меняются чаще и как распределены действия по дням.',
    metrics: [
      metric('Действия', data.weekActivity.value.length, 'за 7 дней'),
      metric('Сегодня', data.days.value.at(-1)?.activity || 0, 'действий'),
      metric('Направления', data.activityDomains.value.length, 'активных'),
      metric('Всего в журнале', data.workspaceActivity.value.length, 'записей'),
    ],
    chartTitle: 'Действия по дням', chartItems: data.days.value.map((day) => ({ label: day.label, value: day.activity })),
    breakdownTitle: 'По разделам', breakdown: data.activityDomains.value, donutLabel: 'действий',
    listTitle: 'Самые активные направления', ranking: data.activityDomains.value,
  },
  sport: {
    title: 'Спорт', eyebrow: 'Личная статистика', icon: 'sport', color: 'var(--success)', targetRoute: 'sport',
    description: 'Выполнение программы и регулярность тренировочной недели.',
    metrics: [
      metric('Прогресс', `${data.sportProgress.value.percent}%`, 'за неделю'),
      metric('Выполнено', data.sportProgress.value.done, 'упражнений'),
      metric('В программе', data.sportProgress.value.total, 'упражнений'),
      metric('Активные дни', data.sportProgress.value.days.filter((day) => day.done).length, 'из семи'),
    ],
    chartTitle: 'Выполнено по дням', chartItems: data.sportProgress.value.days.map((day, index) => ({ label: weekday(index), value: day.done })),
    breakdownTitle: 'Выполнение', breakdown: [
      { label: 'Выполнено', value: data.sportProgress.value.done, color: 'var(--success)' },
      { label: 'Осталось', value: Math.max(0, data.sportProgress.value.total - data.sportProgress.value.done), color: 'var(--control-bg)' },
    ].filter((item) => item.value),
    donutLabel: 'упражнений', listTitle: 'Прогресс дней',
    ranking: data.sportProgress.value.days.map((day, index) => ({ label: weekday(index), value: day.total ? Math.round(day.done / day.total * 100) : 0 })),
  },
  movies: {
    title: 'Фильмы и сериалы', eyebrow: 'Список просмотра', icon: 'movie', color: 'var(--pink)', targetRoute: 'movies',
    description: 'Состав списка «Хочу посмотреть» и планы, добавленные в календарь.',
    metrics: [
      metric('В списке', data.watchlist.value.length, 'всего'),
      metric('Запланировано', data.plannedMovies.value, 'в календаре'),
      metric('Фильмы', data.watchlist.value.filter((item) => item.mediaType === 'movie').length, 'в списке'),
      metric('Сериалы', data.watchlist.value.filter((item) => item.mediaType === 'tv').length, 'в списке'),
    ],
    chartTitle: 'Добавлено по дням', chartItems: movieTimeline(data.watchlist.value, data.days.value),
    breakdownTitle: 'Тип контента', breakdown: data.movieTypes.value, donutLabel: 'в списке',
    listTitle: 'Недавно добавлено', ranking: data.watchlist.value.slice(0, 7).map((item) => ({ label: item.title, value: Math.round(item.voteAverage * 10) / 10 })),
  },
  ideas: {
    title: 'Идеи', eyebrow: 'Планы и вдохновение', icon: 'sparkles', color: 'var(--warning)', targetRoute: 'ideas',
    description: 'Какие идеи накопились и сколько из них уже превратились в планы.',
    metrics: [
      metric('Всего идей', data.ideas.value.length, 'в пространстве'),
      metric('Запланировано', data.plannedIdeas.value, 'в календаре'),
      metric('Ждут решения', Math.max(0, data.ideas.value.length - data.plannedIdeas.value), 'идей'),
      metric('Типы', data.ideaTypes.value.length, 'направлений'),
    ],
    chartTitle: 'Добавлено по дням', chartItems: ideaTimeline(data.ideas.value, data.days.value),
    breakdownTitle: 'Типы идей', breakdown: data.ideaTypes.value, donutLabel: 'идей',
    listTitle: 'Распределение идей', ranking: data.ideaTypes.value,
  },
  birthdays: {
    title: 'Дни рождения', eyebrow: 'Важные даты', icon: 'heart', color: 'var(--orange)', targetRoute: 'birthdays',
    description: 'Ближайшие даты, сезонность и готовность подарков.',
    metrics: [
      metric('Даты', data.birthdays.value.length, 'всего'),
      metric('Ближайший', data.birthdays.value[0]?.daysUntil ?? '—', 'дней'),
      metric('Идеи подарков', data.totalGifts.value, 'сохранено'),
      metric('Куплено', data.completedGifts.value, 'подарков'),
    ],
    chartTitle: 'Дни рождения по месяцам', chartItems: data.birthdayMonths.value,
    breakdownTitle: 'Подготовка подарков', breakdown: [
      { label: 'Куплено', value: data.completedGifts.value, color: 'var(--success)' },
      { label: 'Осталось', value: Math.max(0, data.totalGifts.value - data.completedGifts.value), color: 'var(--orange)' },
    ].filter((item) => item.value),
    donutLabel: 'подарков', listTitle: 'Ближайшие даты',
    ranking: data.birthdays.value.slice(0, 7).map((item) => ({ label: item.name, value: item.daysUntil })),
  },
}))

const config = computed(() => configs.value[route.meta.analyticsSection] || configs.value.calendar)
const maxRank = computed(() => Math.max(...config.value.ranking.map((item) => Number(item.value) || 0), 1))
const rankPercent = (value) => Number(value) / maxRank.value * 100
const metric = (label, value, note) => ({ label, value, note })
const weekday = (index) => ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][index]
const formatMinutes = (minutes) => minutes >= 60 ? `${Math.round(minutes / 6) / 10} ч` : `${minutes} мин`
const movieTimeline = (items, days) => days.map((day) => ({ label: day.label, value: items.filter((item) => item.addedAt?.slice(0, 10) === day.key).length }))
const ideaTimeline = (items, days) => days.map((day) => ({ label: day.label, value: items.filter((item) => item.createdAt?.slice(0, 10) === day.key).length }))
</script>

<style scoped>
.detail-page {
  display: grid;
  gap: 12px;
  max-width: 1160px;
  margin: 0 auto;
  animation: detailEnter .5s var(--ease-out) both;
}

.detail-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 18px;
  min-height: 220px;
  overflow: hidden;
  padding: 25px 28px;
  background:
    linear-gradient(120deg, rgba(255,255,255,.045), transparent 40%),
    radial-gradient(circle at 88% 30%, color-mix(in srgb, var(--section-color) 18%, transparent), transparent 28%),
    linear-gradient(145deg, var(--bg-card), var(--bg-panel));
  isolation: isolate;
}

.detail-hero__mesh {
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: .3;
  background-image:
    linear-gradient(color-mix(in srgb, var(--section-color) 14%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--section-color) 14%, transparent) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: linear-gradient(90deg, transparent 35%, #000);
  animation: meshMove 16s linear infinite;
}

.detail-hero__orb {
  position: absolute;
  top: -100px;
  right: -55px;
  z-index: -1;
  width: 310px;
  height: 310px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--section-color) 28%, transparent), transparent 68%);
  filter: blur(6px);
  animation: orbFloat 6s ease-in-out infinite;
}

.back-link {
  position: relative;
  z-index: 1;
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 5px;
  width: max-content;
  color: var(--text-muted);
  font-size: 10px;
  text-decoration: none;
  transition: color .2s, transform .2s var(--ease-out);
}

.back-link:hover {
  color: var(--text-primary);
  transform: translateX(-3px);
}

.detail-hero__main {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.detail-icon {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--section-color) 25%, transparent);
  border-radius: 18px;
  color: var(--section-color);
  background: color-mix(in srgb, var(--section-color) 12%, var(--bg-card));
  box-shadow: 0 14px 35px color-mix(in srgb, var(--section-color) 12%, transparent);
  font-size: 27px;
  animation: iconLand .6s .1s var(--ease-out) both;
}

.detail-hero small,
.chart-card header small {
  color: var(--section-color);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: .11em;
  text-transform: uppercase;
}

.detail-hero h1 {
  margin: 4px 0 5px;
  font-size: 34px;
}

.detail-hero p {
  max-width: 600px;
  margin: 0;
  color: var(--text-secondary);
}

.open-section {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid color-mix(in srgb, var(--section-color) 24%, var(--border-color));
  border-radius: var(--radius-pill);
  padding: 9px 13px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--section-color) 8%, var(--control-bg));
  font-size: 10px;
  text-decoration: none;
  transition: transform .25s var(--ease-out), background .25s;
}

.open-section:hover {
  background: color-mix(in srgb, var(--section-color) 15%, var(--control-bg));
  transform: translateY(-2px);
}

.open-section svg {
  transition: transform .25s var(--ease-out);
}

.open-section:hover svg {
  transform: translateX(3px);
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.metrics article {
  position: relative;
  display: grid;
  gap: 3px;
  overflow: hidden;
  min-height: 100px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 16px;
  background: linear-gradient(145deg, var(--bg-card), var(--bg-panel));
  box-shadow: var(--shadow-sm);
  animation: metricEnter .5s calc(.12s + var(--delay)) var(--ease-out) both;
}

.metrics article::after {
  position: absolute;
  right: -32px;
  bottom: -46px;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--section-color) 7%, transparent);
  content: "";
}

.metrics span,
.metrics small {
  color: var(--text-muted);
  font-size: 9px;
}

.metrics strong {
  margin-top: 4px;
  font-size: 28px;
  line-height: 1;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(330px, .75fr);
  gap: 10px;
}

.chart-card {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 19px;
  background:
    linear-gradient(145deg, rgba(255,255,255,.025), transparent 36%),
    var(--bg-card);
  box-shadow: var(--shadow-sm);
  animation: cardEnter .55s .28s var(--ease-out) both;
}

.chart-card::before {
  position: absolute;
  top: 0;
  left: 20px;
  width: 70px;
  height: 2px;
  border-radius: 0 0 2px 2px;
  background: var(--section-color);
  box-shadow: 0 0 16px var(--section-color);
  content: "";
  animation: accentLine .7s .45s var(--ease-out) both;
}

.chart-card--wide:last-child {
  grid-column: 1 / -1;
}

.chart-card > header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
}

.chart-card h2 {
  margin: 4px 0 0;
  font-size: 18px;
}

.chart-card header > span {
  color: var(--text-muted);
  font-size: 9px;
}

.rank-list {
  display: grid;
  gap: 12px;
}

.rank-list article {
  display: grid;
  grid-template-columns: minmax(100px, 180px) minmax(0, 1fr) 35px;
  align-items: center;
  gap: 10px;
}

.rank-list article > span {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-list article > div {
  height: 7px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--control-bg);
}

.rank-list i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--rank-color), color-mix(in srgb, var(--rank-color) 55%, white));
  box-shadow: 0 0 12px color-mix(in srgb, var(--rank-color) 25%, transparent);
  transform-origin: left;
  animation: rankGrow .7s calc(.4s + var(--delay)) var(--ease-out) both;
}

.rank-list strong {
  font-size: 10px;
  text-align: right;
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 140px;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-lg);
  color: var(--text-muted);
  font-size: 10px;
}

@keyframes detailEnter {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: none; }
}

@keyframes metricEnter {
  from { opacity: 0; transform: translateY(18px) scale(.97); filter: blur(4px); }
  to { opacity: 1; transform: none; filter: blur(0); }
}

@keyframes cardEnter {
  from { opacity: 0; transform: translateY(20px) scale(.985); filter: blur(5px); }
  to { opacity: 1; transform: none; filter: blur(0); }
}

@keyframes rankGrow {
  from { transform: scaleX(0); opacity: .3; }
  to { transform: scaleX(1); opacity: 1; }
}

@keyframes iconLand {
  from { opacity: 0; transform: scale(.65) rotate(-14deg); }
  to { opacity: 1; transform: none; }
}

@keyframes orbFloat {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(-25px, 18px, 0) scale(1.08); }
}

@keyframes meshMove {
  to { background-position: 36px 36px; }
}

@keyframes accentLine {
  from { transform: scaleX(0); transform-origin: left; }
  to { transform: scaleX(1); transform-origin: left; }
}

@media (max-width: 850px) {
  .metrics { grid-template-columns: repeat(2, 1fr); }
  .detail-grid { grid-template-columns: 1fr; }
  .chart-card--wide:last-child { grid-column: auto; }
}

@media (max-width: 580px) {
  .detail-hero { grid-template-columns: 1fr; min-height: 0; padding: 20px; }
  .open-section { width: max-content; }
  .detail-icon { width: 48px; height: 48px; }
  .detail-hero h1 { font-size: 26px; }
  .rank-list article { grid-template-columns: 90px minmax(0, 1fr) 30px; }
}

@media (prefers-reduced-motion: reduce) {
  .detail-page,
  .detail-hero__mesh,
  .detail-hero__orb,
  .detail-icon,
  .metrics article,
  .chart-card,
  .chart-card::before,
  .rank-list i {
    animation: none;
  }
}
</style>
