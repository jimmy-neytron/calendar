<template>
  <UiModal :model-value="modelValue" title="Настроить «Сегодня»" eyebrow="Персональная сводка" width="620px" @update:model-value="$emit('update:modelValue', $event)">
    <p class="today-customize__intro">Оставьте в сводке только нужное и расположите важные карточки выше.</p>
    <div class="today-customize__list">
      <article v-for="(section, index) in orderedSections" :key="section.id">
        <span><UiIcon :name="section.icon" /></span>
        <div><strong>{{ section.title }}</strong><small>{{ section.description }}</small></div>
        <UiIconButton icon="up" :label="`Поднять ${section.title}`" size="sm" :disabled="index === 0" @click="$emit('move', section.id, -1)" />
        <UiIconButton icon="down" :label="`Опустить ${section.title}`" size="sm" :disabled="index === orderedSections.length - 1" @click="$emit('move', section.id, 1)" />
        <UiToggle :model-value="!hiddenSectionIds.has(section.id)" :label="`Показывать ${section.title}`" @update:model-value="$emit('visibility', section.id, $event)" />
      </article>
    </div>
    <footer><UiButton variant="ghost" @click="$emit('reset')">Сбросить</UiButton><UiButton @click="$emit('update:modelValue', false)">Готово</UiButton></footer>
  </UiModal>
</template>

<script setup lang="ts">
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiIconButton from '../../../components/ui/UiIconButton.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiToggle from '../../../components/ui/UiToggle.vue'
import type { TodaySection } from '../composables/useTodaySections'

defineProps<{ modelValue: boolean; orderedSections: TodaySection[]; hiddenSectionIds: Set<string> }>()
defineEmits<{
  'update:modelValue': [value: boolean]
  move: [id: string, direction: -1 | 1]
  visibility: [id: string, visible: boolean]
  reset: []
}>()
</script>

<style scoped>
.today-customize__intro{margin:0 0 14px;color:var(--text-secondary);font-size:11px}.today-customize__list{display:grid;gap:6px}.today-customize__list article{display:grid;grid-template-columns:38px minmax(0,1fr) 30px 30px 44px;align-items:center;gap:8px;border:1px solid var(--border-color);border-radius:13px;padding:8px;background:var(--card-soft)}.today-customize__list article>span{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;color:var(--accent);background:var(--accent-soft)}.today-customize__list strong,.today-customize__list small{display:block}.today-customize__list small{margin-top:2px;color:var(--text-muted);font-size:9px}footer{display:flex;justify-content:space-between;border-top:1px solid var(--border-color);margin-top:16px;padding-top:12px}@media(max-width:560px){.today-customize__list article{grid-template-columns:34px minmax(0,1fr) 44px}.today-customize__list article>:nth-child(3),.today-customize__list article>:nth-child(4){display:none}}
</style>
