<template>
  <section v-if="entries.length" class="price-notice" aria-label="Товары без подтверждённой цены">
    <div class="price-notice__heading">
      <span class="price-notice__icon"><UiIcon name="warning" /></span>
      <div class="price-notice__copy"><strong role="status">Цены требуют внимания <b>{{ entries.length }}</b></strong><p>Эти товары не входят в итоговую сумму. Обнови источники, чтобы проверить актуальную цену и доступность.</p></div>
      <UiButton variant="secondary" icon="refresh" @click="$emit('sources')">К источникам</UiButton>
    </div>
    <div class="price-notice__products">
      <button v-for="entry in visibleEntries" :key="entry.product.id" type="button" @click="$emit('select', entry.product.id)"><span><strong>{{ entry.product.name }}</strong><small>{{ entry.issues.find(issue => issue.kind === 'price')?.title }}</small></span><UiIcon name="right" /></button>
    </div>
    <footer><button v-if="entries.length > 3" type="button" :aria-expanded="expanded" @click="expanded = !expanded">{{ expanded ? 'Свернуть список' : `Показать все ${entries.length}` }}<UiIcon :name="expanded ? 'up' : 'down'" /></button><button type="button" @click="$emit('filter')">Показать в каталоге<UiIcon name="filter" /></button></footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import type { StoreProductIssue } from '../services/storeProductPresentation'
import type { StoreProduct } from '../types/storeCatalog.types'
const props = defineProps<{ entries: Array<{ product: StoreProduct; issues: StoreProductIssue[] }> }>()
defineEmits<{ select: [id: string]; sources: []; filter: [] }>()
const expanded = ref(false)
const visibleEntries = computed(() => expanded.value ? props.entries : props.entries.slice(0, 3))
</script>

<style scoped>
.price-notice{margin:20px 0;border:1px solid color-mix(in srgb,var(--warning) 28%,var(--border-color));border-radius:14px;background:color-mix(in srgb,var(--warning) 5%,var(--card-solid));overflow:hidden}.price-notice__heading{display:flex;align-items:center;gap:14px;padding:18px}.price-notice__icon{display:grid;place-items:center;width:38px;height:38px;flex-shrink:0;border-radius:12px;color:var(--warning);background:color-mix(in srgb,var(--warning) 12%,transparent);font-size:20px}.price-notice__copy{flex:1;min-width:0}.price-notice__copy>strong{font-size:13px}.price-notice__copy b{display:inline-block;margin-left:7px;padding:2px 7px;border-radius:99px;background:color-mix(in srgb,var(--warning) 14%,transparent);font-size:11px}.price-notice p{margin:6px 0 0;color:var(--text-secondary);font-size:11px;line-height:1.6}.price-notice__products{display:grid;max-height:280px;overflow:auto;overscroll-behavior:contain;margin:0 18px;border-top:1px solid var(--border-color)}.price-notice__products button{display:flex;align-items:center;justify-content:space-between;gap:12px;border:0;border-bottom:1px solid var(--border-color);padding:11px 4px;background:transparent;color:var(--text-primary);text-align:left}.price-notice__products span{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 12px}.price-notice__products strong{font-size:12px;font-weight:550;overflow-wrap:anywhere}.price-notice__products small{color:var(--text-secondary);font-size:10px}.price-notice__products svg{flex-shrink:0;color:var(--text-muted)}.price-notice button:hover{background:var(--control-bg)}.price-notice button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}.price-notice footer{display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:10px 18px}.price-notice footer button{display:flex;align-items:center;gap:6px;min-height:28px;padding:0;border:0;background:none;color:var(--text-secondary);font-size:11px}.price-notice footer button:last-child{margin-left:auto}@media(max-width:600px){.price-notice__heading{flex-wrap:wrap;padding:14px;gap:10px}.price-notice__heading :deep(.ui-button){margin-left:48px}.price-notice__products{margin:0 14px}.price-notice__products span{display:grid}.price-notice__copy{flex-basis:calc(100% - 48px)}}
</style>
