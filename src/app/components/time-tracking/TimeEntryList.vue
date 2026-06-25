<template>
  <section class="time-list panel">
    <header class="time-list__header">
      <div>
        <span>История</span>
        <h2>Последние записи</h2>
      </div>
      <small>{{ entries.length }} {{ pluralize(entries.length, ['запись', 'записи', 'записей']) }}</small>
    </header>

    <div v-if="entries.length" class="time-list__items">
      <article v-for="entry in entries" :key="entry.id" class="time-entry">
        <i :style="{ '--project-color': projectById(entry.projectId)?.color || 'var(--text-muted)' }" />
        <div class="time-entry__body">
          <div>
            <strong>{{ projectById(entry.projectId)?.name || 'Проект удалён' }}</strong>
            <span>{{ formatDuration(entry.minutes) }}</span>
          </div>
          <p v-if="entry.note">{{ entry.note }}</p>
          <small>{{ formatDate(entry.date) }}</small>
        </div>
        <UiIconButton
          icon="trash"
          label="Удалить запись времени"
          size="sm"
          variant="danger"
          @click="$emit('remove', entry.id)"
        />
      </article>
    </div>

    <div v-else class="time-list__empty">
      <span><UiIcon name="activity" /></span>
      <strong>Время ещё не записывали</strong>
      <p>Выбери проект, нажми подходящую длительность — и первая запись готова.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TimeEntry, TimeProject } from '../../stores/timeTracking.store'
import UiIcon from '../ui/UiIcon.vue'
import UiIconButton from '../ui/UiIconButton.vue'

const props = defineProps<{
  entries: TimeEntry[]
  projects: TimeProject[]
}>()

defineEmits<{ remove: [id: string] }>()

function projectById(id: string) {
  return props.projects.find((project) => project.id === id)
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} мин`
  if (!rest) return `${hours} ч`
  return `${hours} ч ${rest} мин`
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T12:00:00`))
}

function pluralize(value: number, words: [string, string, string]) {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return words[2]
  if (last === 1) return words[0]
  if (last >= 2 && last <= 4) return words[1]
  return words[2]
}
</script>

<style scoped>
.time-list{display:grid;gap:14px;padding:20px}.time-list__header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.time-list__header span{color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.time-list__header h2{margin:3px 0 0}.time-list__header small{border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:5px 8px;color:var(--text-muted);background:var(--control-bg)}.time-list__items{display:grid}.time-entry{display:grid;grid-template-columns:4px minmax(0,1fr) auto;gap:12px;padding:13px 0;border-top:1px solid var(--border-color)}.time-entry>i{width:4px;border-radius:4px;background:var(--project-color)}.time-entry__body{min-width:0}.time-entry__body>div{display:flex;align-items:center;justify-content:space-between;gap:10px}.time-entry__body strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.time-entry__body span{flex:0 0 auto;font-size:13px;font-weight:850}.time-entry__body p{margin:4px 0 2px;color:var(--text-secondary);font-size:11px}.time-entry__body small{color:var(--text-muted);font-size:9px}.time-list__empty{display:grid;justify-items:center;gap:5px;padding:36px 16px;text-align:center}.time-list__empty>span{display:grid;place-items:center;width:44px;height:44px;margin-bottom:5px;border-radius:14px;color:var(--info);background:color-mix(in srgb,var(--info) 10%,var(--control-bg));font-size:20px}.time-list__empty p{max-width:360px;margin:0;color:var(--text-muted);font-size:11px}@media(max-width:680px){.time-list{padding:15px}}
</style>
