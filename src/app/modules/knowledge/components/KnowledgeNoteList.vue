<template>
  <aside class="knowledge-list-pane">
    <div class="knowledge-search"><UiIcon name="search" /><input ref="input" :value="search" type="search" placeholder="Поиск по всей базе…" aria-label="Поиск по базе знаний" @input="$emit('update:search', $event.target.value)"><button v-if="search" type="button" aria-label="Очистить поиск" @click="$emit('update:search', '')"><UiIcon name="close" /></button></div>
    <header class="knowledge-list-pane__header"><div><small>{{ eyebrow }}</small><strong>{{ title }}</strong></div><span>{{ notes.length }}</span></header>
    <div v-if="notes.length" class="knowledge-note-list">
      <button v-for="note in notes" :key="note.id" type="button" :class="['knowledge-note-card', { active: activeNoteId === note.id }]" @click="$emit('select', note.id)">
        <header><span>{{ note.section }}</span><div><UiIcon v-if="completedIds.includes(note.id)" name="check-circle" /><UiIcon v-if="note.pinned" name="star" /></div></header>
        <strong>{{ note.title }}</strong><p>{{ excerpt(note.content) }}</p>
        <footer><span>{{ formatDate(note.updatedAt) }} · {{ readingMinutes(note.content) }} мин</span><b v-for="tag in (note.tags || []).slice(0, 2)" :key="tag">#{{ tag }}</b></footer>
      </button>
    </div>
    <div v-else class="knowledge-list-empty"><UiIcon name="search" /><strong>Ничего не найдено</strong><p>Измени запрос или выбери другой раздел.</p></div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import { estimateReadingMinutes } from '../composables/useKnowledgeBase.js'
const props = defineProps({ notes: { type: Array, default: () => [] }, search: { type: String, default: '' }, activeNoteId: { type: String, default: '' }, activeSection: { type: String, default: 'all' }, activeFilter: { type: String, default: 'all' }, completedIds: { type: Array, default: () => [] } })
defineEmits(['update:search', 'select'])
const input = ref(null)
const filterTitles = { all: 'Все материалы', pinned: 'Избранное', learning: 'Изучаю', completed: 'Освоено' }
const eyebrow = computed(() => props.activeSection === 'all' ? 'Библиотека' : 'Раздел')
const title = computed(() => props.activeSection === 'all' ? filterTitles[props.activeFilter] : props.activeSection)
function excerpt(content) { return String(content || '').replace(/\[\[|\]\]|[#*_>`-]/g, '').replace(/\s+/g, ' ').slice(0, 115) }
function readingMinutes(content) { return estimateReadingMinutes(content) }
function formatDate(value) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(value)) }
function focus() { input.value?.focus() }
defineExpose({ focus })
</script>

<style scoped>
.knowledge-list-pane{min-width:0;display:grid;grid-template-rows:auto auto 1fr;border-right:1px solid var(--border-color);background:var(--card-soft)}.knowledge-search{display:grid;grid-template-columns:17px 1fr 22px;align-items:center;gap:5px;margin:12px 10px 8px;border:1px solid var(--border-color);border-radius:10px;padding:0 8px;color:var(--text-muted);background:var(--field-bg)}.knowledge-search:focus-within{border-color:var(--accent-border);box-shadow:0 0 0 2px var(--accent-soft)}.knowledge-search input{width:100%;min-height:36px;border:0;outline:0;color:var(--text-primary);background:transparent;font-size:10px}.knowledge-search button{border:0;color:var(--text-muted);background:transparent}.knowledge-list-pane__header{display:flex;align-items:center;justify-content:space-between;padding:4px 13px 10px}.knowledge-list-pane__header small,.knowledge-list-pane__header strong{display:block}.knowledge-list-pane__header small{color:var(--accent);font-size:8px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.knowledge-list-pane__header strong{margin-top:2px;font-size:13px}.knowledge-list-pane__header>span{min-width:24px;border-radius:99px;padding:4px 6px;color:var(--text-muted);background:var(--control-bg);font-size:9px;text-align:center}.knowledge-note-list{min-height:0;display:grid;align-content:start;gap:5px;padding:0 7px 8px;overflow-y:auto}.knowledge-note-card{width:100%;display:grid;gap:5px;border:1px solid transparent;border-radius:11px;padding:11px;color:inherit;background:transparent;text-align:left;transition:.16s var(--ease-out)}.knowledge-note-card:hover{border-color:var(--border-color);background:var(--card-solid)}.knowledge-note-card.active{border-color:var(--accent-border);background:var(--accent-soft)}.knowledge-note-card header{display:flex;justify-content:space-between;color:var(--accent);font-size:8px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.knowledge-note-card header div{display:flex;gap:4px}.knowledge-note-card header svg{font-size:12px}.knowledge-note-card>strong{overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.knowledge-note-card>p{min-height:29px;margin:0;overflow:hidden;color:var(--text-secondary);font-size:9px;line-height:1.55}.knowledge-note-card footer{display:flex;align-items:center;gap:4px;color:var(--text-muted);font-size:8px}.knowledge-note-card footer span{margin-right:auto}.knowledge-note-card footer b{border-radius:99px;padding:2px 5px;background:var(--control-bg);font-weight:650}.knowledge-list-empty{display:grid;place-items:center;align-content:center;gap:6px;padding:30px;color:var(--text-muted);text-align:center}.knowledge-list-empty svg{font-size:25px}.knowledge-list-empty p{margin:0;font-size:9px}
</style>
