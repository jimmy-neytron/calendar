<template>
  <section class="knowledge-overview">
    <header class="knowledge-welcome">
      <div><span>Твоё пространство знаний</span><h2>Что изучаем сегодня?</h2><p>Собирай идеи, связывай заметки и превращай информацию в понятную систему.</p></div>
      <UiButton icon="plus" @click="$emit('create')">Новый материал</UiButton>
    </header>

    <div class="knowledge-stats">
      <article><span class="stat-icon"><UiIcon name="book" /></span><div><small>В библиотеке</small><strong>{{ notes.length }}</strong><p>материалов</p></div></article>
      <article><span class="stat-icon stat-icon--success"><UiIcon name="check-circle" /></span><div><small>Освоено</small><strong>{{ completedCount }}</strong><p>{{ progress }}% библиотеки</p></div></article>
      <article><span class="stat-icon stat-icon--warning"><UiIcon name="folder" /></span><div><small>Разделы</small><strong>{{ sections.length }}</strong><p>тем знаний</p></div></article>
      <article class="knowledge-progress-card"><div><small>Общий прогресс</small><strong>{{ progress }}%</strong></div><span><i :style="{ width: `${progress}%` }" /></span><p>{{ progressMessage }}</p></article>
    </div>

    <div v-if="notes.length" class="knowledge-overview__grid">
      <section class="continue-section">
        <header><div><small>Продолжить</small><h3>Недавние материалы</h3></div><button type="button" @click="$emit('open-library')">Вся библиотека <UiIcon name="right" /></button></header>
        <button v-for="note in recentNotes" :key="note.id" class="continue-card" type="button" @click="$emit('select', note.id)">
          <span><UiIcon :name="isCompleted(note.id) ? 'check-circle' : 'book'" /></span>
          <div><small>{{ note.section }} · {{ readingMinutes(note.content) }} мин</small><strong>{{ note.title }}</strong><p>{{ excerpt(note.content) }}</p></div>
          <UiIcon name="right" />
        </button>
      </section>

      <section class="section-cloud">
        <header><small>Навигация</small><h3>Разделы знаний</h3></header>
        <button v-for="(section, index) in sections.slice(0, 6)" :key="section.name" type="button" @click="$emit('select-section', section.name)">
          <span :style="{ '--section-index': index }"><UiIcon name="folder" /></span>
          <div><strong>{{ section.name }}</strong><small>{{ section.count }} материалов</small></div>
          <UiIcon name="right" />
        </button>
        <div v-if="!sections.length" class="section-cloud__empty">Создай первый материал и укажи для него раздел.</div>
      </section>
    </div>

    <div v-else class="knowledge-first-note">
      <span><UiIcon name="sparkles" /></span><h3>Начни строить свою базу знаний</h3><p>Создай конспект, учебный план или обычную заметку. Позже их можно связать конструкцией <b>[[Название заметки]]</b>.</p><UiButton icon="plus" @click="$emit('create')">Создать первый материал</UiButton>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import { estimateReadingMinutes } from '../composables/useKnowledgeBase.js'

const props = defineProps({
  notes: { type: Array, default: () => [] },
  sections: { type: Array, default: () => [] },
  completedIds: { type: Array, default: () => [] },
  completedCount: { type: Number, default: 0 },
  progress: { type: Number, default: 0 },
})
defineEmits(['create', 'select', 'select-section', 'open-library'])

const recentNotes = computed(() => props.notes.slice(0, 4))
const progressMessage = computed(() => {
  if (!props.notes.length) return 'Добавь первый материал'
  if (props.progress === 100) return 'Всё освоено — отличный результат'
  if (props.progress >= 50) return 'Больше половины уже позади'
  return 'Отмечай изученные материалы'
})

