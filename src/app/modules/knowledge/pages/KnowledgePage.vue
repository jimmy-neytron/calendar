<template>
  <section class="knowledge-page">
    <UiPageHeader title="База знаний" eyebrow="Учись · Думай · Создавай" description="Личное пространство для заметок, конспектов и связанных идей.">
      <template #actions><div class="header-stat"><strong>{{ notes.length }}</strong><small>{{ noteWord }}</small></div><UiButton icon="plus" @click="openCreate">Новый материал</UiButton></template>
    </UiPageHeader>
    <div class="knowledge-workspace panel">
      <KnowledgeSidebar v-if="view !== 'library'" v-model:view="view" v-model:active-filter="activeFilter" v-model:active-section="activeSection" :sections="sections" :tags="allTags" :counts="filterCounts" @search-tag="searchTag" @create="openCreate" />
      <KnowledgeOverview v-if="view === 'overview'" :notes="notes" :sections="sections" :completed-ids="completedIds" :completed-count="completedCount" :progress="learningProgress" @create="openCreate" @select="openFromOverview" @select-section="openSection" @open-library="openLibrary" />
      <KnowledgeGraph v-else-if="view === 'graph'" :notes="notes" :active-note-id="activeNoteId" @select="openFromGraph" @select-section="openSection" />
      <section v-else class="knowledge-library">
        <header class="library-toolbar">
          <div class="library-toolbar__views"><button type="button" @click="view='overview'"><UiIcon name="compass"/>Обзор</button><button type="button" @click="view='graph'"><UiIcon name="network"/>Граф</button></div>
          <div class="library-toolbar__filters"><button v-for="filter in libraryFilters" :key="filter.value" type="button" :class="{active:activeFilter===filter.value}" @click="selectLibraryFilter(filter.value)">{{ filter.label }} <b>{{ filter.count }}</b></button></div>
          <label class="library-section-select"><UiIcon name="folder"/><select v-model="activeSection"><option value="all">Все разделы</option><option v-for="section in sections" :key="section.name" :value="section.name">{{ section.name }} · {{ section.count }}</option></select><UiIcon name="down"/></label>
        </header>
        <div class="knowledge-library__body">
          <KnowledgeNoteList ref="noteList" v-model:search="search" :notes="filteredNotes" :active-note-id="activeNoteId" :active-section="activeSection" :active-filter="activeFilter" :completed-ids="completedIds" @select="activeNoteId = $event" />
          <KnowledgeReader :note="activeNote" :related="relatedNotes" :suggestions="connectionSuggestions" :completed="Boolean(activeNote && completedIds.includes(activeNote.id))" @show-overview="view = 'overview'" @edit="openEdit(activeNote)" @delete="requestDelete(activeNote)" @toggle-pinned="togglePinned" @toggle-completed="activeNote && toggleCompleted(activeNote.id)" @search-tag="searchTag" @select="selectRelated" @connect="connectSuggestion" />
        </div>
      </section>
    </div>
    <KnowledgeEditorModal v-model="isEditorOpen" :note="editingNote" :sections="sections.map((section) => section.name)" :initial-section="activeSection === 'all' ? '' : activeSection" @save="saveNote" />
    <UiConfirmModal v-model="isDeleteOpen" title="Удалить материал?" :message="`Материал «${deletingNote?.title || ''}» будет удалён без возможности восстановления.`" confirm-label="Удалить материал" @confirm="confirmDelete" />
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import KnowledgeEditorModal from '../components/KnowledgeEditorModal.vue'
import KnowledgeGraph from '../components/KnowledgeGraph.vue'
import KnowledgeNoteList from '../components/KnowledgeNoteList.vue'
import KnowledgeOverview from '../components/KnowledgeOverview.vue'
import KnowledgeReader from '../components/KnowledgeReader.vue'
import KnowledgeSidebar from '../components/KnowledgeSidebar.vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiConfirmModal from '../../../components/ui/UiConfirmModal.vue'
import UiPageHeader from '../../../components/ui/UiPageHeader.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import { useKnowledgeBase } from '../composables/useKnowledgeBase.js'
import { useNotification } from '../../../composables/ui/useNotification.js'
import { knowledgeStore } from '../stores/knowledge.store.js'
import { pluralizeRu } from '../../../utils/formatters/pluralizeRu.js'

