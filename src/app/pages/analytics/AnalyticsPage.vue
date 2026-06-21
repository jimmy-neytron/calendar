<template>
  <section class="analytics-page">
    <header class="analytics-hero panel">
      <div>
        <span>Аналитика пространства</span>
        <h1>Ритм последних 7 дней</h1>
        <p>Сколько времени занято, как распределены события и в какие дни календарь был насыщеннее.</p>
      </div>
      <div class="analytics-hero__score">
        <strong>{{ weekEventCount }}</strong>
        <small>{{ pluralize(weekEventCount, ['событие', 'события', 'событий']) }}</small>
      </div>
    </header>

    <section v-if="!hasData" class="analytics-empty panel">
      <span>▥</span>
      <div>
        <small>Пока тихо</small>
        <h2>Аналитика появится после первых событий</h2>
        <p>Добавь несколько событий с датой, временем и категорией — здесь появятся графики нагрузки и удобная таблица.</p>
      </div>
      <RouterLink :to="{ name: 'calendar' }">Открыть календарь →</RouterLink>
    </section>

    <template v-else>
      <div class="analytics-kpis">
        <article>
          <span class="analytics-kpis__icon">◷</span>
          <div><small>Занято времени</small><strong>{{ busyHours }} ч</strong><p>{{ timedEventCount }} событий с временем</p></div>
        </article>
        <article>
          <span class="analytics-kpis__icon">↑</span>
          <div><small>Самый активный день</small><strong>{{ busiestDay.fullLabel }}</strong><p>{{ busiestDay.count }} событий</p></div>
        </article>
        <article>
          <span class="analytics-kpis__icon">◒</span>
          <div><small>Спортивный прогресс</small><strong>{{ weekProgress.percent }}%</strong><p>{{ weekProgress.done }} из {{ weekProgress.total }} выполнено</p></div>
        </article>
        <article>
          <span class="analytics-kpis__icon">◎</span>
          <div><small>Средняя нагрузка</small><strong>{{ averagePerDay }}</strong><p>событий в день</p></div>
        </article>
      </div>

      <div class="analytics-grid">
        <section class="analytics-card analytics-card--load">
          <header>
            <div><small>Нагрузка</small><h2>События по дням</h2></div>
            <span>{{ dateRangeLabel }}</span>
          </header>
          <div class="bar-chart">
            <div v-for="day in dailyLoad" :key="day.key" :class="{ active: day.count === busiestDay.count }">
              <div class="bar-chart__track">
                <span :style="{ height: `${Math.max(4, day.percent)}%` }"><b>{{ day.count }}</b></span>
              </div>
              <strong>{{ day.label }}</strong>
              <small>{{ day.dateLabel }}</small>
            </div>
          </div>
        </section>

        <section class="analytics-card">
          <header><div><small>Баланс</small><h2>Категории</h2></div></header>
          <div class="donut-wrap">
            <div class="donut" :style="{ '--donut': donutGradient }">
              <div><strong>{{ categoryStats.length }}</strong><small>категорий</small></div>
            </div>
            <div class="category-list">
              <article v-for="category in categoryStats" :key="category.value">
                <i :style="{ background: category.color }" />
                <span>{{ category.label }}</span>
                <strong>{{ category.count }}</strong>
                <small>{{ Math.round(category.percent) }}%</small>
              </article>
            </div>
          </div>
        </section>
      </div>

      <section class="analytics-card analytics-table-card">
        <header>
          <div><small>Детали</small><h2>События недели</h2></div>
          <span>{{ weekEventCount }} записей</span>
        </header>
        <div class="analytics-table">
          <div class="analytics-table__head">
            <span>Событие</span><span>Дата</span><span>Время</span><span>Категория</span><span>Длительность</span>
          </div>
          <article v-for="event in tableEvents" :key="event.id">
            <strong>{{ event.title }}</strong>
            <span>{{ formatDate(event.date) }}</span>
            <span>{{ event.allDay ? 'Весь день' : event.startTime || '—' }}</span>
            <span class="category-cell"><i :style="{ background: categoryMeta(event.category).color }" />{{ categoryMeta(event.category).label }}</span>
            <span>{{ eventDuration(event) }}</span>
          </article>
        </div>
      </section>
    </template>
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
const end = DateHelper.addDays(today, 1)
const weekEvents = computed(() => calendarStore.sortedEvents.value.filter((event) => {
  const date = DateHelper.parseKey(event.date)
  return date >= start && date < end
}))
const hasData = computed(() => weekEvents.value.length > 0)
const weekEventCount = computed(() => weekEvents.value.length)
const timedEventCount = computed(() => weekEvents.value.filter((event) => !event.allDay && event.startTime && event.endTime).length)
const busyHours = computed(() => Math.round(totalMinutes.value / 6) / 10)
const averagePerDay = computed(() => (weekEventCount.value / 7).toFixed(1))
const totalMinutes = computed(() => weekEvents.value.reduce((total, event) => total + durationMinutes(event), 0))
const dateRangeLabel = computed(() => `${formatShortDate(start)} — ${formatShortDate(today)}`)
const tableEvents = computed(() => [...weekEvents.value].sort((a, b) => b.date.localeCompare(a.date) || (b.startTime || '').localeCompare(a.startTime || '')))

