<template>
  <section class="analytics-overview">
    <header class="overview-hero panel">
      <div class="overview-hero__glow" aria-hidden="true" />
      <div class="overview-hero__copy">
        <span class="eyebrow">Аналитика пространства</span>
        <h1>Всё важное — одним взглядом</h1>
        <p>Спокойный обзор недели. Подробные графики и динамика находятся внутри каждого раздела.</p>
        <div class="hero-status">
          <span><i /> Данные обновляются вместе с пространством</span>
          <strong>{{ activeDirections }} активных направлений</strong>
        </div>
      </div>
      <div class="pulse">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="pulse__track" cx="60" cy="60" r="52" />
          <circle
            class="pulse__value"
            cx="60"
            cy="60"
            r="52"
            :style="{ '--pulse-progress': pulseScore }"
          />
        </svg>
        <div><strong>{{ pulseScore }}</strong><span>пульс недели</span></div>
      </div>
    </header>

    <section class="quick-stats">
      <article v-for="(stat, index) in overviewStats" :key="stat.label" :style="{ '--delay': `${index * 55}ms` }">
        <UiIcon :name="stat.icon" />
        <div><strong>{{ stat.value }}</strong><span>{{ stat.label }}</span></div>
      </article>
    </section>

    <section class="section-heading">
      <div><span class="eyebrow">Разделы</span><h2>Посмотреть подробнее</h2></div>
      <p>У каждого направления — своя статистика и понятные графики.</p>
    </section>

    <section class="analytics-sections">
      <RouterLink
        v-for="(section, index) in sections"
        :key="section.route"
        :to="{ name: section.route }"
        class="section-card"
        :style="{ '--section-color': section.color, '--delay': `${140 + index * 55}ms` }"
      >
        <span class="section-card__icon"><UiIcon :name="section.icon" /></span>
        <div class="section-card__copy">
          <small>{{ section.caption }}</small>
          <h3>{{ section.title }}</h3>
          <p>{{ section.description }}</p>
        </div>
        <div class="section-card__metric"><strong>{{ section.value }}</strong><span>{{ section.note }}</span></div>
        <span class="section-card__arrow"><UiIcon name="right" /></span>
      </RouterLink>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import { useActivityLogSettings } from '../../composables/preferences/useActivityLogSettings.js'
import { useAnalyticsData } from './useAnalyticsData.js'

const analytics = useAnalyticsData()
const { isEnabled: activityLogEnabled } = useActivityLogSettings()

const pulseScore = computed(() => Math.min(100, Math.round(
  Math.min(35, analytics.weekEvents.value.length * 5)
  + Math.min(25, analytics.weekActivity.value.length * 2)
  + Math.min(25, analytics.sportProgress.value.percent * .25)
  + Math.min(15, (analytics.plannedMovies.value + analytics.plannedIdeas.value) * 3)
)))

const overviewStats = computed(() => [
  { label: 'событий за неделю', value: analytics.weekEvents.value.length, icon: 'calendar' },
  ...(activityLogEnabled.value
    ? [{ label: 'действий за неделю', value: analytics.weekActivity.value.length, icon: 'activity' }]
    : []),
  { label: 'спортивный прогресс', value: `${analytics.sportProgress.value.percent}%`, icon: 'sport' },
  { label: 'планов в календаре', value: analytics.plannedMovies.value + analytics.plannedIdeas.value, icon: 'check' },
])
const activeDirections = computed(() => overviewStats.value.filter((item) => Number.parseFloat(item.value) > 0).length)

const sections = computed(() => [
  {
    route: 'analytics-calendar', title: 'Календарь', caption: 'Ритм и нагрузка', icon: 'calendar',
    description: 'Дни недели, категории и занятое время.', value: analytics.weekEvents.value.length,
    note: 'за 7 дней', color: 'var(--info)',
  },
  ...(activityLogEnabled.value ? [{
    route: 'analytics-activity', title: 'Активность', caption: 'История пространства', icon: 'activity',
    description: 'Динамика действий и самые активные направления.', value: analytics.weekActivity.value.length,
    note: 'за 7 дней', color: 'var(--cyan)',
  }] : []),
  {
    route: 'analytics-sport', title: 'Спорт', caption: 'Личный прогресс', icon: 'sport',
    description: 'Выполнение программы и ритм тренировок.', value: `${analytics.sportProgress.value.percent}%`,
    note: 'выполнено', color: 'var(--success)',
  },
  {
    route: 'analytics-movies', title: 'Фильмы', caption: 'Хочу посмотреть', icon: 'movie',
    description: 'Фильмы, сериалы и планы на просмотр.', value: analytics.watchlist.value.length,
    note: 'в списке', color: 'var(--pink)',
  },
  {
    route: 'analytics-ideas', title: 'Идеи', caption: 'Планы и вдохновение', icon: 'sparkles',
    description: 'Что накопилось и что уже попало в календарь.', value: analytics.ideas.value.length,
    note: 'идей', color: 'var(--warning)',
  },
  {
    route: 'analytics-birthdays', title: 'Дни рождения', caption: 'Важные даты', icon: 'heart',
    description: 'Ближайшие даты и подготовка подарков.', value: analytics.birthdays.value.length,
    note: 'человек', color: 'var(--orange)',
  },
])
</script>

