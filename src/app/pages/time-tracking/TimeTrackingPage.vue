<template>
  <section class="time-page">
    <header class="time-hero panel">
      <div>
        <span>Учёт времени</span>
        <h1>Часы без секундомера и мучений</h1>
        <p>Выбирай проект, нажимай готовую длительность и сохраняй. Никаких полей «с 09:17 до 11:43».</p>
      </div>
      <div class="time-hero__total">
        <small>Эта неделя</small>
        <strong>{{ formatDuration(weekMinutes) }}</strong>
        <span>{{ projects.length }} {{ pluralize(projects.length, ['проект', 'проекта', 'проектов']) }}</span>
      </div>
    </header>

    <section class="time-stats">
      <article class="time-stat panel">
        <span>Сегодня</span>
        <strong>{{ formatDuration(todayMinutes) }}</strong>
        <small>{{ todayEntries.length }} {{ pluralize(todayEntries.length, ['запись', 'записи', 'записей']) }}</small>
      </article>
      <article class="time-stat time-stat--chart panel">
        <div>
          <span>Ритм недели</span>
          <small>Пн — Вс</small>
        </div>
        <div class="week-bars">
          <div v-for="day in weekByDay" :key="day.date">
            <i :style="{ height: `${barHeight(day.minutes)}%` }" :title="formatDuration(day.minutes)" />
            <small>{{ day.label }}</small>
          </div>
        </div>
      </article>
    </section>

    <div class="time-grid">
      <TimeEntryComposer
        :projects="projects"
        :entry-loading="entryLoading"
        :project-loading="projectLoading"
        @submit="addEntry"
        @create-project="addProject"
        @remove-project="removeProject"
        @open-project="openProject"
      />
      <TimeEntryList
        :entries="entries"
        :projects="projects"
        @remove="removeEntry"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import TimeEntryComposer from '../../components/time-tracking/TimeEntryComposer.vue'
import TimeEntryList from '../../components/time-tracking/TimeEntryList.vue'
import { timeTrackingStore } from '../../stores/timeTracking.store'
import { useNotification } from '../../composables/ui/useNotification.js'

const { notify } = useNotification()
const router = useRouter()
const projects = timeTrackingStore.projects
const entries = timeTrackingStore.entries
const todayMinutes = timeTrackingStore.todayMinutes
const weekMinutes = timeTrackingStore.weekMinutes
const weekByDay = timeTrackingStore.weekByDay
const entryLoading = ref(false)
const projectLoading = ref(false)
const todayKey = toDateKey(new Date())
const todayEntries = computed(() => entries.value.filter((entry) => entry.date === todayKey))
const maxDayMinutes = computed(() => Math.max(60, ...weekByDay.value.map((day) => day.minutes)))

async function addProject(payload: { name: string; color: string }) {
  projectLoading.value = true
  const result = await timeTrackingStore.addProject(payload.name, payload.color)
  projectLoading.value = false
  notify(
    result.ok ? `Проект «${payload.name}» добавлен` : result.message || 'Не удалось добавить проект',
    result.ok ? 'success' : 'danger',
  )
}

async function addEntry(payload: { projectId: string; date: string; minutes: number; note: string }) {
  entryLoading.value = true
  const result = await timeTrackingStore.addEntry(payload)
  entryLoading.value = false
  notify(
    result.ok ? `Добавлено ${formatDuration(payload.minutes)}` : result.message || 'Не удалось сохранить время',
    result.ok ? 'success' : 'danger',
  )
}

async function removeEntry(id: string) {
  const result = await timeTrackingStore.removeEntry(id)
  notify(
    result.ok ? 'Запись удалена' : result.message || 'Не удалось удалить запись',
    result.ok ? 'info' : 'danger',
  )
}

async function removeProject(project: { id: string; name: string }) {
  const linkedEntries = entries.value.filter((entry) => entry.projectId === project.id).length
  const details = linkedEntries
    ? ` Вместе с ним будут удалены записи времени: ${linkedEntries}.`
    : ''
  if (!window.confirm(`Удалить проект «${project.name}»?${details} Это действие нельзя отменить.`)) return

  const result = await timeTrackingStore.removeProject(project.id)
  notify(
    result.ok ? `Проект «${project.name}» удалён` : result.message || 'Не удалось удалить проект',
    result.ok ? 'info' : 'danger',
  )
}

function openProject(project: { id: string }) {
  router.push({ name: 'time-project', params: { projectId: project.id } })
}

function barHeight(minutes: number) {
  if (!minutes) return 4
  return Math.max(12, Math.round((minutes / maxDayMinutes.value) * 100))
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} мин`
  if (!rest) return `${hours} ч`
  return `${hours} ч ${rest} мин`
}

function pluralize(value: number, words: [string, string, string]) {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return words[2]
  if (last === 1) return words[0]
  if (last >= 2 && last <= 4) return words[1]
  return words[2]
}

function toDateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
</script>

<style scoped>
.time-page{display:grid;gap:12px;width:min(100%,1180px);margin:0 auto;animation:fadeSlideUp .42s var(--ease-out)}.time-hero{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:24px 26px;background:radial-gradient(circle at 88% 20%,color-mix(in srgb,var(--cyan) 12%,transparent),transparent 220px),var(--panel-bg)}.time-hero>div:first-child>span,.time-stat>span,.time-stat>div>span{color:var(--cyan);font-size:9px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.time-hero h1{margin:5px 0 7px}.time-hero p{max-width:620px;margin:0;color:var(--text-secondary)}.time-hero__total{display:grid;justify-items:end;min-width:190px}.time-hero__total small,.time-hero__total span{color:var(--text-muted)}.time-hero__total strong{margin:2px 0;font-size:28px;letter-spacing:-.04em}.time-stats{display:grid;grid-template-columns:240px minmax(0,1fr);gap:12px}.time-stat{display:grid;align-content:center;padding:17px 19px}.time-stat>strong{margin:3px 0;font-size:25px}.time-stat>small{color:var(--text-muted)}.time-stat--chart{grid-template-columns:120px minmax(0,1fr);align-items:center;gap:16px}.time-stat--chart>div:first-child small{display:block;margin-top:3px;color:var(--text-muted)}.week-bars{display:grid;grid-template-columns:repeat(7,1fr);align-items:end;gap:7px;height:66px}.week-bars>div{display:grid;grid-template-rows:44px auto;align-items:end;justify-items:center;gap:4px;height:100%}.week-bars i{display:block;width:100%;max-width:34px;min-height:2px;border-radius:5px 5px 2px 2px;background:linear-gradient(180deg,var(--cyan),color-mix(in srgb,var(--cyan) 42%,var(--control-bg)))}.week-bars small{color:var(--text-muted);font-size:8px;text-transform:uppercase}.time-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:12px;align-items:start}@media(max-width:900px){.time-grid{grid-template-columns:1fr}.time-stats{grid-template-columns:1fr 2fr}}@media(max-width:680px){.time-hero{align-items:flex-start;display:grid;padding:19px}.time-hero__total{justify-items:start}.time-stats{grid-template-columns:1fr}.time-stat--chart{grid-template-columns:95px minmax(0,1fr)}}
</style>
