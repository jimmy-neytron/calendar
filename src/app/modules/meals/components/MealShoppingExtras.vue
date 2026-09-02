<template>
  <details v-if="items.length" class="shopping-extras panel">
    <summary><span class="shopping-extras__icon"><UiIcon name="plus" /></span><span><strong>Дополнительно к меню <b>{{ items.length }}</b></strong><small>Уже включено в список выше · здесь можно удалить</small></span><UiIcon name="down" /></summary>
    <div class="shopping-extras__items">
      <article v-for="item in items" :key="item.id"><div><strong>{{ item.name }}</strong><span>{{ formatDate(item.date) }} · {{ formatPurchaseAmount(item) }}</span></div><UiIconButton icon="trash" :label="`Удалить ${item.name}`" variant="danger" :disabled="saving" @click="$emit('remove', item.id)" /></article>
    </div>
  </details>
</template>

<script setup lang="ts">
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiIconButton from '../../../components/ui/UiIconButton.vue'
import { formatPurchaseAmount } from '../../store-catalog/composables/usePurchaseChecklist'
import type { MealShoppingItem } from '../types/meals.types'
defineProps<{ items: MealShoppingItem[]; saving?: boolean }>()
defineEmits<{ remove: [id: string] }>()
const formatDate = (date: string) => new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`))
</script>

<style scoped>
.shopping-extras{padding:0 20px}.shopping-extras summary{display:flex;align-items:center;gap:12px;padding:17px 0;cursor:pointer;list-style:none}.shopping-extras summary::-webkit-details-marker{display:none}.shopping-extras__icon{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:var(--control-bg);color:var(--text-secondary)}.shopping-extras summary>span:nth-child(2){flex:1;display:grid;gap:5px}.shopping-extras summary>svg{color:var(--text-muted)}.shopping-extras[open] summary>svg{transform:rotate(180deg)}.shopping-extras strong{font-size:12px}.shopping-extras b{margin-left:6px;color:var(--text-muted);font-size:10px}.shopping-extras small,.shopping-extras article span{color:var(--text-secondary);font-size:11px;line-height:1.4}.shopping-extras article{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid var(--border-color);padding:12px 0}.shopping-extras article>div{display:grid;gap:5px;min-width:0;overflow-wrap:anywhere}.shopping-extras summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
</style>
