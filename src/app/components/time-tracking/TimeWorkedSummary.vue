<template>
  <div
    v-if="summary?.totalMinutes"
    class="worked-summary"
    :class="[`worked-summary--${variant}`]"
    :style="{ '--summary-color': accentColor }"
    :title="tooltip"
  >
    <span class="worked-summary__icon"><UiIcon name="clock" /></span>
    <div class="worked-summary__copy">
      <small>{{ variant === 'day' ? 'Учтено времени' : 'Работа' }}</small>
      <strong>{{ formatDuration(summary.totalMinutes) }}</strong>
    </div>
    <div v-if="variant === 'day'" class="worked-summary__projects">
      <span
        v-for="project in visibleProjects"
        :key="project.id"
        :style="{ '--project-color': project.color }"
      >
        <i />
        <b>{{ project.name }}</b>
        <small>{{ formatDuration(project.minutes) }}</small>
      </span>
      <em v-if="hiddenProjects">+{{ hiddenProjects }}</em>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DailyTimeSummary } from '../../stores/timeTracking.store'
import UiIcon from '../ui/UiIcon.vue'

const props = withDefaults(defineProps<{
  summary?: DailyTimeSummary | null
  variant?: 'month' | 'week' | 'day'
}>(), {
  summary: null,
  variant: 'month',
})

const projectLimit = computed(() => props.variant === 'day' ? 4 : props.variant === 'week' ? 2 : 3)
const visibleProjects = computed(() => props.summary?.projects.slice(0, projectLimit.value) || [])
const hiddenProjects = computed(() => Math.max(0, (props.summary?.projects.length || 0) - visibleProjects.value.length))
const accentColor = computed(() => {
  const projects = [...(props.summary?.projects || [])]
  return projects.sort((first, second) => second.minutes - first.minutes)[0]?.color || '#22d3ee'
})
const tooltip = computed(() => props.summary?.projects
  .map((project) => `${project.name}: ${formatDuration(project.minutes)}`)
  .join(' · ') || '')

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} мин`
  if (!rest) return `${hours} ч`
  return `${hours} ч ${rest} мин`
}
</script>

<style scoped>
.worked-summary{display:flex;align-items:center;gap:7px;min-width:0;color:var(--text-primary)}.worked-summary__icon{display:grid;place-items:center;flex:0 0 auto;color:var(--summary-color)}.worked-summary__copy{display:grid;min-width:0}.worked-summary__copy small{color:var(--text-muted);font-size:7px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.worked-summary__copy strong{font-size:11px;line-height:1.15}.worked-summary__projects{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:5px;margin-left:auto}.worked-summary__projects>span{display:grid;grid-template-columns:6px auto;align-items:center;gap:0 5px;max-width:150px;border-radius:var(--radius-pill);padding:3px 6px;background:var(--field-bg)}.worked-summary__projects i{width:6px;height:6px;border-radius:50%;background:var(--project-color)}.worked-summary__projects b{overflow:hidden;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.worked-summary__projects small{grid-column:2;color:var(--text-muted);font-size:8px}.worked-summary__projects em{color:var(--text-muted);font-size:9px;font-style:normal}.worked-summary--month{align-self:flex-end;gap:4px;margin-top:auto;padding:1px 2px;color:var(--summary-color)}.worked-summary--month .worked-summary__icon{font-size:10px}.worked-summary--month .worked-summary__copy{display:block}.worked-summary--month .worked-summary__copy small{display:none}.worked-summary--month .worked-summary__copy strong{font-size:9px;font-weight:750}.worked-summary--week{width:max-content;gap:4px;border:1px solid color-mix(in srgb,var(--summary-color) 24%,var(--border-color));border-radius:var(--radius-pill);padding:3px 6px;color:var(--summary-color);background:color-mix(in srgb,var(--summary-color) 7%,transparent)}.worked-summary--week .worked-summary__icon{font-size:10px}.worked-summary--week .worked-summary__copy{display:block}.worked-summary--week .worked-summary__copy small{display:none}.worked-summary--week .worked-summary__copy strong{font-size:9px}.worked-summary--day{border:1px solid color-mix(in srgb,var(--summary-color) 26%,var(--border-color));border-radius:13px;padding:11px 12px;background:linear-gradient(135deg,color-mix(in srgb,var(--summary-color) 10%,var(--control-bg)),var(--control-bg));box-shadow:inset 0 1px 0 color-mix(in srgb,var(--summary-color) 8%,transparent)}.worked-summary--day .worked-summary__icon{width:38px;height:38px;border-radius:11px;background:color-mix(in srgb,var(--summary-color) 12%,var(--card-soft));font-size:18px}.worked-summary--day .worked-summary__copy strong{font-size:18px}.worked-summary--day .worked-summary__projects{gap:7px}@media(max-width:720px){.worked-summary--month{justify-content:center;min-height:8px;margin-top:auto}.worked-summary--month .worked-summary__icon,.worked-summary--month .worked-summary__copy{display:none}.worked-summary--month::after{width:14px;height:3px;border-radius:4px;background:var(--summary-color);content:""}.worked-summary--day{align-items:flex-start}.worked-summary--day .worked-summary__projects{justify-content:flex-start;margin-left:0}}
</style>