const { notify } = useNotification()
const notes = knowledgeStore.notes
const view = ref('overview')
const activeNoteId = ref('')
const noteList = ref(null)
const isEditorOpen = ref(false)
const editingNote = ref(null)
const isDeleteOpen = ref(false)
const deletingNote = ref(null)
const { search, activeSection, activeFilter, sections, allTags, filteredNotes, completedIds, completedCount, learningProgress, toggleCompleted, getRelatedNotes } = useKnowledgeBase(notes)
const activeNote = computed(() => filteredNotes.value.find((note) => note.id === activeNoteId.value) || filteredNotes.value[0] || null)
const relatedNotes = computed(() => getRelatedNotes(activeNote.value))
const connectionSuggestions = computed(() => {
  if (!activeNote.value) return []
  const relatedIds = new Set(relatedNotes.value.map((note) => note.id))
  return notes.value
    .filter((note) => note.id !== activeNote.value.id && !relatedIds.has(note.id))
    .sort((a, b) => Number(b.section === activeNote.value.section) - Number(a.section === activeNote.value.section))
    .slice(0, 5)
})
const noteWord = computed(() => pluralizeRu(notes.value.length, ['материал', 'материала', 'материалов']))
const filterCounts = computed(() => ({ all: notes.value.length, pinned: notes.value.filter((note) => note.pinned).length, learning: notes.value.filter((note) => !completedIds.value.includes(note.id)).length, completed: completedCount.value }))
const libraryFilters = computed(() => [
  { value: 'all', label: 'Все', count: filterCounts.value.all },
  { value: 'pinned', label: 'Избранное', count: filterCounts.value.pinned },
  { value: 'learning', label: 'Изучаю', count: filterCounts.value.learning },
  { value: 'completed', label: 'Освоено', count: filterCounts.value.completed },
])
watch(filteredNotes, (items) => { if (!items.some((note) => note.id === activeNoteId.value)) activeNoteId.value = items[0]?.id || '' }, { immediate: true })
function openCreate() { editingNote.value = null; isEditorOpen.value = true }
function openEdit(note) { if (note) { editingNote.value = note; isEditorOpen.value = true } }
function openLibrary() { view.value = 'library'; activeFilter.value = 'all'; activeSection.value = 'all' }
function openSection(section) { openLibrary(); activeSection.value = section }
function openFromOverview(id) { openLibrary(); activeNoteId.value = id }
function selectRelated(id) { openLibrary(); search.value = ''; activeNoteId.value = id }
function searchTag(tag) { openLibrary(); search.value = tag }
function selectLibraryFilter(filter) { activeFilter.value = filter; if (filter !== 'all') activeSection.value = 'all' }

function connectSuggestion(targetId) {
  if (!activeNote.value) return
  const target = notes.value.find((note) => note.id === targetId)
  if (!target) return
  const wikiLink = `[[${target.title}]]`
  if (activeNote.value.content.includes(wikiLink)) { notify('Материалы уже связаны', 'info'); return }
  const result = knowledgeStore.updateNote(activeNote.value.id, { ...activeNote.value, content: `${activeNote.value.content.trim()}\n\n${wikiLink}` })
  notify(result.ok ? `Связь с «${target.title}» добавлена` : result.message, result.ok ? 'success' : 'warning')
}

function saveNote(data) {
  const result = data.id ? knowledgeStore.updateNote(data.id, data) : knowledgeStore.addNote(data)
  if (!result.ok) { notify(result.message, 'warning'); return }
  openLibrary()
  search.value = ''
  activeNoteId.value = result.note.id
  isEditorOpen.value = false
  notify(data.id ? 'Материал обновлён' : 'Материал добавлен в базу знаний', 'success')
}

