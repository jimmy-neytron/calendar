import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { readTimeTrackingSetting } from '../composables/preferences/useTimeTrackingSettings.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { authStore } from './auth.store.js'
import { workspaceStore } from './workspace.store.js'

export interface TimeProject {
  id: string
  workspaceId: string
  name: string
  color: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface TimeEntry {
  id: string
  workspaceId: string
  projectId: string
  userId: string
  date: string
  minutes: number
  note: string
  createdAt: string
  updatedAt: string
}

export interface NewTimeEntry {
  projectId: string
  date: string
  minutes: number
  note?: string
}

export interface TimeChartItem {
  label: string
  value: number
  minutes: number
}

export interface TimeProjectAnalytics {
  totalMinutes: number
  weekMinutes: number
  monthMinutes: number
  averageEntryMinutes: number
  activeDays: number
  weekChart: TimeChartItem[]
  monthChart: TimeChartItem[]
  weekdayBreakdown: Array<{ label: string; value: number; color: string }>
}

export interface DailyTimeSummary {
  date: string
  totalMinutes: number
  projects: Array<{
    id: string
    name: string
    color: string
    minutes: number
  }>
}

const projectRepository = new SyncedCollectionRepository(
  `${APP_CONFIG.storageKey}:time-projects`,
  [],
  'time_projects',
)
const entryRepository = new SyncedCollectionRepository(
  `${APP_CONFIG.storageKey}:time-entries`,
  [],
  'time_entries',
)

const projects = computed<TimeProject[]>(() => {
  if (!readTimeTrackingSetting()) return []
  return projectRepository.items.value
    .filter((project: TimeProject) => (
      project.workspaceId === workspaceStore.activeWorkspaceId.value && !project.archived
    ))
    .sort((a: TimeProject, b: TimeProject) => a.name.localeCompare(b.name, 'ru'))
})

const entries = computed<TimeEntry[]>(() => {
  if (!readTimeTrackingSetting()) return []
  return entryRepository.items.value
    .filter((entry: TimeEntry) => entry.workspaceId === workspaceStore.activeWorkspaceId.value)
    .sort((a: TimeEntry, b: TimeEntry) => (
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
    ))
})

const todayMinutes = computed(() => {
  const today = toDateKey(new Date())
  return entries.value
    .filter((entry) => entry.date === today)
    .reduce((total, entry) => total + entry.minutes, 0)
})

const weekMinutes = computed(() => {
  const start = getWeekStart(new Date())
  const end = addDays(start, 6)
  const startKey = toDateKey(start)
  const endKey = toDateKey(end)
  return entries.value
    .filter((entry) => entry.date >= startKey && entry.date <= endKey)
    .reduce((total, entry) => total + entry.minutes, 0)
})

const weekByDay = computed(() => {
  const start = getWeekStart(new Date())
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index)
    const dateKey = toDateKey(date)
    return {
      date: dateKey,
      label: new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date).replace('.', ''),
      minutes: entries.value
        .filter((entry) => entry.date === dateKey)
        .reduce((total, entry) => total + entry.minutes, 0),
    }
  })
})

const dailySummaries = computed<Record<string, DailyTimeSummary>>(() => {
  const summaries: Record<string, DailyTimeSummary> = {}
  entries.value.forEach((entry) => {
    const project = projects.value.find((item) => item.id === entry.projectId)
    const summary = summaries[entry.date] || {
      date: entry.date,
      totalMinutes: 0,
      projects: [],
    }
    summary.totalMinutes += entry.minutes
    const projectSummary = summary.projects.find((item) => item.id === entry.projectId)
    if (projectSummary) {
      projectSummary.minutes += entry.minutes
    } else {
      summary.projects.push({
        id: entry.projectId,
        name: project?.name || 'Проект',
        color: project?.color || '#60a5fa',
        minutes: entry.minutes,
      })
    }
    summaries[entry.date] = summary
  })
  return summaries
})

function getProjectById(id: string) {
  return projects.value.find((project) => project.id === id) || null
}

function getProjectEntries(projectId: string) {
  return entries.value.filter((entry) => entry.projectId === projectId)
}

function getProjectAnalytics(projectId: string, anchorDate = new Date()): TimeProjectAnalytics {
  const projectEntries = getProjectEntries(projectId)
  const today = new Date(anchorDate)
  const weekStart = getWeekStart(today)
  const weekEnd = addDays(weekStart, 6)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const weekEntries = entriesBetween(projectEntries, weekStart, weekEnd)
  const monthEntries = entriesBetween(projectEntries, monthStart, monthEnd)

  const weekChart = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    const minutes = minutesOnDate(projectEntries, toDateKey(date))
    return {
      label: new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date).replace('.', ''),
      value: toChartHours(minutes),
      minutes,
    }
  })

  const monthChart = Array.from({ length: 6 }, (_, reverseIndex) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - reverseIndex), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    const minutes = sumMinutes(entriesBetween(projectEntries, date, end))
    return {
      label: new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(date).replace('.', ''),
      value: toChartHours(minutes),
      minutes,
    }
  })

  const projectColor = getProjectById(projectId)?.color || '#60a5fa'
  const weekdayTones = [100, 88, 76, 64, 52, 40, 30]
  const weekdayBreakdown = Array.from({ length: 7 }, (_, offset) => {
    const weekday = (offset + 1) % 7
    const minutes = projectEntries
      .filter((entry) => new Date(`${entry.date}T12:00:00`).getDay() === weekday)
      .reduce((total, entry) => total + entry.minutes, 0)
    return {
      label: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][weekday],
      value: toChartHours(minutes),
      color: `color-mix(in srgb, ${projectColor} ${weekdayTones[offset]}%, var(--control-bg))`,
    }
  }).filter((item) => item.value > 0)

  const totalMinutes = sumMinutes(projectEntries)
  return {
    totalMinutes,
    weekMinutes: sumMinutes(weekEntries),
    monthMinutes: sumMinutes(monthEntries),
    averageEntryMinutes: projectEntries.length ? Math.round(totalMinutes / projectEntries.length) : 0,
    activeDays: new Set(projectEntries.map((entry) => entry.date)).size,
    weekChart,
    monthChart,
    weekdayBreakdown,
  }
}

