<template>
  <UiModal
    :model-value="modelValue"
    title="Настройка меню"
    eyebrow="Персональная навигация"
    width="680px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="sidebar-customize__intro">
      <div>
        <strong>Оставьте под рукой только нужное</strong>
        <p>Скрытые разделы останутся доступны через «Все разделы». Звёздочкой выберите до четырёх кнопок для телефона.</p>
      </div>
      <span>{{ visibleCount }} из {{ totalCount }}</span>
    </div>

    <div class="sidebar-customize__groups">
      <section v-for="group in orderedGroups" :key="group.label" class="sidebar-customize__group">
        <header>
          <span>{{ group.label }}</span>
          <small>{{ group.items.filter(isVisible).length }}/{{ group.items.length }}</small>
        </header>

        <div class="sidebar-customize__items">
          <article
            v-for="(item, index) in group.items"
            :key="item.name"
            class="sidebar-customize__item"
            :class="{ 'sidebar-customize__item--hidden': !isVisible(item), 'sidebar-customize__item--dragging': draggedId === item.name }"
            :draggable="!item.fixed"
            @dragstart="startDrag(item.name, group.label)"
            @dragend="stopDrag"
            @dragover.prevent
            @drop="dropOn(item.name, group.label)"
          >
            <span class="sidebar-customize__drag" :class="{ disabled: item.fixed }" title="Перетащить">⋮⋮</span>
            <span class="sidebar-customize__icon"><UiIcon :name="item.icon" /></span>
            <span class="sidebar-customize__copy">
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </span>

            <div class="sidebar-customize__order" aria-label="Изменить порядок">
              <UiIconButton icon="up" :label="`Поднять ${item.label}`" size="sm" :disabled="item.fixed || index === 0" @click="move(group, index, -1)" />
              <UiIconButton icon="down" :label="`Опустить ${item.label}`" size="sm" :disabled="item.fixed || index === group.items.length - 1" @click="move(group, index, 1)" />
            </div>

            <button
              class="sidebar-customize__favorite"
              :class="{ active: isFavorite(item) }"
              type="button"
              :disabled="!isVisible(item) || (!isFavorite(item) && favoriteCount >= 4)"
              :title="isFavorite(item) ? 'Убрать с мобильной панели' : 'Добавить на мобильную панель'"
              :aria-label="isFavorite(item) ? `Убрать ${item.label} из мобильных` : `Добавить ${item.label} в мобильные`"
              @click="toggleFavorite(item)"
            >
              <UiIcon name="star" />
            </button>

            <UiToggle
              :model-value="isVisible(item)"
              :disabled="item.fixed"
              :label="item.fixed ? `${item.label} всегда отображается` : `Показывать ${item.label}`"
              @update:model-value="toggleVisibility(item, $event)"
            />
          </article>
        </div>
      </section>
    </div>

    <p v-if="error" class="sidebar-customize__error">{{ error }}</p>

    <footer class="sidebar-customize__footer">
      <UiButton variant="ghost" :disabled="saving" @click="$emit('reset')">Сбросить</UiButton>
      <span v-if="saving">Сохраняем…</span>
      <span v-else>Настройка привязана к вашему аккаунту</span>
      <UiButton @click="$emit('update:modelValue', false)">Готово</UiButton>
    </footer>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SidebarGroup, SidebarSection } from '../../navigation/sidebarSections'
import type { SidebarPreferences } from '../../composables/preferences/useSidebarPreferences'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiModal from '../ui/UiModal.vue'
import UiToggle from '../ui/UiToggle.vue'

const props = defineProps<{
  modelValue: boolean
  groups: SidebarGroup[]
  preferences: SidebarPreferences
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [value: SidebarPreferences]
  reset: []
}>()

const draft = ref<SidebarPreferences>(clonePreferences(props.preferences))
const draggedId = ref('')
const draggedGroup = ref('')

watch(
  () => props.preferences,
  (value) => { draft.value = clonePreferences(value) },
  { deep: true },
)

const orderedGroups = computed(() => props.groups.map((group) => ({
  ...group,
  items: [...group.items].sort((a, b) => orderIndex(a.name) - orderIndex(b.name)),
})))
const totalCount = computed(() => props.groups.reduce((count, group) => count + group.items.length, 0))
const visibleCount = computed(() => props.groups.flatMap((group) => group.items).filter(isVisible).length)
const favoriteCount = computed(() => draft.value.mobileFavoriteIds.length)

function clonePreferences(value: SidebarPreferences): SidebarPreferences {
  return {
    visibleSectionIds: [...value.visibleSectionIds],
    sectionOrder: [...value.sectionOrder],
    mobileFavoriteIds: [...value.mobileFavoriteIds],
  }
}

