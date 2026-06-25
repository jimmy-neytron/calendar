<template>
  <section class="time-composer panel">
    <header class="time-composer__header">
      <div>
        <span>Быстрая запись</span>
        <h2>Сколько времени ушло?</h2>
      </div>
      <button class="project-create-toggle" type="button" @click="showProjectForm = !showProjectForm">
        <UiIcon :name="showProjectForm ? 'close' : 'plus'" />
        {{ showProjectForm ? 'Закрыть' : 'Новый проект' }}
      </button>
    </header>

    <form v-if="showProjectForm" class="project-form" @submit.prevent="createProject">
      <UiInput
        v-model="projectName"
        label="Название проекта"
        placeholder="Например, Редизайн сайта"
      />
      <UiColorPicker v-model="projectColor" label="Цвет проекта" />
      <UiButton type="submit" size="sm" :loading="projectLoading">Создать проект</UiButton>
    </form>

    <form class="entry-form" @submit.prevent="submitEntry">
      <div class="project-picker">
        <div class="project-picker__head">
          <span class="field-label">Проект</span>
          <div v-if="selectedProject" class="project-picker__actions">
            <button type="button" @click="emit('openProject', selectedProject)">
              Открыть проект <UiIcon name="right" />
            </button>
            <UiIconButton
              icon="trash"
              :label="`Удалить проект ${selectedProject.name}`"
              size="sm"
              variant="danger"
              @click="emit('removeProject', selectedProject)"
            />
          </div>
        </div>
        <div v-if="projects.length" class="project-chips">
          <button
            v-for="project in projects"
            :key="project.id"
            type="button"
            :class="{ active: projectId === project.id }"
            :style="{ '--project-color': project.color }"
            @click="projectId = project.id"
          >
            <i />
            {{ project.name }}
          </button>
        </div>
        <UiColorPicker
          v-if="selectedProject"
          :model-value="selectedProject.color"
          label="Цвет выбранного проекта"
          @change="emit('updateProjectColor', { project: selectedProject, color: $event })"
        />
        <button v-else class="empty-project" type="button" @click="showProjectForm = true">
          <UiIcon name="plus" /> Сначала добавь проект
        </button>
      </div>

      <div class="duration-field">
        <span class="field-label">Длительность</span>
        <div class="duration-stepper">
          <button type="button" aria-label="Уменьшить на 1 час" @click="changeDuration(-60)">
            <UiIcon name="minus" />
          </button>
          <strong>{{ formatDuration(minutes) }}</strong>
          <button type="button" aria-label="Увеличить на 1 час" @click="changeDuration(60)">
            <UiIcon name="plus" />
          </button>
        </div>
        <div class="duration-presets">
          <button
            v-for="preset in durationPresets"
            :key="preset.minutes"
            type="button"
            :class="{ active: minutes === preset.minutes }"
            @click="minutes = preset.minutes"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>

      <div class="entry-meta">
        <UiInput v-model="date" type="date" label="Дата" />
        <UiInput
          v-model="note"
          label="Комментарий"
          placeholder="Что было сделано? Необязательно"
        />
      </div>

      <UiButton
        type="submit"
        size="lg"
        icon="+"
        :disabled="!projectId || !projects.length"
        :loading="entryLoading"
      >
        Добавить {{ formatDuration(minutes) }}
      </UiButton>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TimeProject } from '../../stores/timeTracking.store'
import UiButton from '../ui/UiButton.vue'
import UiColorPicker from '../ui/UiColorPicker.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiInput from '../ui/UiInput.vue'

const props = defineProps<{
  projects: TimeProject[]
  entryLoading?: boolean
  projectLoading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: { projectId: string; date: string; minutes: number; note: string }]
  createProject: [payload: { name: string; color: string }]
  removeProject: [project: TimeProject]
  openProject: [project: TimeProject]
  updateProjectColor: [payload: { project: TimeProject; color: string }]
  selectProject: [project: TimeProject]
}>()

const durationPresets = [
  { minutes: 60, label: '1 ч' },
  { minutes: 120, label: '2 ч' },
  { minutes: 180, label: '3 ч' },
  { minutes: 240, label: '4 ч' },
  { minutes: 300, label: '5 ч' },
]
const projectId = ref('')
const date = ref(toDateKey(new Date()))
const minutes = ref(60)
const note = ref('')
const showProjectForm = ref(false)
const projectName = ref('')
const projectColor = ref('#60a5fa')
const selectedProject = computed(() => props.projects.find((project) => project.id === projectId.value))

