<template>
  <footer v-if="pageCount > 1" class="collection-pagination">
    <UiIconButton icon="left" label="Предыдущая страница" :disabled="page === 1" @click="$emit('change', page - 1)" />
    <button
      v-for="number in visiblePages"
      :key="number"
      type="button"
      :class="{ active: number === page }"
      @click="$emit('change', number)"
    >
      {{ number }}
    </button>
    <UiIconButton icon="right" label="Следующая страница" :disabled="page === pageCount" @click="$emit('change', page + 1)" />
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import UiIconButton from '../ui/UiIconButton.vue'

const props = defineProps({
  page: { type: Number, default: 1 },
  pageCount: { type: Number, default: 1 },
})
defineEmits(['change'])

const visiblePages = computed(() => Array.from({ length: props.pageCount }, (_, index) => index + 1)
  .filter((number) => number === 1 || number === props.pageCount || Math.abs(number - props.page) <= 2))
</script>

<style scoped>
.collection-pagination{display:flex;justify-content:center;align-items:center;gap:5px;padding:8px 0}.collection-pagination>button:not(.ui-icon-button){display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--border-color);border-radius:10px;color:var(--text-secondary);background:var(--control-bg);font-size:11px;font-weight:750;transition:.18s var(--ease-out)}.collection-pagination>button:not(.ui-icon-button):hover{border-color:var(--border-strong);color:var(--text-primary);transform:translateY(-1px)}.collection-pagination>button.active{color:var(--text-inverse);border-color:var(--accent);background:var(--accent)}
</style>