async function addProject(name: string, color = '#60a5fa') {
  if (!readTimeTrackingSetting()) return disabledResult()
  const title = String(name || '').trim()
  if (!title) return { ok: false, message: 'Укажи название проекта' }
  if (projects.value.some((project) => project.name.toLocaleLowerCase() === title.toLocaleLowerCase())) {
    return { ok: false, message: 'Проект с таким названием уже есть' }
  }

  const now = new Date().toISOString()
  const project: TimeProject = {
    id: generateId(),
    workspaceId: workspaceStore.activeWorkspaceId.value || '',
    name: title,
    color,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }
  const result = await projectRepository.createAndWait(project)
  return result.ok ? { ok: true, project } : result
}

async function updateProjectColor(id: string, color: string) {
  if (!readTimeTrackingSetting()) return disabledResult()
  const project = projectRepository.findById(id) as TimeProject | undefined
  if (!project || project.workspaceId !== workspaceStore.activeWorkspaceId.value) {
    return { ok: false, message: 'Проект не найден' }
  }
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    return { ok: false, message: 'Некорректный цвет проекта' }
  }

  const result = await projectRepository.updateAndWait(id, {
    ...project,
    color,
    updatedAt: new Date().toISOString(),
  })
  return result.ok ? { ok: true, project: result.item } : result
}

async function addEntry(data: NewTimeEntry) {
  if (!readTimeTrackingSetting()) return disabledResult()
  const project = projectRepository.findById(data.projectId) as TimeProject | undefined
  if (!project || project.workspaceId !== workspaceStore.activeWorkspaceId.value) {
    return { ok: false, message: 'Выбери проект' }
  }
  const minutes = Math.round(Number(data.minutes))
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 24 * 60) {
    return { ok: false, message: 'Длительность должна быть от 5 минут до 24 часов' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return { ok: false, message: 'Выбери дату' }
  }

  const now = new Date().toISOString()
  const entry: TimeEntry = {
    id: generateId(),
    workspaceId: workspaceStore.activeWorkspaceId.value || '',
    projectId: project.id,
    userId: authStore.currentUserId.value || '',
    date: data.date,
    minutes,
    note: String(data.note || '').trim(),
    createdAt: now,
    updatedAt: now,
  }
  const result = await entryRepository.createAndWait(entry)
  return result.ok ? { ok: true, entry } : result
}

async function removeEntry(id: string) {
  if (!readTimeTrackingSetting()) return disabledResult()
  const entry = entryRepository.findById(id) as TimeEntry | undefined
  if (!entry || entry.workspaceId !== workspaceStore.activeWorkspaceId.value) {
    return { ok: false, message: 'Запись не найдена' }
  }
  return entryRepository.deleteAndWait(id)
}

async function removeProject(id: string) {
  if (!readTimeTrackingSetting()) return disabledResult()
  const project = projectRepository.findById(id) as TimeProject | undefined
  if (!project) return { ok: false, message: 'Проект не найден' }

  const linkedEntries = entries.value.filter((entry) => entry.projectId === id)
  for (const entry of linkedEntries) {
    const result = await entryRepository.deleteAndWait(entry.id)
    if (!result.ok) {
      return { ok: false, message: 'Не удалось удалить записи времени проекта' }
    }
  }

  const result = await projectRepository.deleteAndWait(id)
  return result.ok ? { ok: true, deletedEntries: linkedEntries.length } : result
}

async function loadWorkspace(workspaceId: string) {
  if (!readTimeTrackingSetting()) return []
  const [loadedProjects, loadedEntries] = await Promise.all([
    projectRepository.loadWorkspace(workspaceId),
    entryRepository.loadWorkspace(workspaceId),
  ])
  return loadedProjects === null || loadedEntries === null ? null : loadedEntries
}

function disabledResult() {
  return { ok: false, disabled: true, message: 'Учёт времени выключен в настройках' }
}

function getWeekStart(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day))
  return start
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function entriesBetween(items: TimeEntry[], start: Date, end: Date) {
  const startKey = toDateKey(start)
  const endKey = toDateKey(end)
  return items.filter((entry) => entry.date >= startKey && entry.date <= endKey)
}

function minutesOnDate(items: TimeEntry[], date: string) {
  return items
    .filter((entry) => entry.date === date)
    .reduce((total, entry) => total + entry.minutes, 0)
}

function sumMinutes(items: TimeEntry[]) {
  return items.reduce((total, entry) => total + entry.minutes, 0)
}

function toChartHours(minutes: number) {
  return Math.round(minutes / 6) / 10
}

export const timeTrackingStore = {
  projects,
  entries,
  todayMinutes,
  weekMinutes,
  weekByDay,
  dailySummaries,
  getProjectById,
  getProjectEntries,
  getProjectAnalytics,
  addProject,
  updateProjectColor,
  removeProject,
  addEntry,
  removeEntry,
  loadWorkspace,
  syncError: entryRepository.lastError,
  pendingSyncCount: entryRepository.pendingCount,
}