<style scoped>
.analytics-overview {
  display: grid;
  gap: 16px;
  max-width: 1160px;
  margin: 0 auto;
  animation: pageReveal .55s var(--ease-out) both;
}

.overview-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 154px;
  align-items: center;
  min-height: 250px;
  overflow: hidden;
  padding: 34px 38px;
  background:
    linear-gradient(115deg, rgba(255,255,255,.055), transparent 36%),
    radial-gradient(circle at 82% 40%, rgba(96,165,250,.17), transparent 25%),
    linear-gradient(145deg, var(--bg-card) 0%, var(--bg-panel) 62%, var(--bg-secondary) 100%);
  isolation: isolate;
}

.overview-hero::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: .35;
  background-image:
    linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: linear-gradient(90deg, transparent, #000 55%, #000);
  content: "";
  animation: gridDrift 14s linear infinite;
}

.overview-hero__glow {
  position: absolute;
  top: -110px;
  right: -70px;
  z-index: -1;
  width: 340px;
  height: 340px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(96,165,250,.24), rgba(34,211,238,.07) 45%, transparent 70%);
  filter: blur(5px);
  animation: glowFloat 6s ease-in-out infinite;
}

.overview-hero__copy {
  position: relative;
  z-index: 1;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--info);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.eyebrow::before {
  width: 18px;
  height: 1px;
  background: currentColor;
  content: "";
}

.overview-hero h1 {
  max-width: 700px;
  margin: 10px 0 12px;
  font-size: clamp(34px, 5vw, 58px);
  line-height: .98;
  letter-spacing: -.055em;
}

.overview-hero p {
  max-width: 600px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.hero-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px 18px;
  margin-top: 24px;
  color: var(--text-muted);
  font-size: 9px;
}

.hero-status span {
  display: flex;
  align-items: center;
  gap: 7px;
}

.hero-status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 5px rgba(34,197,94,.08);
  animation: statusPulse 2s ease-in-out infinite;
}

.hero-status strong {
  color: var(--text-secondary);
}

.pulse {
  position: relative;
  display: grid;
  place-items: center;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: rgba(5,5,5,.3);
  box-shadow: 0 24px 70px rgba(0,0,0,.35);
  backdrop-filter: blur(12px);
  animation: pulseEnter .75s .12s var(--ease-out) both;
}

.pulse svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.pulse circle {
  fill: none;
  stroke-width: 7;
}

.pulse__track {
  stroke: rgba(255,255,255,.07);
}

.pulse__value {
  stroke: var(--info);
  stroke-linecap: round;
  stroke-dasharray: 327;
  stroke-dashoffset: calc(327 - (327 * var(--pulse-progress)) / 100);
  filter: drop-shadow(0 0 7px rgba(96,165,250,.55));
  animation: drawPulse 1.1s .2s var(--ease-out) both;
}

.pulse > div {
  display: grid;
  place-items: center;
}

.pulse strong {
  font-size: 42px;
  line-height: 1;
  letter-spacing: -.06em;
}

.pulse span {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 9px;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 9px;
}

.quick-stats article {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
  min-height: 78px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  background: linear-gradient(145deg, var(--bg-card), var(--bg-panel));
  box-shadow: var(--shadow-sm);
  animation: cardReveal .5s var(--delay) var(--ease-out) both;
  transition: border-color .2s var(--ease-out), transform .2s var(--ease-out);
}

.quick-stats article::after {
  position: absolute;
  right: -28px;
  bottom: -45px;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: rgba(255,255,255,.025);
  content: "";
}

.quick-stats article:hover {
  border-color: var(--border-strong);
  transform: translateY(-2px);
}

.quick-stats svg {
  width: 38px;
  height: 38px;
  padding: 10px;
  border-radius: 12px;
  color: var(--text-primary);
  background: var(--control-bg);
}

.quick-stats strong,
.quick-stats span {
  display: block;
}

.quick-stats strong {
  font-size: 24px;
  line-height: 1;
}

.quick-stats span {
  margin-top: 5px;
  color: var(--text-muted);
  font-size: 9px;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 3px 2px;
}

.section-heading h2 {
  margin: 5px 0 0;
  font-size: 24px;
}

.section-heading p {
  margin: 0 0 3px;
  color: var(--text-muted);
  font-size: 11px;
}

