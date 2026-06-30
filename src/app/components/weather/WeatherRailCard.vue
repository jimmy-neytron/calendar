<template>
  <section class="weather-rail-card" :class="{ 'weather-rail-card--loading': isLoading }">
    <header>
      <div>
        <span>Погода</span>
        <strong>{{ title }}</strong>
      </div>
      <WeatherGlyph :icon="displayIcon" :tone="displayTone" />
    </header>

    <div v-if="selectedDay" class="weather-rail-card__body">
      <div class="weather-rail-card__temp">
        <strong>{{ selectedDay.maxTemperature }}°</strong>
        <span>{{ selectedDay.minTemperature }}° ночью</span>
      </div>
      <dl>
        <div>
          <dt>Ощущается</dt>
          <dd>{{ apparentTemperatureLabel }}</dd>
        </div>
        <div>
          <dt>Осадки</dt>
          <dd>{{ selectedDay.precipitationProbability }}%</dd>
        </div>
        <div>
          <dt>Ветер</dt>
          <dd>{{ windLabel }}</dd>
        </div>
      </dl>
    </div>

    <div v-else class="weather-rail-card__empty" :class="{ 'weather-rail-card__empty--error': hasError }">
      <div class="weather-rail-card__empty-visual">
        <span />
        <i />
      </div>
      <div>
        <strong>{{ emptyTitle }}</strong>
        <small>{{ emptyText }}</small>
      </div>
    </div>

    <div v-if="hourlyPreview.length" class="weather-rail-card__hours" aria-label="Погода по часам">
      <article v-for="point in hourlyPreview" :key="point.time">
        <time>{{ formatHour(point.time) }}</time>
        <WeatherGlyph :icon="point.icon" :tone="point.tone" />
        <strong>{{ point.temperature }}°</strong>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WeatherDay, WeatherPoint } from '../../services/weatherService'
import WeatherGlyph from './WeatherGlyph.vue'

const props = withDefaults(defineProps<{
  selectedDay?: WeatherDay | null
  current?: WeatherPoint | null
  hourly?: WeatherPoint[]
  locationLabel?: string
  isLoading?: boolean
  hasError?: boolean
}>(), {
  selectedDay: null,
  current: null,
  hourly: () => [],
  locationLabel: '',
  isLoading: false,
  hasError: false,
})

const title = computed(() => {
  if (props.selectedDay) return `${props.selectedDay.condition} · ${props.locationLabel || 'Open-Meteo'}`
  if (props.isLoading) return 'Обновляем прогноз'
  return 'Прогноз недоступен'
})
const emptyTitle = computed(() => (props.hasError ? 'Не удалось загрузить' : 'Нет прогноза на эту дату'))
const emptyText = computed(() => (props.hasError ? 'Покажем погоду после следующей попытки.' : 'Open-Meteo дает прогноз на ближайшие дни.'))
const displayIcon = computed(() => props.selectedDay?.icon || props.current?.icon || 'cloud')
const displayTone = computed(() => props.selectedDay?.tone || props.current?.tone || 'cloudy')
const dayReferencePoint = computed(() => props.hourly.find((point) => point.time.slice(11, 13) === '12') || props.hourly[0] || null)
const apparentTemperatureLabel = computed(() => (
  dayReferencePoint.value ? `${dayReferencePoint.value.apparentTemperature}° днем` : `${props.selectedDay?.condition || ''}`
))
const windLabel = computed(() => (dayReferencePoint.value ? `${dayReferencePoint.value.windSpeed} км/ч` : 'по прогнозу'))
const hourlyPreview = computed(() => props.hourly.filter((point) => [9, 12, 15, 18].includes(Number(point.time.slice(11, 13)))).slice(0, 4))

function formatHour(time: string): string {
  return time.slice(11, 16)
}
</script>

<style scoped>
.weather-rail-card {
  display: grid;
  gap: 10px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--cyan) 24%, var(--border-color));
  border-radius: 14px;
  padding: 11px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--cyan) 9%, transparent), transparent 58%),
    var(--card-soft);
}