const dailyLoad = computed(() => {
  const values = Array.from({ length: 7 }, (_, index) => {
    const date = DateHelper.addDays(start, index)
    const key = DateHelper.toKey(date)
    return {
      key,
      label: new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date).replace('.', ''),
      fullLabel: new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(date),
      dateLabel: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date),
      count: weekEvents.value.filter((event) => event.date === key).length,
    }
  })
  const max = Math.max(...values.map((day) => day.count), 1)
  return values.map((day) => ({ ...day, percent: day.count / max * 100 }))
})

const busiestDay = computed(() => dailyLoad.value.reduce(
  (best, day) => day.count > best.count ? day : best,
  { fullLabel: '—', count: 0 }
))

const categoryStats = computed(() => {
  const total = Math.max(weekEventCount.value, 1)
  return EVENT_FORM_CATEGORIES.map((category) => {
    const count = weekEvents.value.filter((event) => event.category === category.value).length
    return { ...category, count, percent: count / total * 100 }
  }).filter((category) => category.count)
})

const donutGradient = computed(() => {
  let offset = 0
  const stops = categoryStats.value.map((category) => {
    const startOffset = offset
    offset += category.percent
    return `${category.color} ${startOffset}% ${offset}%`
  })
  return `conic-gradient(${stops.join(', ')})`
})

function categoryMeta(value) {
  return EVENT_FORM_CATEGORIES.find((category) => category.value === value)
    || { label: 'Другое', color: 'var(--text-muted)' }
}

function durationMinutes(event) {
  if (event.allDay || !event.startTime || !event.endTime) return 0
  const [sh, sm] = event.startTime.split(':').map(Number)
  const [eh, em] = event.endTime.split(':').map(Number)
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
}

