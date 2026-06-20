<template>
  <section class="analytics-page">
    <header class="analytics-page__hero panel">
      <div>
        <span>Аналитика пространства</span>
        <h1>Ритм недели</h1>
        <p>Нагрузка календаря, категории событий и прогресс тренировок за последние семь дней.</p>
      </div>
      <strong>{{ weekEventCount }}</strong>
      <small>событий за неделю</small>
    </header>

    <div class="analytics-page__summary">
      <article><span>Занятые часы</span><strong>{{ busyHours }}</strong><small>по событиям с временем</small></article>
      <article><span>Самый активный день</span><strong>{{ busiestDay.label }}</strong><small>{{ busiestDay.count }} событий</small></article>
      <article><span>Спорт</span><strong>{{ weekProgress.percent }}%</strong><small>{{ weekProgress.done }} из {{ weekProgress.total }}</small></article>
    </div>

    <div class="analytics-page__grid">
      <section class="analytics-card">
        <header><span>Нагрузка</span><h2>События по дням</h2></header>
        <div class="bar-chart">
          <div v-for="day in dailyLoad" :key="day.key">
            <span :style="{ height: `${Math.max(6, day.percent)}%` }" />
            <strong>{{ day.count }}</strong>
            <small>{{ day.label }}</small>
          </div>
        </div>
      </section>

      <section class="analytics-card">
        <header><span>Баланс</span><h2>Категории</h2></header>
        <div class="category-chart">
          <article v-for="category in categoryStats" :key="category.value">
            <i :style="{ background: category.color }" />
            <span>{{ category.label }}</span>
            <div><b :style="{ width: `${category.percent}%`, background: category.color }" /></div>
            <strong>{{ category.count }}</strong>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { calendarStore } from '../../stores/calendar.store.js'
import { sportStore } from '../../stores/sport.store.js'
import { EVENT_FORM_CATEGORIES } from '../../utils/constants/calendarConstants.js'
import { DateHelper } from '../../utils/date/dateHelper.js'

const weekProgress = sportStore.weekProgress
const today = new Date()
const start = DateHelper.addDays(today, -6)
const weekEvents = computed(() => calendarStore.sortedEvents.value.filter((event) => {
  const date = DateHelper.parseKey(event.date)
  return date >= start && date <= DateHelper.addDays(today, 1)
}))
const weekEventCount = computed(() => weekEvents.value.length)
const busyHours = computed(() => Math.round(weekEvents.value.reduce((total, event) => {
  if (event.allDay || !event.startTime || !event.endTime) return total
  const [sh, sm] = event.startTime.split(':').map(Number)
  const [eh, em] = event.endTime.split(':').map(Number)
  return total + Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
}, 0) / 60))
const dailyLoad = computed(() => {
  const days = Array.from({ length: 7 }, (_, index) => DateHelper.addDays(start, index))
  const values = days.map((date) => {
    const key = DateHelper.toKey(date)
    return {
      key,
      label: new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date),
      count: weekEvents.value.filter((event) => event.date === key).length,
    }
  })
  const max = Math.max(...values.map((day) => day.count), 1)
  return values.map((day) => ({ ...day, percent: day.count / max * 100 }))
})
const busiestDay = computed(() => dailyLoad.value.reduce(
  (best, day) => day.count > best.count ? day : best,
  { label: '—', count: 0 }
))
const categoryStats = computed(() => {
  const total = Math.max(weekEvents.value.length, 1)
  return EVENT_FORM_CATEGORIES.map((category) => {
    const count = weekEvents.value.filter((event) => event.category === category.value).length
    return { ...category, count, percent: count / total * 100 }
  }).filter((category) => category.count)
})
</script>

<style scoped>
.analytics-page {
  display: grid;
  gap: 14px;
  padding: 14px;
}

.analytics-page__hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 8px 18px;
  padding: 20px;
}

.analytics-page__hero > div { grid-row: span 2; }
.analytics-page__hero span,
.analytics-card header span,
.analytics-page__summary span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.11em;
}

.analytics-page__hero h1 { margin: 3px 0 6px; }
.analytics-page__hero p { max-width: 620px; margin: 0; color: var(--text-secondary); }
.analytics-page__hero > strong { font-size: 38px; line-height: 1; }
.analytics-page__hero > small { color: var(--text-muted); }

.analytics-page__summary,
.analytics-page__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.analytics-page__summary article,
.analytics-card {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 14px;
  background: var(--card-solid);
  box-shadow: var(--shadow-sm);
}

.analytics-page__summary strong,
.analytics-page__summary small { display: block; }
.analytics-page__summary strong { margin: 5px 0 2px; font-size: 24px; }
.analytics-page__summary small { color: var(--text-muted); }
.analytics-page__grid { grid-template-columns: 1.2fr 0.8fr; }
.analytics-card header h2 { margin: 2px 0 14px; }

.bar-chart {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  align-items: end;
  gap: 8px;
  min-height: 240px;
}

.bar-chart > div {
  display: grid;
  grid-template-rows: 180px auto auto;
  justify-items: center;
  gap: 4px;
}

.bar-chart > div > span {
  align-self: end;
  width: min(38px, 70%);
  border-radius: 8px 8px 3px 3px;
  background: linear-gradient(180deg, var(--info), color-mix(in srgb, var(--info) 40%, transparent));
}

.bar-chart small { color: var(--text-muted); text-transform: capitalize; }
.category-chart { display: grid; gap: 10px; }
.category-chart article {
  display: grid;
  grid-template-columns: 8px minmax(80px, 0.5fr) 1fr 24px;
  align-items: center;
  gap: 8px;
}
.category-chart i { width: 8px; height: 8px; border-radius: 50%; }
.category-chart div { height: 6px; overflow: hidden; border-radius: 99px; background: var(--control-bg); }
.category-chart b { display: block; height: 100%; border-radius: inherit; }

@media (max-width: 840px) {
  .analytics-page__summary,
  .analytics-page__grid { grid-template-columns: 1fr; }
}
</style>
