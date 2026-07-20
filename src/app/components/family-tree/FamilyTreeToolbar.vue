<template>
  <header class="tree-toolbar">
    <div class="tree-toolbar__heading">
      <span>СЕМЬЯ · {{ peopleCount }} ЧЕЛ.</span>
      <h1>Семейное дерево</h1>
      <p>Сохраняйте историю семьи, фотографии и родственные связи.</p>
    </div>

    <div class="tree-toolbar__actions">
      <UiButton
        variant="secondary"
        icon="filter"
        :class="{ 'tree-toolbar__filter-button--active': hasActiveFilters }"
        @click="$emit('toggleFilters')"
      >
        {{ hasActiveFilters ? `Фильтры · ${visibleCount}` : 'Фильтры' }}
      </UiButton>
      <UiButton variant="secondary" icon="↓" @click="$emit('export')">Экспорт</UiButton>
      <UiButton variant="secondary" @click="importInput?.click()">Импорт</UiButton>
      <input
        ref="importInput"
        hidden
        type="file"
        accept=".json,application/json"
        @change="$emit('import', $event)"
      />
      <UiButton icon="＋" @click="$emit('create')">Добавить человека</UiButton>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import UiButton from '../ui/UiButton.vue'

defineProps({
  peopleCount: { type: Number, default: 0 },
  visibleCount: { type: Number, default: 0 },
  hasActiveFilters: { type: Boolean, default: false },
})

defineEmits(['toggleFilters', 'export', 'import', 'create'])

const importInput = ref(null)
</script>

<style scoped>
.tree-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: var(--panel-bg);
  box-shadow: var(--shadow-sm);
}

.tree-toolbar__heading {
  min-width: 0;
}

.tree-toolbar__heading span {
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .11em;
}

.tree-toolbar__heading h1 {
  margin: 2px 0 1px;
  font-size: 21px;
}

.tree-toolbar__heading p {
  margin: 0;
  color: var(--text-muted);
  font-size: 10px;
}

.tree-toolbar__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.tree-toolbar__filter-button--active {
  border-color: var(--accent-border) !important;
  color: var(--accent-light, var(--accent-hover)) !important;
  background: var(--accent-soft) !important;
}

@media (max-width: 760px) {
  .tree-toolbar {
    display: grid;
  }

  .tree-toolbar__actions {
    justify-content: flex-start;
  }
}
</style>