function orderIndex(id: string) {
  const index = draft.value.sectionOrder.indexOf(id)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

function isVisible(item: SidebarSection) {
  return item.fixed || draft.value.visibleSectionIds.includes(item.name)
}

function isFavorite(item: SidebarSection) {
  return draft.value.mobileFavoriteIds.includes(item.name)
}

function commit() {
  emit('save', clonePreferences(draft.value))
}

function toggleVisibility(item: SidebarSection, visible: boolean) {
  if (item.fixed) return
  const ids = new Set(draft.value.visibleSectionIds)
  visible ? ids.add(item.name) : ids.delete(item.name)
  draft.value.visibleSectionIds = [...ids]
  if (!visible) draft.value.mobileFavoriteIds = draft.value.mobileFavoriteIds.filter((id) => id !== item.name)
  commit()
}

function toggleFavorite(item: SidebarSection) {
  if (!isVisible(item)) return
  if (isFavorite(item)) {
    draft.value.mobileFavoriteIds = draft.value.mobileFavoriteIds.filter((id) => id !== item.name)
  } else if (draft.value.mobileFavoriteIds.length < 4) {
    draft.value.mobileFavoriteIds = [...draft.value.mobileFavoriteIds, item.name]
  }
  commit()
}

function move(group: SidebarGroup, index: number, direction: number) {
  const target = index + direction
  if (target < 0 || target >= group.items.length) return
  reorder(group.items[index].name, group.items[target].name)
}

function startDrag(id: string, group: string) {
  draggedId.value = id
  draggedGroup.value = group
}

function stopDrag() {
  draggedId.value = ''
  draggedGroup.value = ''
}

function dropOn(targetId: string, group: string) {
  if (!draggedId.value || draggedGroup.value !== group || draggedId.value === targetId) return stopDrag()
  reorder(draggedId.value, targetId)
  stopDrag()
}

function reorder(sourceId: string, targetId: string) {
  const order = [...draft.value.sectionOrder]
  const sourceIndex = order.indexOf(sourceId)
  const targetIndex = order.indexOf(targetId)
  if (sourceIndex === -1 || targetIndex === -1) return
  order.splice(sourceIndex, 1)
  order.splice(targetIndex, 0, sourceId)
  draft.value.sectionOrder = order
  commit()
}
</script>

<style scoped>
.sidebar-customize__intro{display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid var(--accent-border);border-radius:14px;padding:13px 14px;background:var(--accent-soft)}
.sidebar-customize__intro strong{font-size:13px}.sidebar-customize__intro p{max-width:500px;margin:3px 0 0;color:var(--text-secondary);font-size:10px;line-height:1.5}.sidebar-customize__intro>span{flex:0 0 auto;border-radius:99px;padding:5px 9px;color:var(--accent);background:var(--card-solid);font-size:10px;font-weight:800}
.sidebar-customize__groups{display:grid;gap:16px;margin-top:16px}.sidebar-customize__group{display:grid;gap:6px}.sidebar-customize__group>header{display:flex;align-items:center;justify-content:space-between;padding:0 7px;color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.sidebar-customize__group>header small{font-size:9px}.sidebar-customize__items{display:grid;gap:5px}
.sidebar-customize__item{display:grid;grid-template-columns:18px 36px minmax(0,1fr) auto 32px 44px;align-items:center;gap:9px;min-height:54px;border:1px solid var(--border-color);border-radius:13px;padding:6px 9px;background:var(--card-soft);transition:.16s var(--ease-out)}.sidebar-customize__item--hidden{opacity:.58}.sidebar-customize__item--dragging{border-color:var(--accent);opacity:.45}.sidebar-customize__drag{color:var(--text-muted);cursor:grab;font-size:13px;letter-spacing:-4px}.sidebar-customize__drag.disabled{opacity:.25;cursor:default}.sidebar-customize__icon{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;color:var(--text-secondary);background:var(--control-bg)}.sidebar-customize__copy{min-width:0}.sidebar-customize__copy strong,.sidebar-customize__copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sidebar-customize__copy strong{font-size:11px}.sidebar-customize__copy small{margin-top:2px;color:var(--text-muted);font-size:9px}
.sidebar-customize__order{display:flex;gap:3px}.sidebar-customize__favorite{display:grid;place-items:center;width:30px;height:30px;border:0;border-radius:9px;color:var(--text-muted);background:transparent;font-size:15px}.sidebar-customize__favorite:hover:not(:disabled),.sidebar-customize__favorite.active{color:var(--warning);background:color-mix(in srgb,var(--warning) 10%,transparent)}.sidebar-customize__favorite:disabled{opacity:.28}.sidebar-customize__error{margin:10px 0 0;border-radius:10px;padding:8px 10px;color:var(--danger);background:color-mix(in srgb,var(--danger) 8%,var(--control-bg));font-size:10px}.sidebar-customize__footer{position:sticky;bottom:-16px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;margin:16px -16px -16px;padding:12px 16px;border-top:1px solid var(--border-color);background:var(--panel-bg)}.sidebar-customize__footer>span{color:var(--text-muted);font-size:9px;text-align:center}
@media(max-width:620px){.sidebar-customize__intro{align-items:flex-start}.sidebar-customize__item{grid-template-columns:30px minmax(0,1fr) 32px 44px}.sidebar-customize__drag,.sidebar-customize__order{display:none}.sidebar-customize__icon{width:30px;height:30px}.sidebar-customize__copy small{display:none}.sidebar-customize__footer{bottom:-11px;margin:12px -12px -11px;padding:10px 12px}.sidebar-customize__footer>span{display:none}}
</style>
