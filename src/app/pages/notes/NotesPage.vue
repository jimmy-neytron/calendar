<template>
  <section class="notes-page">
    <header class="notes-hero panel">
      <div>
        <span>Личное пространство</span>
        <h1>Заметки</h1>
        <p>Всё важное под рукой — находи по тексту, меткам или разделам.</p>
      </div>
      <div class="notes-hero__actions">
        <div><strong>{{ notes.length }}</strong><small>{{ noteWord }}</small></div>
        <UiButton icon="plus" @click="openCreate">Новая заметка</UiButton>
      </div>
    </header>

    <div class="notes-sections panel" aria-label="Разделы заметок">
      <button
        v-for="section in sections"
        :key="section.value"
        type="button"
        :class="{ active: activeSection === section.value }"
        @click="activeSection = section.value"
      >
        <span>{{ section.label }}</span><b>{{ section.count }}</b>
      </button>
    </div>

    <div class="notes-workspace panel">
      <aside class="notes-list-pane">
        <div class="notes-search">
          <UiIcon name="search" />
          <input ref="searchInput" v-model="search" type="search" placeholder="Поиск по заметкам и меткам" aria-label="Поиск заметок">
          <button v-if="search" type="button" aria-label="Очистить поиск" @click="search = ''"><UiIcon name="close" /></button>
        </div>

        <div class="notes-list-meta">
          <span>{{ filteredNotes.length }} {{ filteredNoteWord }}</span>
          <small v-if="search">по запросу «{{ search }}»</small>
        </div>

        <div v-if="filteredNotes.length" class="notes-list">
          <button
            v-for="note in filteredNotes"
            :key="note.id"
            type="button"
            :class="['note-list-card', { active: activeNote?.id === note.id }]"
            @click="activeNoteId = note.id"
          >
            <header>
              <span>{{ note.section }}</span>
              <UiIcon v-if="note.pinned" name="pin" />
            </header>
            <strong>{{ note.title }}</strong>
            <p>{{ excerpt(note.content) }}</p>
            <footer><span>{{ formatDate(note.updatedAt) }}</span><b v-for="tag in note.tags.slice(0, 2)" :key="tag">#{{ tag }}</b></footer>
          </button>
        </div>

        <div v-else class="notes-empty-list">
          <UiIcon name="notes" />
          <strong>{{ notes.length ? 'Ничего не найдено' : 'Заметок пока нет' }}</strong>
          <p>{{ notes.length ? 'Попробуй изменить запрос или раздел.' : 'Создай первую заметку, чтобы сохранить важное.' }}</p>
          <UiButton v-if="!notes.length" size="sm" icon="plus" @click="openCreate">Создать</UiButton>
        </div>
      </aside>

      <article v-if="activeNote" class="note-reader">
        <header class="note-reader__header">
          <div>
            <div class="note-reader__section"><span>{{ activeNote.section }}</span><b v-if="activeNote.pinned">Закреплена</b></div>
            <h2>{{ activeNote.title }}</h2>
            <p>Обновлено {{ formatLongDate(activeNote.updatedAt) }}</p>
          </div>
          <div class="note-reader__actions">
            <UiIconButton
              icon="pin"
              :label="activeNote.pinned ? 'Открепить' : 'Закрепить'"
              :variant="activeNote.pinned ? 'accent' : 'neutral'"
              @click="togglePinned"
            />
            <UiIconButton icon="edit" label="Редактировать" @click="openEdit(activeNote)" />
            <UiIconButton icon="trash" label="Удалить" variant="danger" @click="requestDelete(activeNote)" />
          </div>
        </header>

        <div v-if="activeNote.tags.length" class="note-reader__tags">
          <button v-for="tag in activeNote.tags" :key="tag" type="button" @click="search = tag">#{{ tag }}</button>
        </div>
        <div class="note-reader__content">{{ activeNote.content }}</div>
      </article>

      <div v-else class="note-reader-empty">
        <span><UiIcon name="notes" /></span>
        <strong>Выбери заметку</strong>
        <p>Она откроется здесь в удобном режиме чтения.</p>
      </div>
    </div>

    <NoteEditorModal
      v-model="isEditorOpen"
      :note="editingNote"
      :initial-section="activeSection === 'all' ? '' : activeSection"
      @save="saveNote"
    />
    <UiConfirmModal
      v-model="isDeleteOpen"
      title="Удалить заметку?"
      :message="`Заметка «${deletingNote?.title || ''}» будет удалена без возможности восстановления.`"
      confirm-label="Удалить заметку"
      @confirm="confirmDelete"
    />
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import NoteEditorModal from '../../components/notes/NoteEditorModal.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiConfirmModal from '../../components/ui/UiConfirmModal.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import UiIconButton from '../../components/ui/UiIconButton.vue'
import { noteStore } from '../../stores/note.store.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { pluralizeRu } from '../../utils/formatters/pluralizeRu.js'