.analytics-sections {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.section-card {
  position: relative;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 22px;
  grid-template-rows: auto auto;
  align-items: start;
  gap: 14px 12px;
  overflow: hidden;
  min-height: 190px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 18px;
  color: inherit;
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--section-color) 13%, transparent), transparent 42%),
    linear-gradient(145deg, var(--bg-card), var(--bg-panel));
  box-shadow: var(--shadow-sm);
  text-decoration: none;
  animation: cardReveal .55s var(--delay) var(--ease-out) both;
  transition: transform .3s var(--ease-out), border-color .3s var(--ease-out), box-shadow .3s var(--ease-out);
}

.section-card::before {
  position: absolute;
  inset: auto 18px 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--section-color);
  box-shadow: 0 0 18px var(--section-color);
  content: "";
  transform: scaleX(.18);
  transform-origin: left;
  opacity: .55;
  transition: transform .35s var(--ease-out), opacity .35s;
}

.section-card::after {
  position: absolute;
  top: -55px;
  right: -45px;
  width: 130px;
  height: 130px;
  border: 1px solid color-mix(in srgb, var(--section-color) 18%, transparent);
  border-radius: 50%;
  content: "";
  transition: transform .5s var(--ease-out);
}

.section-card:hover {
  border-color: color-mix(in srgb, var(--section-color) 42%, var(--border-color));
  box-shadow: 0 18px 45px rgba(0,0,0,.24);
  transform: translateY(-5px);
}

.section-card:hover::before {
  opacity: 1;
  transform: scaleX(1);
}

.section-card:hover::after {
  transform: scale(1.18) translate(-5px, 5px);
}

.section-card__icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid color-mix(in srgb, var(--section-color) 18%, transparent);
  border-radius: 14px;
  color: var(--section-color);
  background: color-mix(in srgb, var(--section-color) 11%, var(--bg-card));
  font-size: 21px;
  transition: transform .35s var(--ease-out);
}

.section-card:hover .section-card__icon {
  transform: rotate(-5deg) scale(1.08);
}

.section-card__copy {
  position: relative;
  z-index: 1;
}

.section-card small {
  color: var(--section-color);
  font-size: 8px;
  font-weight: 850;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.section-card h3 {
  margin: 4px 0 6px;
  font-size: 18px;
}

.section-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 10px;
}

.section-card__metric {
  grid-column: 1 / 3;
  align-self: end;
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.section-card__metric strong {
  font-size: 27px;
  line-height: 1;
}

.section-card__metric span {
  color: var(--text-muted);
  font-size: 8px;
}

.section-card__arrow {
  position: relative;
  z-index: 1;
  grid-column: 3;
  grid-row: 1;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: var(--text-muted);
  background: var(--control-bg);
  transition: transform .25s var(--ease-out), color .25s, background .25s;
}

.section-card:hover .section-card__arrow {
  color: var(--text-inverse);
  background: var(--section-color);
  transform: translateX(3px);
}

@keyframes pageReveal {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}

@keyframes cardReveal {
  from { opacity: 0; transform: translateY(22px) scale(.97); filter: blur(4px); }
  to { opacity: 1; transform: none; filter: blur(0); }
}

@keyframes pulseEnter {
  from { opacity: 0; transform: scale(.72); filter: blur(8px); }
  to { opacity: 1; transform: none; filter: blur(0); }
}

@keyframes drawPulse {
  from { stroke-dashoffset: 327; }
}

@keyframes glowFloat {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(-22px, 16px, 0) scale(1.08); }
}

@keyframes gridDrift {
  to { background-position: 34px 34px; }
}

@keyframes statusPulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(34,197,94,.07); }
  50% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
}

@media (max-width: 1000px) {
  .analytics-sections { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 760px) {
  .overview-hero { grid-template-columns: minmax(0, 1fr) 110px; padding: 25px; }
  .pulse { width: 108px; height: 108px; }
  .pulse strong { font-size: 32px; }
  .quick-stats { grid-template-columns: repeat(2, 1fr); }
  .section-heading p { display: none; }
}

@media (max-width: 560px) {
  .overview-hero { grid-template-columns: 1fr; min-height: 0; padding: 22px; }
  .overview-hero h1 { font-size: 36px; }
  .pulse { position: absolute; top: 18px; right: 18px; width: 76px; height: 76px; }
  .pulse strong { font-size: 24px; }
  .pulse span { display: none; }
  .overview-hero__copy { padding-top: 72px; }
  .hero-status strong { display: none; }
  .analytics-sections { grid-template-columns: 1fr; }
  .section-card { min-height: 170px; }
}

@media (prefers-reduced-motion: reduce) {
  .analytics-overview,
  .quick-stats article,
  .section-card,
  .pulse,
  .overview-hero::before,
  .overview-hero__glow,
  .hero-status i,
  .pulse__value {
    animation: none;
  }
}
</style>
