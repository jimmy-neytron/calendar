<template>
  <section class="collection-controls">
    <span class="collection-controls__summary">
      Показано {{ rangeStart }}–{{ rangeEnd }} из {{ total }}
    </span>
    <div class="collection-controls__size">
      <span>На странице</span>
      <UiSelect :model-value="pageSize" compact pill aria-label="Количество элементов на странице" @update:model-value="$emit('update:pageSize', $event)">
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="40">40</option>
        <option :value="60">60</option>
      </UiSelect>
    </div>
    <div class="collection-controls__modes" aria-label="Режим отображения">
      <button type="button" :class="{ active: viewMode === 'cards' }" title="Карточки" @click="$emit('update:viewMode', 'cards')">
        <UiIcon name="grid" />
      </button>
      <button type="button" :class="{ active: viewMode === 'table' }" title="Таблица" @click="$emit('update:viewMode', 'table')">
        <UiIcon name="table" />
      </button>
    </div>
  </section>
</template>

<script setup>
import UiIcon from '../ui/UiIcon.vue'
import UiSelect from '../ui/UiSelect.vue'

defineProps({
  viewMode: { type: String, default: 'cards' },
  pageSize: { type: Number, default: 20 },
  total: { type: Number, default: 0 },
  rangeStart: { type: Number, default: 0 },
  rangeEnd: { type: Number, default: 0 },
})
defineEmits(['update:viewMode', 'update:pageSize'])
</script>

<style scoped>
.collection-controls{display:flex;align-items:center;gap:10px;min-height:46px;border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:7px 9px 7px 13px;background:var(--card-solid)}.collection-controls__summary{margin-right:auto;color:var(--text-muted);font-size:10px}.collection-controls__size{display:flex;align-items:center;gap:7px;color:var(--text-muted);font-size:9px}.collection-controls__size :deep(.ui-select){width:76px}.collection-controls__modes{display:flex;gap:3px;border:1px solid var(--border-color);border-radius:10px;padding:3px;background:var(--control-bg)}.collection-controls__modes button{display:grid;place-items:center;width:30px;height:28px;border:0;border-radius:7px;color:var(--text-muted);background:transparent;font-size:15px;transition:.18s var(--ease-out)}.collection-controls__modes button:hover{color:var(--text-primary)}.collection-controls__modes button.active{color:var(--text-inverse);background:var(--accent);box-shadow:var(--shadow-sm)}@media(max-width:560px){.collection-controls{flex-wrap:wrap}.collection-controls__summary{width:100%}.collection-controls__size{margin-right:auto}}
</style>
