<template>
  <section class="analytics-overview">
    <UiPageHeader title="Аналитика" description="Статистика за весь период существования данных аккаунта.">
      <template #actions><span class="analytics-period">{{ periodLabel }}</span></template>
    </UiPageHeader>

    <section class="analytics-summary" aria-label="Основные показатели">
      <article v-for="stat in overviewStats" :key="stat.label">
        <span>{{ stat.label }}</span><strong>{{ stat.value }}</strong><small>{{ stat.note }}</small>
      </article>
    </section>

    <section v-if="activityLogEnabled" class="analytics-chart">
      <header><div><h2>Изменения по месяцам</h2><p>Все записи журнала активности аккаунта</p></div><span>За всё время</span></header>
      <AnalyticsBarChart :items="analytics.activityTimeline.value" color="var(--info)" aria-label="Активность аккаунта по месяцам" />
    </section>

    <section class="analytics-sections">
      <header><h2>Разделы</h2><p>Подробная статистика и графики за весь период.</p></header>
      <div>
        <RouterLink v-for="section in sections" :key="section.route" :to="{ name: section.route }" class="section-row">
          <span class="section-row__icon" :style="{ color: section.color }"><UiIcon :name="section.icon" /></span>
          <div><strong>{{ section.title }}</strong><small>{{ section.description }}</small></div>
          <span class="section-row__value"><strong>{{ section.value }}</strong><small>{{ section.note }}</small></span>
          <UiIcon name="right" />
        </RouterLink>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import UiPageHeader from '../../components/ui/UiPageHeader.vue'
import { useActivityLogSettings } from '../../composables/preferences/useActivityLogSettings.js'
import { useExtraSectionsSettings } from '../../composables/preferences/useExtraSectionsSettings.js'
import AnalyticsBarChart from './components/AnalyticsBarChart.vue'
import { useAnalyticsData } from './useAnalyticsData.js'

const analytics = useAnalyticsData()
const { isEnabled: activityLogEnabled } = useActivityLogSettings()
const { isEnabled: extraSectionsEnabled } = useExtraSectionsSettings()
const periodLabel = computed(() => analytics.firstDataDate.value ? `С ${formatDate(analytics.firstDataDate.value)}` : 'Данных пока нет')
const overviewStats = computed(() => [
  { label: 'События', value: analytics.events.value.length, note: 'за всё время' },
  ...(activityLogEnabled.value ? [{ label: 'Действия', value: analytics.workspaceActivity.value.length, note: 'в журнале' }] : []),
  ...(extraSectionsEnabled.value ? [{ label: 'Упражнения', value: analytics.sportHistory.value.totalCompletions, note: 'выполнено' }] : []),
  { label: 'Идеи', value: analytics.ideas.value.length, note: 'сохранено' },
])
const sections = computed(() => [
  { route: 'analytics-calendar', title: 'Календарь', icon: 'calendar', description: 'События, категории и занятое время', value: analytics.events.value.length, note: 'событий', color: 'var(--info)' },
  ...(activityLogEnabled.value ? [{ route: 'analytics-activity', title: 'Активность', icon: 'activity', description: 'История изменений по разделам', value: analytics.workspaceActivity.value.length, note: 'действий', color: 'var(--cyan)' }] : []),
  ...(extraSectionsEnabled.value ? [
    { route: 'analytics-sport', title: 'Спорт', icon: 'sport', description: 'Выполненные упражнения и регулярность', value: analytics.sportHistory.value.totalCompletions, note: 'выполнено', color: 'var(--success)' },
    { route: 'analytics-movies', title: 'Фильмы', icon: 'movie', description: 'Список и планы на просмотр', value: analytics.watchlist.value.length, note: 'в списке', color: 'var(--pink)' },
  ] : []),
  { route: 'analytics-ideas', title: 'Идеи', icon: 'sparkles', description: 'Сохранённые и запланированные идеи', value: analytics.ideas.value.length, note: 'идей', color: 'var(--warning)' },
  { route: 'analytics-birthdays', title: 'Дни рождения', icon: 'heart', description: 'Даты и подготовка подарков', value: analytics.birthdays.value.length, note: 'человек', color: 'var(--orange)' },
])
function formatDate(value) {
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}
</script>

<style scoped>
.analytics-overview { display: grid; gap: 12px; max-width: 1160px; margin: 0 auto; }
.analytics-period { color: var(--text-muted); font-size: 11px; }
.analytics-summary { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--border-color); border-radius: 10px; background: var(--card-solid); }
.analytics-summary article { min-width: 0; display: grid; gap: 4px; padding: 15px 16px; }
.analytics-summary article + article { border-left: 1px solid var(--border-color); }
.analytics-summary span, .analytics-summary small { color: var(--text-muted); font-size: 10px; }
.analytics-summary strong { font-size: 24px; line-height: 1.1; }
.analytics-chart, .analytics-sections { display: grid; gap: 16px; border: 1px solid var(--border-color); border-radius: 10px; padding: 16px; background: var(--card-solid); }
.analytics-chart > header, .analytics-sections > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.analytics-chart h2, .analytics-chart p, .analytics-sections h2, .analytics-sections p { margin: 0; }
.analytics-chart h2, .analytics-sections h2 { font-size: 15px; }
.analytics-chart p, .analytics-sections p, .analytics-chart header > span { margin-top: 3px; color: var(--text-muted); font-size: 10px; }
.analytics-sections > div { display: grid; }
.section-row { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto 18px; align-items: center; gap: 11px; border-top: 1px solid var(--border-color); padding: 11px 2px; color: inherit; text-decoration: none; }
.section-row__icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 8px; background: var(--control-bg); }
.section-row > div, .section-row__value { min-width: 0; display: grid; gap: 3px; }
.section-row > div small, .section-row__value small { overflow: hidden; color: var(--text-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.section-row__value { justify-items: end; }
.section-row__value strong { font-size: 15px; }
.section-row > svg { color: var(--text-muted); }
@media (max-width: 760px) { .analytics-summary { grid-template-columns: 1fr 1fr; }.analytics-summary article:nth-child(3) { border-left: 0; }.analytics-summary article:nth-child(n + 3) { border-top: 1px solid var(--border-color); } }
@media (max-width: 520px) { .section-row { grid-template-columns: 34px 1fr 16px; }.section-row__value { grid-column: 2; grid-row: 2; justify-items: start; }.section-row > svg { grid-column: 3; grid-row: 1 / 3; }.analytics-chart > header, .analytics-sections > header { flex-direction: column; } }
</style>