function isCompleted(id) { return props.completedIds.includes(id) }
function readingMinutes(content) { return estimateReadingMinutes(content) }
function excerpt(content) { return String(content || '').replace(/\[\[|\]\]|[#*_>`-]/g, '').replace(/\s+/g, ' ').slice(0, 100) }
</script>

<style scoped>
.knowledge-overview { min-width: 0; display: grid; align-content: start; gap: 18px; padding: clamp(18px, 3vw, 34px); overflow-y: auto; background: var(--card-solid); }.knowledge-welcome { display: flex; align-items: center; justify-content: space-between; gap: 20px; border: 1px solid var(--accent-border); border-radius: 18px; padding: 20px 22px; background: radial-gradient(circle at 90% 10%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 36%), linear-gradient(135deg, var(--accent-soft), var(--card-soft)); }.knowledge-welcome span,.continue-section header small,.section-cloud header small { color: var(--accent); font-size: 8px; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; }.knowledge-welcome h2 { margin: 4px 0 5px; font-size: clamp(22px, 3vw, 32px); }.knowledge-welcome p { max-width: 610px; margin: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
.knowledge-stats { display: grid; grid-template-columns: repeat(3, minmax(120px, .7fr)) minmax(220px, 1.4fr); gap: 9px; }.knowledge-stats article { min-width: 0; display: flex; align-items: center; gap: 10px; border: 1px solid var(--border-color); border-radius: 14px; padding: 12px; background: var(--card-soft); }.stat-icon { flex: 0 0 auto; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 11px; color: var(--accent); background: var(--accent-soft); font-size: 16px; }.stat-icon--success { color: var(--success); background: color-mix(in srgb, var(--success) 11%, transparent); }.stat-icon--warning { color: var(--warning); background: color-mix(in srgb, var(--warning) 11%, transparent); }.knowledge-stats small,.knowledge-stats p { color: var(--text-muted); font-size: 8px; }.knowledge-stats strong { display: block; margin-top: 1px; font-size: 20px; }.knowledge-stats p { margin: 0; }.knowledge-progress-card { display: grid !important; align-content: center; gap: 7px !important; }.knowledge-progress-card > div { display: flex; align-items: center; justify-content: space-between; }.knowledge-progress-card > div strong { font-size: 14px; }.knowledge-progress-card > span { height: 6px; border-radius: 99px; background: var(--field-bg); overflow: hidden; }.knowledge-progress-card i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--accent), var(--success)); transition: width .3s var(--ease-out); }
.knowledge-overview__grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(240px, .8fr); gap: 12px; }.continue-section,.section-cloud { min-width: 0; display: grid; align-content: start; gap: 7px; border: 1px solid var(--border-color); border-radius: 16px; padding: 14px; background: var(--card-soft); }.continue-section > header,.section-cloud > header { display: flex; align-items: center; justify-content: space-between; padding: 2px 3px 8px; }.continue-section h3,.section-cloud h3 { margin: 2px 0 0; font-size: 14px; }.continue-section header button { display: flex; align-items: center; gap: 4px; border: 0; color: var(--accent); background: transparent; font-size: 9px; font-weight: 750; }.continue-card { width: 100%; display: grid; grid-template-columns: 38px minmax(0, 1fr) 16px; align-items: center; gap: 10px; border: 1px solid var(--border-color); border-radius: 12px; padding: 10px; color: inherit; background: var(--card-solid); text-align: left; transition: .16s var(--ease-out); }.continue-card:hover { border-color: var(--accent-border); transform: translateY(-1px); }.continue-card > span { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 10px; color: var(--accent); background: var(--accent-soft); }.continue-card > div { min-width: 0; }.continue-card small { color: var(--accent); font-size: 8px; }.continue-card strong { display: block; margin: 2px 0; overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.continue-card p { margin: 0; overflow: hidden; color: var(--text-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.continue-card > svg { color: var(--text-muted); font-size: 13px; }
.section-cloud > button { display: grid; grid-template-columns: 34px minmax(0, 1fr) 14px; align-items: center; gap: 9px; border: 0; border-radius: 10px; padding: 8px; color: inherit; background: transparent; text-align: left; }.section-cloud > button:hover { background: var(--control-bg); }.section-cloud > button > span { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; color: hsl(calc(255 + var(--section-index) * 22) 65% 58%); background: color-mix(in srgb, currentColor 11%, transparent); }.section-cloud strong,.section-cloud small { display: block; }.section-cloud strong { overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.section-cloud small { margin-top: 2px; color: var(--text-muted); font-size: 8px; }.section-cloud > button > svg { color: var(--text-muted); font-size: 12px; }.section-cloud__empty { padding: 22px 8px; color: var(--text-muted); font-size: 9px; text-align: center; }
.knowledge-first-note { min-height: 300px; display: grid; place-items: center; align-content: center; gap: 8px; border: 1px dashed var(--accent-border); border-radius: 18px; padding: 30px; background: var(--accent-soft); text-align: center; }.knowledge-first-note > span { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 16px; color: var(--accent); background: var(--card-solid); font-size: 22px; }.knowledge-first-note h3 { margin: 5px 0 0; }.knowledge-first-note p { max-width: 520px; margin: 0 0 8px; color: var(--text-secondary); line-height: 1.6; }
@media (max-width: 1050px) { .knowledge-stats { grid-template-columns: repeat(3, 1fr); }.knowledge-progress-card { grid-column: 1 / -1; }.knowledge-overview__grid { grid-template-columns: 1fr; } }
@media (max-width: 650px) { .knowledge-welcome { align-items: stretch; flex-direction: column; }.knowledge-stats { grid-template-columns: 1fr 1fr; }.knowledge-stats article:nth-child(3),.knowledge-progress-card { grid-column: 1 / -1; } }
</style>