const { notify } = useNotification()
const notes = noteStore.notes
const search = ref('')
const activeSection = ref('all')
const activeNoteId = ref('')
const searchInput = ref(null)
const isEditorOpen = ref(false)
const editingNote = ref(null)
const isDeleteOpen = ref(false)
const deletingNote = ref(null)

const sections = computed(() => {
  const counts = new Map()
  notes.value.forEach((note) => counts.set(note.section, (counts.get(note.section) || 0) + 1))
  return [
    { value: 'all', label: 'Все заметки', count: notes.value.length },
    ...[...counts.entries()].sort(([a], [b]) => a.localeCompare(b, 'ru')).map(([value, count]) => ({ value, label: value, count })),
  ]
})
const filteredNotes = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('ru')
  return notes.value.filter((note) => {
    if (activeSection.value !== 'all' && note.section !== activeSection.value) return false
    if (!query) return true
    return [note.title, note.content, note.section, ...(note.tags || [])].join(' ').toLocaleLowerCase('ru').includes(query)
  })
})
const activeNote = computed(() => (
  filteredNotes.value.find((note) => note.id === activeNoteId.value) || filteredNotes.value[0] || null
))
const noteWord = computed(() => pluralizeRu(notes.value.length, ['заметка', 'заметки', 'заметок']))
const filteredNoteWord = computed(() => pluralizeRu(filteredNotes.value.length, ['заметка', 'заметки', 'заметок']))

watch(filteredNotes, (items) => {
  if (!items.some((note) => note.id === activeNoteId.value)) activeNoteId.value = items[0]?.id || ''
}, { immediate: true })

function openCreate() { editingNote.value = null; isEditorOpen.value = true }
function openEdit(note) { editingNote.value = note; isEditorOpen.value = true }

function saveNote(data) {
  const result = data.id ? noteStore.updateNote(data.id, data) : noteStore.addNote(data)
  if (!result.ok) { notify(result.message, 'warning'); return }
  activeNoteId.value = result.note.id
  isEditorOpen.value = false
  notify(data.id ? 'Заметка обновлена' : 'Заметка создана', 'success')
}

function togglePinned() {
  const result = noteStore.togglePinned(activeNote.value.id)
  notify(result.ok ? (result.note.pinned ? 'Заметка закреплена' : 'Заметка откреплена') : result.message, result.ok ? 'info' : 'warning')
}

function requestDelete(note) { deletingNote.value = note; isDeleteOpen.value = true }
async function confirmDelete() {
  const note = deletingNote.value
  isDeleteOpen.value = false
  if (!note) return
  const result = await noteStore.deleteNote(note.id)
  deletingNote.value = null
  notify(result.ok ? 'Заметка удалена' : result.message, result.ok ? 'info' : 'danger')
}

function excerpt(content) { return String(content || '').replace(/\s+/g, ' ').slice(0, 120) }
function formatDate(value) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(value)) }
function formatLongDate(value) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }

async function focusSearch() { await nextTick(); searchInput.value?.focus() }
defineExpose({ focusSearch })
</script>

