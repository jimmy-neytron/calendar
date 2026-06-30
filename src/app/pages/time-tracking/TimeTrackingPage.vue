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

    <section v-if="projectSummaries.length" class="project-overview panel">
      <header>
        <div>
          <span>Проекты</span>
          <h2>Куда ушло время</h2>
        </div>
        <small>{{ formatDuration(totalMinutes) }} всего</small>
      </header>

      <div class="project-overview__grid">
        <button
          v-for="project in projectSummaries"
          :key="project.id"
          type="button"
          :style="{ '--project-color': project.color, '--project-progress': `${project.progress}%` }"
          @click="openProject(project)"
        >
          <span><i /></span>
          <strong>{{ project.name }}</strong>
          <small>{{ formatDuration(project.minutes) }}</small>
        </button>
      </div>
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
const totalMinutes = computed(() => entries.value.reduce((sum, entry) => sum + entry.minutes, 0))
const projectSummaries = computed(() => {
  const maxMinutes = Math.max(60, ...projects.value.map((project) => projectMinutes(project.id)))
  return projects.value
    .map((project) => {
      const minutes = projectMinutes(project.id)
      return {
        ...project,
        minutes,
        progress: Math.max(6, Math.round((minutes / maxMinutes) * 100)),
      }
    })
    .sort((a, b) => b.minutes - a.minutes)
})

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

function projectMinutes(projectId: string) {
  return entries.value
    .filter((entry) => entry.projectId === projectId)
    .reduce((sum, entry) => sum + entry.minutes, 0)
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
.time-page{display:grid;gap:14px;width:min(100%,1200px);margin:0 auto;animation:fadeSlideUp .42s var(--ease-out)}.time-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 220px;align-items:end;gap:24px;overflow:hidden;padding:24px 26px;background:linear-gradient(135deg,color-mix(in srgb,var(--cyan) 8%,var(--panel-bg)),var(--panel-bg))}.time-hero::after{position:absolute;right:24px;top:18px;width:130px;height:130px;border:1px solid color-mix(in srgb,var(--cyan) 18%,transparent);border-radius:32px;content:"";transform:rotate(8deg);pointer-events:none}.time-hero>div:first-child>span,.time-stat>span,.time-stat>div>span,.project-overview header span{color:var(--cyan);font-size:9px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.time-hero h1{max-width:720px;margin:5px 0 7px;font-size:clamp(26px,3vw,38px);line-height:1.05}.time-hero p{max-width:660px;margin:0;color:var(--text-secondary);line-height:1.55}.time-hero__total{position:relative;z-index:1;display:grid;justify-items:end;min-width:190px;border:1px solid var(--border-color);border-radius:16px;padding:15px;background:var(--card-soft)}.time-hero__total small,.time-hero__total span{color:var(--text-muted)}.time-hero__total strong{margin:2px 0;font-size:31px;letter-spacing:0}.time-stats{display:grid;grid-template-columns:260px minmax(0,1fr);gap:12px}.time-stat{display:grid;align-content:center;min-height:112px;padding:18px 20px}.time-stat>strong{margin:3px 0;font-size:28px;letter-spacing:0}.time-stat>small{color:var(--text-muted)}.time-stat--chart{grid-template-columns:130px minmax(0,1fr);align-items:center;gap:18px}.time-stat--chart>div:first-child small{display:block;margin-top:3px;color:var(--text-muted)}.week-bars{display:grid;grid-template-columns:repeat(7,1fr);align-items:end;gap:8px;height:72px}.week-bars>div{display:grid;grid-template-rows:48px auto;align-items:end;justify-items:center;gap:5px;height:100%}.week-bars i{display:block;width:100%;max-width:38px;min-height:3px;border-radius:8px 8px 3px 3px;background:linear-gradient(180deg,var(--cyan),color-mix(in srgb,var(--cyan) 38%,var(--control-bg)))}.week-bars small{color:var(--text-muted);font-size:8px;text-transform:uppercase}.project-overview{display:grid;gap:12px;padding:16px}.project-overview header{display:flex;align-items:end;justify-content:space-between;gap:12px}.project-overview h2{margin:2px 0 0}.project-overview header small{color:var(--text-muted);font-size:10px}.project-overview__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}.project-overview__grid button{position:relative;display:grid;gap:6px;overflow:hidden;border:1px solid var(--border-color);border-radius:14px;padding:13px;color:var(--text-secondary);background:var(--control-bg);text-align:left;transition:.18s var(--ease-out)}.project-overview__grid button::after{position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,var(--project-color) var(--project-progress),transparent 0);content:""}.project-overview__grid button:hover{border-color:color-mix(in srgb,var(--project-color) 55%,var(--border-color));transform:translateY(-1px)}.project-overview__grid span{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:color-mix(in srgb,var(--project-color) 13%,var(--card-soft))}.project-overview__grid i{width:12px;height:12px;border-radius:50%;background:var(--project-color)}.project-overview__grid strong{overflow:hidden;color:var(--text-primary);text-overflow:ellipsis;white-space:nowrap}.project-overview__grid small{color:var(--text-muted)}.time-grid{display:grid;grid-template-columns:minmax(360px,.9fr) minmax(0,1.1fr);gap:14px;align-items:start}.time-grid>.time-composer{position:sticky;top:calc(var(--header-height) + 12px)}@media(max-width:980px){.time-grid{grid-template-columns:1fr}.time-grid>.time-composer{position:static}.time-stats{grid-template-columns:1fr 2fr}}@media(max-width:720px){.time-hero{grid-template-columns:1fr;padding:19px}.time-hero__total{justify-items:start}.time-stats{grid-template-columns:1fr}.time-stat--chart{grid-template-columns:95px minmax(0,1fr)}.project-overview header{align-items:flex-start;display:grid}.project-overview__grid{grid-template-columns:1fr 1fr}}@media(max-width:480px){.project-overview__grid{grid-template-columns:1fr}}
</style>