watch(
  () => props.projects,
  (projects) => {
    if (!projects.some((project) => project.id === projectId.value)) {
      projectId.value = projects[0]?.id || ''
    }
  },
  { immediate: true },
)

watch(projectId, (id) => {
  const project = props.projects.find((item) => item.id === id)
  if (project) emit('selectProject', project)
}, { immediate: true })

function changeDuration(delta: number) {
  minutes.value = Math.min(24 * 60, Math.max(60, minutes.value + delta))
}

function submitEntry() {
  emit('submit', {
    projectId: projectId.value,
    date: date.value,
    minutes: minutes.value,
    note: note.value,
  })
  note.value = ''
}

function createProject() {
  const name = projectName.value.trim()
  if (!name) return
  emit('createProject', { name, color: projectColor.value })
  projectName.value = ''
  showProjectForm.value = false
}

function formatDuration(value: number) {
  const hours = Math.floor(value / 60)
  const rest = value % 60
  if (!hours) return `${rest} мин`
  if (!rest) return `${hours} ч`
  return `${hours} ч ${rest} мин`
}

function toDateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
</script>

<style scoped>
.time-composer{display:grid;gap:18px;padding:20px}.time-composer__header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.time-composer__header span,.field-label{display:block;color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.time-composer__header h2{margin:3px 0 0}.project-create-toggle{display:flex;align-items:center;gap:6px;border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:7px 10px;color:var(--text-secondary);background:var(--control-bg);font-size:10px;font-weight:750}.project-create-toggle svg{font-size:13px}.project-form{display:grid;grid-template-columns:minmax(180px,1fr) auto auto;align-items:end;gap:10px;border:1px solid color-mix(in srgb,var(--info) 22%,var(--border-color));border-radius:14px;padding:13px;background:color-mix(in srgb,var(--info) 5%,var(--card-soft))}.entry-form{display:grid;gap:18px}.project-picker,.duration-field{display:grid;gap:8px}.project-picker__head,.project-picker__actions{display:flex;align-items:center;justify-content:space-between;gap:8px}.project-picker__actions>button{display:flex;align-items:center;gap:4px;border:0;padding:3px;color:var(--text-secondary);background:transparent;font-size:10px;font-weight:750}.project-picker__actions>button:hover{color:var(--text-primary)}.project-chips,.duration-presets{display:flex;flex-wrap:wrap;gap:6px}.project-chips button,.duration-presets button,.empty-project{display:flex;align-items:center;gap:7px;min-height:34px;border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:0 11px;color:var(--text-secondary);background:var(--control-bg);font-size:11px;font-weight:700}.project-chips button i{width:8px;height:8px;border-radius:50%;background:var(--project-color)}.project-chips button.active{border-color:color-mix(in srgb,var(--project-color) 58%,var(--border-color));color:var(--text-primary);background:color-mix(in srgb,var(--project-color) 10%,var(--control-bg))}.empty-project{width:max-content;border-style:dashed}.duration-stepper{display:grid;grid-template-columns:42px minmax(130px,190px) 42px;align-items:center;width:max-content;border:1px solid var(--border-color);border-radius:14px;padding:4px;background:var(--control-bg)}.duration-stepper button{display:grid;place-items:center;width:38px;height:38px;border:0;border-radius:10px;color:var(--text-primary);background:var(--card-soft)}.duration-stepper strong{text-align:center;font-size:20px}.duration-presets button.active{color:var(--text-inverse);border-color:var(--accent);background:var(--accent)}.entry-meta{display:grid;grid-template-columns:180px minmax(0,1fr);gap:10px}.entry-form>:deep(.ui-button){justify-self:start}@media(max-width:680px){.time-composer{padding:15px}.time-composer__header,.project-form{display:grid}.project-form{grid-template-columns:1fr}.entry-meta{grid-template-columns:1fr}.entry-form>:deep(.ui-button){width:100%}.duration-stepper{width:100%;grid-template-columns:42px 1fr 42px}}
</style>
