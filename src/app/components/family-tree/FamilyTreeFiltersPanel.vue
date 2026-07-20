<template>
  <Transition name="filters-panel">
    <section class="filters-panel" aria-label="Фильтры семейного дерева">
      <header class="filters-panel__header">
        <div>
          <small>ПОИСК ПО ДЕРЕВУ</small>
          <strong>Фильтры</strong>
        </div>
        <UiIconButton icon="close" label="Закрыть фильтры" @click="$emit('close')" />
      </header>

      <div class="filters-panel__controls">
        <div ref="searchControl" class="filters-panel__search">
          <UiIcon name="search" />
          <UiInput
            :model-value="search"
            aria-label="Поиск по семейному дереву"
            placeholder="Имя, год, город, тег или заметка…"
            @update:model-value="$emit('update:search', $event)"
            @keydown.esc="$emit('update:search', '')"
          />
          <kbd>/</kbd>
        </div>

        <UiSelect
          :model-value="genderFilter"
          compact
          pill
          aria-label="Фильтр по полу"
          @update:model-value="$emit('update:genderFilter', $event)"
        >
          <option value="">Все люди</option>
          <option value="female">Женщины</option>
          <option value="male">Мужчины</option>
          <option value="other">Другой / не указан</option>
        </UiSelect>

        <label class="filters-panel__toggle">
          <UiToggle
            :model-value="livingOnly"
            label="Показывать только живых"
            @update:model-value="$emit('update:livingOnly', $event)"
          />
          <span>Сейчас живы</span>
        </label>
      </div>

      <footer class="filters-panel__footer">
        <span>{{ resultLabel }}</span>
        <UiButton
          v-if="hasActiveFilters"
          variant="ghost"
          size="sm"
          icon="close"
          @click="$emit('reset')"
        >
          Сбросить всё
        </UiButton>
      </footer>
    </section>
  </Transition>
</template>

<script setup>
import { computed, ref } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiToggle from '../ui/UiToggle.vue'

const props = defineProps({
  search: { type: String, default: '' },
  genderFilter: { type: String, default: '' },
  livingOnly: { type: Boolean, default: false },
  visibleCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  hasActiveFilters: { type: Boolean, default: false },
})

defineEmits([
  'update:search',
  'update:genderFilter',
  'update:livingOnly',
  'reset',
  'close',
])

const searchControl = ref(null)
const resultLabel = computed(() => props.hasActiveFilters
  ? `Показано ${props.visibleCount} из ${props.totalCount}`
  : `Все люди: ${props.totalCount}`)

function focusSearch() {
  searchControl.value?.querySelector('input')?.focus()
}

defineExpose({ focusSearch })
</script>

<style scoped>
.filters-panel {
  position: absolute;
  z-index: 7;
  top: 14px;
  left: 72px;
  display: grid;
  gap: 12px;
  width: min(760px, calc(100% - 100px));
  border: 1px solid var(--border-strong);
  border-radius: 18px;
  padding: 13px;
  background: color-mix(in srgb, var(--sidebar-floating-bg) 96%, transparent);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(18px);
}

.filters-panel__header,
.filters-panel__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.filters-panel__header small,
.filters-panel__header strong {
  display: block;
}

.filters-panel__header small {
  margin-bottom: 2px;
  color: var(--text-muted);
  font-size: 8px;
  font-weight: 850;
  letter-spacing: .12em;
}

.filters-panel__controls {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(170px, 200px) auto;
  align-items: center;
  gap: 9px;
}

.filters-panel__controls :deep(.ui-select),
.filters-panel__controls :deep(.ui-select__trigger) {
  width: 100%;
}

.filters-panel__search {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  min-width: 0;
  color: var(--text-muted);
}

.filters-panel__search > :first-child {
  z-index: 1;
  margin-right: -28px;
  margin-left: 10px;
  pointer-events: none;
}

.filters-panel__search :deep(.ui-input__control) {
  padding-right: 34px;
  padding-left: 34px;
  border-radius: var(--radius-pill);
}

.filters-panel__search kbd {
  margin-left: -28px;
  font-size: 10px;
  pointer-events: none;
}

.filters-panel__toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.filters-panel__footer {
  min-height: 30px;
  border-top: 1px solid var(--border-color);
  padding-top: 9px;
  color: var(--text-muted);
  font-size: 10px;
}

.filters-panel-enter-active,
.filters-panel-leave-active {
  transition: opacity .16s var(--ease-out), transform .18s var(--ease-out);
}

.filters-panel-enter-from,
.filters-panel-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(.985);
}

@media (max-width: 800px) {
  .filters-panel {
    left: 12px;
    width: calc(100% - 24px);
  }

  .filters-panel__controls {
    grid-template-columns: 1fr;
  }
}
</style>