function togglePinned() {
  if (!activeNote.value) return
  const result = knowledgeStore.togglePinned(activeNote.value.id)
  notify(result.ok ? (result.note.pinned ? 'Добавлено в избранное' : 'Удалено из избранного') : result.message, result.ok ? 'info' : 'warning')
}

function requestDelete(note) { if (note) { deletingNote.value = note; isDeleteOpen.value = true } }
async function confirmDelete() {
  const note = deletingNote.value
  isDeleteOpen.value = false
  if (!note) return
  const result = await knowledgeStore.deleteNote(note.id)
  deletingNote.value = null
  notify(result.ok ? 'Материал удалён' : result.message, result.ok ? 'info' : 'danger')
}

async function focusSearch() { view.value = 'library'; await nextTick(); noteList.value?.focus() }
function openFromGraph(id) { openLibrary(); activeNoteId.value = id }
defineExpose({ focusSearch })
</script>

<style scoped>
.knowledge-page{min-height:0;height:calc(100vh - var(--header-height));display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;padding:14px}.header-stat{display:grid;justify-items:end}.header-stat strong{font-size:26px;line-height:1}.header-stat small{color:var(--text-muted)}.knowledge-workspace{min-height:0;height:100%;display:grid;grid-template-columns:218px minmax(0,1fr);overflow:hidden}.knowledge-workspace>:nth-child(2):last-child{grid-column:2/-1}.knowledge-workspace>*{min-height:0}.knowledge-library{grid-column:1/-1;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr)}.library-toolbar{display:grid;grid-template-columns:auto 1fr minmax(175px,220px);align-items:center;gap:12px;min-height:52px;border-bottom:1px solid var(--border-color);padding:7px 10px;background:var(--card-soft)}.library-toolbar__views,.library-toolbar__filters{display:flex;gap:4px}.library-toolbar button{display:flex;align-items:center;gap:5px;min-height:32px;border:1px solid transparent;border-radius:9px;padding:0 9px;color:var(--text-secondary);background:transparent;font-size:9px;font-weight:750}.library-toolbar button:hover,.library-toolbar button.active{color:var(--accent);border-color:var(--accent-border);background:var(--accent-soft)}.library-toolbar button b{min-width:17px;border-radius:99px;padding:2px 4px;color:var(--text-muted);background:var(--control-bg);font-size:8px}.library-toolbar__filters{justify-content:center}.library-section-select{display:grid;grid-template-columns:18px 1fr 15px;align-items:center;gap:5px;border:1px solid var(--border-color);border-radius:9px;padding:0 8px;color:var(--text-muted);background:var(--field-bg)}.library-section-select select{min-width:0;height:34px;border:0;color:var(--text-primary);background:transparent;outline:0;appearance:none;font-size:9px;font-weight:700}.knowledge-library__body{min-height:0;display:grid;grid-template-columns:minmax(280px,330px) minmax(0,1fr);overflow:hidden}@media(max-width:980px){.knowledge-page{height:auto;min-height:calc(100vh - var(--header-height))}.knowledge-workspace{height:760px;grid-template-columns:190px minmax(0,1fr)}.library-toolbar{grid-template-columns:auto 1fr}.library-section-select{grid-column:1/-1}.knowledge-library__body{grid-template-columns:280px minmax(0,1fr)}}@media(max-width:780px){.knowledge-page{padding:10px}.knowledge-workspace{display:block;height:auto}.knowledge-workspace>.knowledge-sidebar{display:none}.knowledge-library__body{display:block}.knowledge-library__body>:first-child{max-height:350px;min-height:350px;border-bottom:1px solid var(--border-color)}.knowledge-library__body>:last-child{min-height:620px}.library-toolbar{display:flex;flex-wrap:wrap}.library-toolbar__filters{order:3;width:100%;justify-content:flex-start;overflow-x:auto}.library-section-select{margin-left:auto}}
</style>