.weather-rail-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.weather-rail-card header div {
  min-width: 0;
}

.weather-rail-card header span,
.weather-rail-card dt,
.weather-rail-card__empty small {
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.weather-rail-card header strong {
  display: block;
  overflow: hidden;
  margin-top: 2px;
  color: var(--text-primary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weather-rail-card__body {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 10px;
  align-items: end;
}

.weather-rail-card__temp {
  display: grid;
  gap: 1px;
}

.weather-rail-card__temp strong {
  font-size: 31px;
  line-height: .95;
}

.weather-rail-card__temp span {
  color: var(--text-muted);
  font-size: 10px;
}

.weather-rail-card dl {
  display: grid;
  gap: 5px;
  margin: 0;
  min-width: 0;
}

.weather-rail-card dl div {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);
  padding-bottom: 4px;
}

.weather-rail-card dl div:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.weather-rail-card dd {
  margin: 0;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 750;
  text-align: right;
}

.weather-rail-card__hours {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 5px;
}

.weather-rail-card__hours article {
  display: grid;
  justify-items: center;
  gap: 4px;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 6px 4px;
  background: color-mix(in srgb, var(--control-bg) 78%, transparent);
}

.weather-rail-card__hours :deep(.weather-glyph) {
  width: 24px;
  height: 24px;
  border-radius: 9px;
  transform: scale(.82);
}

.weather-rail-card__hours time,
.weather-rail-card__hours strong {
  font-size: 9px;
}

.weather-rail-card__hours time {
  color: var(--text-muted);
}

.weather-rail-card__empty {
  position: relative;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 10px;
  min-height: 76px;
  align-items: center;
  overflow: hidden;
  border: 1px dashed color-mix(in srgb, var(--cyan) 24%, var(--border-color));
  border-radius: 12px;
  padding: 10px;
  background: color-mix(in srgb, var(--cyan) 5%, var(--control-bg));
}

.weather-rail-card__empty::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 0%, color-mix(in srgb, var(--text-primary) 7%, transparent) 45%, transparent 78%);
  content: "";
  transform: translateX(-120%);
  animation: weatherEmptyShimmer 2.8s ease-in-out infinite;
  pointer-events: none;
}

.weather-rail-card__empty strong {
  display: block;
  font-size: 12px;
}

.weather-rail-card__empty small {
  display: block;
  margin-top: 4px;
  line-height: 1.35;
  letter-spacing: 0;
  text-transform: none;
}

.weather-rail-card__empty-visual {
  position: relative;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid color-mix(in srgb, var(--cyan) 30%, var(--border-color));
  border-radius: 14px;
  background: color-mix(in srgb, var(--cyan) 10%, var(--control-bg));
}

.weather-rail-card__empty-visual span {
  width: 20px;
  height: 11px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--cyan) 55%, var(--text-muted));
  animation: weatherEmptyFloat 2.4s ease-in-out infinite;
}

.weather-rail-card__empty-visual span::before {
  position: absolute;
  left: 12px;
  top: 13px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: inherit;
  content: "";
}

.weather-rail-card__empty-visual i {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--warning);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--warning) 18%, transparent);
  animation: weatherEmptyDot 1.6s ease-in-out infinite;
}

.weather-rail-card__empty--error {
  border-color: color-mix(in srgb, var(--warning) 34%, var(--border-color));
  background: color-mix(in srgb, var(--warning) 6%, var(--control-bg));
}

.weather-rail-card--loading {
  animation: weatherRailPulse 1.5s ease-in-out infinite;
}

@keyframes weatherRailPulse {
  50% { opacity: .72; }
}

@keyframes weatherEmptyFloat {
  50% { transform: translateY(-3px); }
}

@keyframes weatherEmptyDot {
  50% { transform: scale(.72); opacity: .62; }
}

@keyframes weatherEmptyShimmer {
  45%, 100% { transform: translateX(120%); }
}

@media (max-width: 520px) {
  .weather-rail-card__body {
    grid-template-columns: 1fr;
  }
}
</style>