<style scoped>
.notes-page { display: grid; gap: 12px; padding: 14px; }
.notes-hero { display: flex; align-items: end; justify-content: space-between; gap: 18px; padding: 20px; }
.notes-hero > div:first-child > span { color: var(--accent); font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.notes-hero h1 { margin: 3px 0 5px; }
.notes-hero p { margin: 0; color: var(--text-secondary); }
.notes-hero__actions { display: flex; align-items: center; gap: 14px; }
.notes-hero__actions > div { display: grid; justify-items: end; }
.notes-hero__actions strong { font-size: 28px; line-height: 1; }.notes-hero__actions small { color: var(--text-muted); }
.notes-sections { display: flex; gap: 6px; padding: 9px; overflow-x: auto; }
.notes-sections button { display: flex; align-items: center; gap: 7px; min-height: 31px; border: 1px solid var(--border-color); border-radius: var(--radius-pill); padding: 0 10px; color: var(--text-secondary); background: var(--control-bg); white-space: nowrap; }
.notes-sections button b { min-width: 18px; border-radius: 99px; padding: 2px 5px; color: var(--text-muted); background: var(--card-soft); font-size: 9px; }
.notes-sections button.active { border-color: var(--accent-border); color: var(--text-inverse); background: var(--accent); }.notes-sections button.active b { color: var(--accent); background: var(--text-inverse); }
.notes-workspace { min-height: 620px; display: grid; grid-template-columns: minmax(280px, 350px) minmax(0, 1fr); overflow: hidden; }
.notes-list-pane { min-width: 0; display: grid; grid-template-rows: auto auto 1fr; border-right: 1px solid var(--border-color); background: var(--card-soft); }
.notes-search { display: grid; grid-template-columns: 18px 1fr 24px; align-items: center; gap: 5px; margin: 11px; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0 8px; color: var(--text-muted); background: var(--field-bg); }
.notes-search:focus-within { border-color: var(--accent-border); box-shadow: 0 0 0 2px var(--accent-soft); }
.notes-search input { width: 100%; min-height: 38px; border: 0; outline: 0; color: var(--text-primary); background: transparent; }.notes-search button { border: 0; color: var(--text-muted); background: transparent; }
.notes-list-meta { display: flex; justify-content: space-between; gap: 6px; padding: 0 12px 9px; color: var(--text-muted); font-size: 10px; }.notes-list-meta small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notes-list { min-height: 0; display: grid; align-content: start; gap: 5px; padding: 0 7px 8px; overflow-y: auto; }
.note-list-card { width: 100%; display: grid; gap: 5px; border: 1px solid transparent; border-radius: var(--radius-md); padding: 11px; color: inherit; background: transparent; text-align: left; transition: .16s var(--ease-out); }
.note-list-card:hover { border-color: var(--border-color); background: var(--control-bg); }.note-list-card.active { border-color: var(--accent-border); background: var(--accent-soft); }
.note-list-card header { display: flex; justify-content: space-between; color: var(--accent); font-size: 9px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }.note-list-card header svg { font-size: 13px; }
.note-list-card > strong { overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }.note-list-card > p { min-height: 32px; margin: 0; overflow: hidden; color: var(--text-secondary); font-size: 10px; line-height: 1.5; }
.note-list-card footer { display: flex; align-items: center; gap: 4px; color: var(--text-muted); font-size: 9px; }.note-list-card footer span { margin-right: auto; }.note-list-card footer b { border-radius: 99px; padding: 2px 5px; background: var(--control-bg); font-weight: 650; }
.notes-empty-list, .note-reader-empty { display: grid; place-items: center; align-content: center; gap: 6px; padding: 30px; color: var(--text-muted); text-align: center; }.notes-empty-list > svg { font-size: 28px; }.notes-empty-list p, .note-reader-empty p { margin: 0; }
.note-reader { min-width: 0; padding: clamp(20px, 4vw, 54px); background: var(--card-solid); }
.note-reader__header { display: flex; align-items: start; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 18px; }
.note-reader__header h2 { max-width: 760px; margin: 7px 0 5px; font-size: clamp(24px, 3vw, 36px); line-height: 1.16; }.note-reader__header p { margin: 0; color: var(--text-muted); font-size: 10px; }
.note-reader__section { display: flex; align-items: center; gap: 7px; color: var(--accent); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; }.note-reader__section b { border-radius: 99px; padding: 3px 6px; color: var(--warning); background: color-mix(in srgb, var(--warning) 12%, transparent); font-size: 8px; letter-spacing: 0; }
.note-reader__actions { display: flex; gap: 5px; }.note-reader__tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 16px; }.note-reader__tags button { border: 0; border-radius: 99px; padding: 5px 8px; color: var(--accent); background: var(--accent-soft); font-size: 10px; }
.note-reader__content { max-width: 820px; padding: 26px 0 60px; color: var(--text-primary); font-size: 15px; line-height: 1.85; white-space: pre-wrap; overflow-wrap: anywhere; }
.note-reader-empty { background: var(--card-solid); }.note-reader-empty > span { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 16px; color: var(--accent); background: var(--accent-soft); font-size: 24px; }
@media (max-width: 780px) { .notes-page { padding: 10px; }.notes-hero { align-items: stretch; flex-direction: column; padding: 15px; }.notes-hero__actions { justify-content: space-between; }.notes-workspace { grid-template-columns: 1fr; }.notes-list-pane { max-height: 390px; border-right: 0; border-bottom: 1px solid var(--border-color); }.note-reader { padding: 20px 16px; }.note-reader__header { flex-direction: column; }.note-reader__actions { align-self: flex-end; } }
</style>
