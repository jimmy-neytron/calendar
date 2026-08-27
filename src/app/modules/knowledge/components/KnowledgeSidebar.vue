<template>
  <aside class="knowledge-sidebar">
    <button class="knowledge-home" :class="{ active: view === 'overview' }" type="button" @click="$emit('update:view', 'overview')">
      <span><UiIcon name="compass" /></span>
      <div><strong>Моя библиотека</strong><small>Обзор и прогресс</small></div>
    </button>
    <button class="knowledge-home knowledge-home--graph" :class="{ active: view === 'graph' }" type="button" @click="$emit('update:view', 'graph')">
      <span><UiIcon name="network" /></span><div><strong>Граф знаний</strong><small>Связи и карта тем</small></div>
    </button>

    <div class="knowledge-sidebar__group">
      <header><span>Быстрый доступ</span></header>
      <button v-for="item in filters" :key="item.value" type="button" :class="{ active: view === 'library' && activeFilter === item.value && activeSection === 'all' }" @click="selectFilter(item.value)">
        <UiIcon :name="item.icon" /><span>{{ item.label }}</span><b>{{ item.count }}</b>
      </button>
    </div>

    <div class="knowledge-sidebar__group knowledge-sidebar__sections">
      <header><span>Разделы</span><button type="button" title="Создать заметку" @click="$emit('create')"><UiIcon name="plus" /></button></header>
      <button v-for="section in sections" :key="section.name" type="button" :class="{ active: view === 'library' && activeSection === section.name }" @click="selectSection(section.name)">
        <UiIcon name="folder" /><span>{{ section.name }}</span><b>{{ section.count }}</b>
      </button>
      <p v-if="!sections.length">Разделы появятся после создания первой заметки.</p>
    </div>

    <div v-if="tags.length" class="knowledge-tags">
      <span>Популярные метки</span>
      <div><button v-for="tag in tags" :key="tag.name" type="button" @click="$emit('search-tag', tag.name)">#{{ tag.name }}</button></div>
    </div>
  </aside>
</template>

<script setup>
import UiIcon from '../../../components/ui/UiIcon.vue'

const props = defineProps({
  view: { type: String, required: true },
  activeFilter: { type: String, required: true },
  activeSection: { type: String, required: true },
  sections: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
  counts: { type: Object, required: true },
})
const emit = defineEmits(['update:view', 'update:activeFilter', 'update:activeSection', 'search-tag', 'create'])

const filters = [
  { value: 'all', label: 'Все материалы', icon: 'notes', get count() { return props.counts.all } },
  { value: 'pinned', label: 'Избранное', icon: 'star', get count() { return props.counts.pinned } },
  { value: 'learning', label: 'Изучаю', icon: 'book', get count() { return props.counts.learning } },
  { value: 'completed', label: 'Освоено', icon: 'check-circle', get count() { return props.counts.completed } },
]

function selectFilter(value) {
  emit('update:view', 'library')
  emit('update:activeSection', 'all')
  emit('update:activeFilter', value)
}

function selectSection(value) {
  emit('update:view', 'library')
  emit('update:activeFilter', 'all')
  emit('update:activeSection', value)
}
</script>

<style scoped>
.knowledge-sidebar { min-width: 0; display: flex; flex-direction: column; gap: 18px; border-right: 1px solid var(--border-color); padding: 14px 10px; background: color-mix(in srgb, var(--card-soft) 82%, var(--bg-primary)); }
.knowledge-home { display: grid; grid-template-columns: 38px 1fr; align-items: center; gap: 10px; border: 1px solid var(--border-color); border-radius: 13px; padding: 9px; color: var(--text-primary); background: var(--card-solid); text-align: left; }
.knowledge-home > span { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 11px; color: var(--accent); background: var(--accent-soft); font-size: 18px; }.knowledge-home strong,.knowledge-home small { display: block; }.knowledge-home strong { font-size: 11px; }.knowledge-home small { margin-top: 2px; color: var(--text-muted); font-size: 9px; }
.knowledge-home.active { border-color: var(--accent-border); box-shadow: 0 8px 26px color-mix(in srgb, var(--accent) 9%, transparent); }
.knowledge-sidebar__group { display: grid; gap: 3px; }.knowledge-sidebar__group header { display: flex; align-items: center; justify-content: space-between; min-height: 24px; padding: 0 8px; color: var(--text-muted); font-size: 8px; font-weight: 850; letter-spacing: .11em; text-transform: uppercase; }.knowledge-sidebar__group header button { width: 23px; height: 23px; display: grid; place-items: center; border: 0; border-radius: 7px; color: var(--accent); background: transparent; }.knowledge-sidebar__group > button { width: 100%; display: grid; grid-template-columns: 18px 1fr auto; align-items: center; gap: 7px; min-height: 34px; border: 1px solid transparent; border-radius: 9px; padding: 0 8px; color: var(--text-secondary); background: transparent; text-align: left; }.knowledge-sidebar__group > button svg { font-size: 14px; }.knowledge-sidebar__group > button span { overflow: hidden; font-size: 10px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.knowledge-sidebar__group > button b { min-width: 19px; border-radius: 99px; padding: 2px 5px; color: var(--text-muted); background: var(--control-bg); font-size: 8px; text-align: center; }.knowledge-sidebar__group > button:hover,.knowledge-sidebar__group > button.active { color: var(--accent); background: var(--accent-soft); }.knowledge-sidebar__sections { min-height: 0; }.knowledge-sidebar__sections > p { margin: 4px 8px; color: var(--text-muted); font-size: 9px; line-height: 1.5; }
.knowledge-tags { margin-top: auto; border-top: 1px solid var(--border-color); padding: 13px 7px 2px; }.knowledge-tags > span { color: var(--text-muted); font-size: 8px; font-weight: 800; text-transform: uppercase; }.knowledge-tags div { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }.knowledge-tags button { border: 0; border-radius: 99px; padding: 4px 6px; color: var(--text-secondary); background: var(--control-bg); font-size: 8px; }
</style>