function eventDuration(event) {
  const minutes = durationMinutes(event)
  if (!minutes) return event.allDay ? 'Весь день' : '—'
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`
}

const formatDate = (key) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' }).format(DateHelper.parseKey(key))
const formatShortDate = (date) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date)
function pluralize(value, words) {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return words[2]
  if (last === 1) return words[0]
  if (last >= 2 && last <= 4) return words[1]
  return words[2]
}
</script>

<style scoped>
.analytics-page{display:grid;gap:14px;max-width:1280px;margin:0 auto;padding:14px}.analytics-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;padding:22px}.analytics-hero span,.analytics-card header small,.analytics-empty small,.analytics-kpis small{color:var(--text-muted);font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}.analytics-hero h1{margin:3px 0 7px}.analytics-hero p{max-width:670px;margin:0;color:var(--text-secondary)}.analytics-hero__score{display:grid;justify-items:end}.analytics-hero__score strong{font-size:46px;line-height:1}.analytics-hero__score small{color:var(--text-muted)}
.analytics-empty{display:grid;grid-template-columns:64px minmax(0,1fr) auto;align-items:center;gap:18px;min-height:230px;padding:28px}.analytics-empty>span{display:grid;place-items:center;width:60px;height:60px;border:1px solid var(--border-color);border-radius:18px;color:var(--info);background:var(--card-soft);font-size:25px}.analytics-empty h2{margin:4px 0 6px;font-size:22px}.analytics-empty p{max-width:630px;margin:0;color:var(--text-secondary)}.analytics-empty a{border:1px solid var(--accent-border);border-radius:var(--radius-pill);padding:9px 14px;color:var(--text-primary);background:var(--accent-soft);text-decoration:none;font-weight:700}
.analytics-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.analytics-kpis article{display:flex;align-items:center;gap:11px;border:1px solid var(--border-color);border-radius:var(--radius-xl);padding:14px;background:var(--card-solid)}.analytics-kpis__icon{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;color:var(--info);background:color-mix(in srgb,var(--info) 10%,var(--control-bg))}.analytics-kpis strong,.analytics-kpis p{display:block;margin:0}.analytics-kpis strong{margin:2px 0;font-size:21px}.analytics-kpis p{color:var(--text-muted);font-size:10px}
.analytics-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:10px}.analytics-card{border:1px solid var(--border-color);border-radius:var(--radius-xl);padding:16px;background:var(--card-solid);box-shadow:var(--shadow-sm)}.analytics-card>header{display:flex;justify-content:space-between;align-items:start;gap:12px}.analytics-card header h2{margin:2px 0 16px}.analytics-card>header>span{color:var(--text-muted);font-size:10px}
.bar-chart{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;min-height:250px}.bar-chart>div{display:grid;grid-template-rows:190px auto auto;justify-items:center;gap:3px}.bar-chart__track{position:relative;width:100%;height:190px;border-bottom:1px solid var(--border-color);background:linear-gradient(to top,var(--border-color) 1px,transparent 1px);background-size:100% 25%}.bar-chart__track>span{position:absolute;left:18%;right:18%;bottom:0;min-height:7px;border-radius:9px 9px 3px 3px;background:linear-gradient(180deg,var(--info),color-mix(in srgb,var(--info) 40%,transparent));transition:height .4s var(--ease-out)}.bar-chart__track b{position:absolute;top:-20px;left:50%;color:var(--text-secondary);font-size:10px;transform:translateX(-50%)}.bar-chart>div.active .bar-chart__track>span{background:linear-gradient(180deg,var(--pink),color-mix(in srgb,var(--pink) 35%,transparent))}.bar-chart>div>strong{text-transform:capitalize}.bar-chart>div>small{color:var(--text-muted);font-size:9px}
.donut-wrap{display:grid;place-items:center;gap:20px}.donut{display:grid;place-items:center;width:154px;height:154px;border-radius:50%;background:var(--donut);box-shadow:inset 0 0 0 1px var(--border-color)}.donut>div{display:grid;place-items:center;width:98px;height:98px;border-radius:50%;background:var(--card-solid)}.donut strong{font-size:26px}.donut small{color:var(--text-muted)}.category-list{display:grid;width:100%;gap:8px}.category-list article{display:grid;grid-template-columns:8px minmax(0,1fr) 24px 34px;align-items:center;gap:8px;border-bottom:1px solid var(--border-color);padding-bottom:7px}.category-list i,.category-cell i{width:8px;height:8px;border-radius:50%}.category-list small{color:var(--text-muted);text-align:right}
.analytics-table-card{overflow:hidden}.analytics-table{overflow-x:auto}.analytics-table__head,.analytics-table article{display:grid;grid-template-columns:minmax(220px,1.5fr) 140px 90px 130px 110px;align-items:center;gap:10px;min-width:750px;padding:10px 8px}.analytics-table__head{border-bottom:1px solid var(--border-strong);color:var(--text-muted);font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.analytics-table article{border-bottom:1px solid var(--border-color);color:var(--text-secondary)}.analytics-table article:last-child{border-bottom:0}.analytics-table article strong{color:var(--text-primary)}.category-cell{display:flex;align-items:center;gap:7px}
@media(max-width:1050px){.analytics-kpis{grid-template-columns:repeat(2,1fr)}.analytics-grid{grid-template-columns:1fr}}@media(max-width:650px){.analytics-page{padding:10px}.analytics-hero,.analytics-empty{grid-template-columns:1fr;padding:16px}.analytics-hero__score{justify-items:start}.analytics-kpis{grid-template-columns:1fr}.bar-chart{gap:4px}.bar-chart__track>span{left:12%;right:12%}.analytics-empty a{justify-self:start}}
</style>
