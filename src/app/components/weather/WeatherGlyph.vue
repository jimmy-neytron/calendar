<template>
  <span class="weather-glyph" :class="[`weather-glyph--${icon}`, `weather-glyph--${tone}`]" aria-hidden="true">
    <i />
  </span>
</template>

<script setup lang="ts">
import type { WeatherConditionTone } from '../../services/weatherService'

withDefaults(defineProps<{
  icon?: string
  tone?: WeatherConditionTone
}>(), {
  icon: 'cloud',
  tone: 'cloudy',
})
</script>

<style scoped>
.weather-glyph {
  --weather-color: var(--cyan);
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--weather-color) 28%, var(--border-color));
  border-radius: 12px;
  background: color-mix(in srgb, var(--weather-color) 10%, var(--control-bg));
}

.weather-glyph--clear { --weather-color: var(--warning); }
.weather-glyph--rain { --weather-color: var(--cyan); }
.weather-glyph--snow { --weather-color: #b7d7ff; }
.weather-glyph--storm { --weather-color: var(--orange); }
.weather-glyph--fog { --weather-color: var(--text-muted); }

.weather-glyph i,
.weather-glyph::before,
.weather-glyph::after {
  position: absolute;
  content: "";
}

.weather-glyph--sun i {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--weather-color);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--weather-color) 20%, transparent);
}

.weather-glyph--cloud i,
.weather-glyph--rain i,
.weather-glyph--snow i,
.weather-glyph--storm i,
.weather-glyph--partly i {
  left: 8px;
  top: 15px;
  width: 19px;
  height: 9px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--weather-color) 75%, var(--text-primary));
}

.weather-glyph--cloud i::before,
.weather-glyph--rain i::before,
.weather-glyph--snow i::before,
.weather-glyph--storm i::before,
.weather-glyph--partly i::before {
  position: absolute;
  left: 4px;
  bottom: 4px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: inherit;
  content: "";
}

.weather-glyph--partly::before {
  right: 9px;
  top: 9px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--warning);
}

.weather-glyph--rain::after {
  left: 11px;
  top: 26px;
  width: 3px;
  height: 5px;
  border-radius: 3px;
  background: var(--cyan);
  box-shadow: 6px 0 0 var(--cyan), 12px 0 0 var(--cyan);
}

.weather-glyph--snow::after {
  left: 11px;
  top: 27px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #dbeafe;
  box-shadow: 7px 0 0 #dbeafe, 14px 0 0 #dbeafe;
}

.weather-glyph--storm::after {
  left: 15px;
  top: 24px;
  width: 8px;
  height: 11px;
  background: var(--warning);
  clip-path: polygon(45% 0, 100% 0, 62% 43%, 100% 43%, 31% 100%, 48% 54%, 0 54%);
}

.weather-glyph--fog i,
.weather-glyph--fog::before,
.weather-glyph--fog::after {
  left: 8px;
  width: 18px;
  height: 2px;
  border-radius: 4px;
  background: var(--text-muted);
}

.weather-glyph--fog i { top: 12px; }
.weather-glyph--fog::before { top: 18px; }
.weather-glyph--fog::after { top: 24px; }
</style>
