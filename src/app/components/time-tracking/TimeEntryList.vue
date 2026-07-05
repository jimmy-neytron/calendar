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
      <article
        v-for="entry in entries"
        :key="entry.id"
        class="time-entry"
        :style="{ '--project-color': projectById(entry.projectId)?.color || 'var(--text-muted)' }"
      >
        <i />
        <form
          v-if="editingEntryId === entry.id"
          class="time-entry-edit"
          @submit.prevent="saveEdit"
        >
          <div class="time-entry-edit__grid">
            <label>
              <span>Проект</span>
              <select v-model="editProjectId">
                <option
                  v-for="project in projects"
                  :key="project.id"
                  :value="project.id"
                >
                  {{ project.name }}
                </option>
              </select>
            </label>
            <label>
              <span>Дата</span>
              <input v-model="editDate" type="date">
            </label>
            <label>
              <span>Часы</span>
              <input
                v-model="editHours"
                type="text"
                inputmode="decimal"
                placeholder="1.5"
              >
            </label>
          </div>
          <label>
            <span>Комментарий</span>
            <textarea v-model="editNote" rows="3" />
          </label>
          <div class="time-entry-edit__actions">
            <button type="submit">
              <UiIcon name="check" /> Сохранить
            </button>
            <button type="button" @click="cancelEdit">
              <UiIcon name="close" /> Отмена
            </button>
          </div>
        </form>
        <div v-else class="time-entry__body">
          <div>
            <strong>{{ projectById(entry.projectId)?.name || 'Проект удалён' }}</strong>
            <span>{{ formatDuration(entry.minutes) }}</span>
          </div>
          <div v-if="entry.note" class="markdown-note" v-html="renderMarkdown(entry.note)" />
          <small>{{ formatDate(entry.date) }}</small>
        </div>
        <div class="time-entry__actions">
          <UiIconButton
            v-if="editingEntryId !== entry.id"
            icon="edit"
            label="Редактировать запись времени"
            size="sm"
            variant="accent"
            @click="startEdit(entry)"
          />
          <UiIconButton
            icon="trash"
            label="Удалить запись времени"
            size="sm"
            variant="danger"
            @click="emit('remove', entry.id)"
          />
        </div>
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
import { ref } from 'vue'
import type { TimeEntry, TimeProject } from '../../stores/timeTracking.store'
import UiIcon from '../ui/UiIcon.vue'
import UiIconButton from '../ui/UiIconButton.vue'

const props = defineProps<{
  entries: TimeEntry[]
  projects: TimeProject[]
}>()

const emit = defineEmits<{
  remove: [id: string]
  update: [payload: {
    id: string
    projectId: string
    date: string
    minutes: number
    note: string
    onSaved: () => void
  }]
}>()

const editingEntryId = ref('')
const editProjectId = ref('')
const editDate = ref('')
const editHours = ref('')
const editNote = ref('')

function startEdit(entry: TimeEntry) {
  editingEntryId.value = entry.id
  editProjectId.value = entry.projectId
  editDate.value = entry.date
  editHours.value = toHoursInput(entry.minutes)
  editNote.value = entry.note
}

function cancelEdit() {
  editingEntryId.value = ''
  editProjectId.value = ''
  editDate.value = ''
  editHours.value = ''
  editNote.value = ''
}

function saveEdit() {
  if (!editingEntryId.value) return
  const hours = Number(editHours.value.replace(',', '.'))
  emit('update', {
    id: editingEntryId.value,
    projectId: editProjectId.value,
    date: editDate.value,
    minutes: Number.isFinite(hours) ? Math.round(hours * 60) : 0,
    note: editNote.value,
    onSaved: cancelEdit,
  })
}

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

function toHoursInput(minutes: number) {
  return String(Math.round((minutes / 60) * 100) / 100)
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

function renderMarkdown(value: string) {
  const lines = value.replace(/\r\n/g, '\n').split('\n')
  const blocks: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    if (isTableStart(lines, index)) {
      const rows: string[][] = []
      rows.push(splitTableRow(lines[index]))
      index += 2

      while (index < lines.length && isTableRow(lines[index])) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }

      const [head = [], ...body] = rows
      blocks.push(`<table><thead><tr>${head.map((cell) => `<th>${renderInline(cell)}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`)
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(`<li>${renderInline(lines[index].replace(/^\s*[-*]\s+/, ''))}</li>`)
        index += 1
      }
      blocks.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(`<li>${renderInline(lines[index].replace(/^\s*\d+\.\s+/, ''))}</li>`)
        index += 1
      }
      blocks.push(`<ol>${items.join('')}</ol>`)
      continue
    }

    const paragraph: string[] = []
    while (
      index < lines.length
      && lines[index].trim()
      && !isTableStart(lines, index)
      && !/^\s*[-*]\s+/.test(lines[index])
      && !/^\s*\d+\.\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index])
      index += 1
    }
    blocks.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`)
  }

  return blocks.join('')
}

