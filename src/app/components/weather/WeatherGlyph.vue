<template>
  <span
    class="weather-glyph"
    :class="[`weather-glyph--${tone}`, `weather-glyph--tooltip-${tooltipPlacement}`]"
    :data-has-tooltip="Boolean(label)"
    :aria-hidden="label ? undefined : true"
    :aria-label="label || undefined"
    :role="label ? 'img' : undefined"
  >
    <component :is="glyph" :size="iconSize" :stroke-width="1.8" />
    <span v-if="label" class="weather-glyph__tooltip" aria-hidden="true">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WeatherConditionTone, WeatherIconName } from '../../services/weatherService'
import { weatherFallbackIcon, weatherIconMap } from './weatherIconMap'

const props = withDefaults(defineProps<{
  icon?: WeatherIconName
  tone?: WeatherConditionTone
  size?: 'default' | 'compact'
  label?: string
  tooltipPlacement?: 'top' | 'right'
}>(), {
  icon: 'cloud',
  tone: 'cloudy',
  size: 'default',
  label: '',
  tooltipPlacement: 'top',
})

const glyph = computed(() => weatherIconMap[props.icon] || weatherFallbackIcon)
const iconSize = computed(() => (props.size === 'compact' ? 16 : 20))
</script>

<style scoped>
.weather-glyph {
  --weather-color: var(--info);
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  color: var(--weather-color);
  border: 1px solid color-mix(in srgb, var(--weather-color) 24%, var(--border-color));
  border-radius: 11px;
  background: color-mix(in srgb, var(--weather-color) 9%, var(--control-bg));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary) 5%, transparent);
}

.weather-glyph--clear { --weather-color: var(--warning); }
.weather-glyph--cloudy { --weather-color: var(--text-secondary); }
.weather-glyph--rain { --weather-color: var(--info); }
.weather-glyph--snow { --weather-color: color-mix(in srgb, var(--info) 72%, var(--text-primary)); }
.weather-glyph--storm { --weather-color: var(--orange); }
.weather-glyph--fog { --weather-color: var(--text-muted); }

.weather-glyph :deep(svg) {
  filter: drop-shadow(0 1px 2px color-mix(in srgb, var(--weather-color) 18%, transparent));
}

.weather-glyph__tooltip {
  position: absolute;
  z-index: 50;
  display: block;
  width: max-content;
  max-width: min(240px, calc(100vw - 24px));
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  padding: 7px 9px;
  color: var(--text-primary);
  background: var(--sidebar-floating-bg);
  box-shadow: var(--shadow-md);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.4;
  text-align: left;
  white-space: normal;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity .16s var(--ease-out), transform .16s var(--ease-out), visibility .16s;
}

.weather-glyph--tooltip-top .weather-glyph__tooltip {
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translate(-50%, 4px);
}

.weather-glyph--tooltip-right .weather-glyph__tooltip {
  left: calc(100% + 8px);
  top: 50%;
  transform: translate(-4px, -50%);
}

@media (hover: hover) and (pointer: fine) {
  .weather-glyph[data-has-tooltip='true']:hover .weather-glyph__tooltip {
    opacity: 1;
    visibility: visible;
  }

  .weather-glyph--tooltip-top:hover .weather-glyph__tooltip {
    transform: translate(-50%, 0);
  }

  .weather-glyph--tooltip-right:hover .weather-glyph__tooltip {
    transform: translate(0, -50%);
  }
}
</style>