function renderInline(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
}

function isTableStart(lines: string[], index: number) {
  return isTableRow(lines[index]) && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] || '')
}

function isTableRow(line = '') {
  return line.includes('|')
}

function splitTableRow(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
</script>

<style scoped>
.time-list{display:grid;gap:14px;padding:18px}.time-list__header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border-color);padding-bottom:13px}.time-list__header span{color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.time-list__header h2{margin:3px 0 0;font-size:20px}.time-list__header small{border:1px solid var(--border-color);border-radius:10px;padding:6px 9px;color:var(--text-muted);background:var(--control-bg)}.time-list__items{display:grid;gap:8px}.time-entry{display:grid;grid-template-columns:8px minmax(0,1fr) auto;gap:12px;align-items:start;border:1px solid var(--border-color);border-radius:14px;padding:12px;background:var(--card-soft);transition:.18s var(--ease-out)}.time-entry:hover{border-color:color-mix(in srgb,var(--project-color) 42%,var(--border-color));transform:translateY(-1px)}.time-entry>i{width:8px;min-height:100%;border-radius:8px;background:linear-gradient(180deg,var(--project-color),color-mix(in srgb,var(--project-color) 35%,var(--control-bg)))}.time-entry__body{min-width:0}.time-entry__body>div{display:flex;align-items:baseline;flex-direction: column;justify-content:space-between;gap:10px}.time-entry__body strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.time-entry__body span{flex:0 0 auto;border:1px solid color-mix(in srgb,var(--project-color) 32%,var(--border-color));border-radius:10px;padding:4px 7px;color:var(--text-primary);background:color-mix(in srgb,var(--project-color) 8%,var(--control-bg));font-size:12px;font-weight:850}.time-entry__body small{display:block;margin-top:6px;color:var(--text-muted);font-size:9px}.time-entry__actions{display:flex;gap:6px}.time-entry-edit{display:grid;gap:9px;min-width:0}.time-entry-edit__grid{display:grid;grid-template-columns:minmax(120px,1fr) 130px 86px;gap:8px}.time-entry-edit label{display:grid;gap:4px;min-width:0}.time-entry-edit label span{color:var(--text-muted);font-size:9px;font-weight:800;text-transform:uppercase}.time-entry-edit input,.time-entry-edit select,.time-entry-edit textarea{width:100%;min-height:34px;border:1px solid var(--border-color);border-radius:9px;padding:0 9px;color:var(--text-primary);background:var(--field-bg);outline:none}.time-entry-edit textarea{min-height:68px;padding-top:8px;resize:vertical}.time-entry-edit input:focus,.time-entry-edit select:focus,.time-entry-edit textarea:focus{border-color:var(--accent-border);background:var(--field-bg-focus);box-shadow:0 0 0 2px var(--accent-soft)}.time-entry-edit__actions{display:flex;flex-wrap:wrap;gap:6px}.time-entry-edit__actions button{display:flex;align-items:center;gap:5px;min-height:30px;border:1px solid var(--border-color);border-radius:9px;padding:0 10px;color:var(--text-secondary);background:var(--control-bg);font-size:11px;font-weight:750}.time-entry-edit__actions button:first-child{color:var(--text-inverse);border-color:var(--accent);background:var(--accent)}.time-list__empty{display:grid;justify-items:center;gap:5px;padding:42px 16px;text-align:center}.time-list__empty>span{display:grid;place-items:center;width:48px;height:48px;margin-bottom:5px;border-radius:15px;color:var(--info);background:color-mix(in srgb,var(--info) 10%,var(--control-bg));font-size:22px}.time-list__empty p{max-width:360px;margin:0;color:var(--text-muted);font-size:11px}.markdown-note{margin:8px 0 0;color:var(--text-secondary);font-size:11px;line-height:1.55;overflow-x:auto}.markdown-note :deep(p){margin:0}.markdown-note :deep(p+p),.markdown-note :deep(ul),.markdown-note :deep(ol),.markdown-note :deep(table){margin:6px 0 0}.markdown-note :deep(ul),.markdown-note :deep(ol){padding-left:18px}.markdown-note :deep(code){border:1px solid var(--border-color);border-radius:5px;padding:1px 4px;background:var(--control-bg);font-size:10px}.markdown-note :deep(table){width:100%;border-collapse:collapse;font-size:10px}.markdown-note :deep(th),.markdown-note :deep(td){border:1px solid var(--border-color);padding:5px 6px;text-align:left;vertical-align:top}.markdown-note :deep(th){color:var(--text-primary);background:var(--control-bg);font-weight:800}@media(max-width:680px){.time-list{padding:15px}.time-entry{grid-template-columns:6px minmax(0,1fr) auto;padding:10px}.time-entry>i{width:6px}.time-entry__body>div{align-items:flex-start;display:grid}.time-entry-edit__grid{grid-template-columns:1fr}.time-entry__actions{display:grid}}
</style>
