<template>
  <UiModal :model-value="true" :title="products.length === 1 ? 'Удалить товар?' : 'Удалить выбранные товары?'" width="540px"
    :close-on-overlay="!saving" :close-on-escape="!saving" :hide-close="saving" @update:model-value="close">
    <div class="products-delete">
      <strong>К удалению: {{ products.length }}</strong>
      <ul aria-label="Товары к удалению"><li v-for="product in products" :key="product.id"><span>{{ product.name }}</span><small>Код {{ product.productCode }}</small></li></ul>
      <p>Товары будут удалены из каталога и всех источников этого пространства вместе с историей цен, ручной фасовкой и привязками к ингредиентам. Меню, рецепты и сами источники сохранятся.</p>
      <div class="products-delete__warning" role="note"><UiIcon name="warning" /><span>Удаление нельзя отменить. При следующем обновлении действующего источника товар может появиться снова. Его привязки потребуется настроить заново.</span></div>
      <footer><UiButton variant="secondary" autofocus :disabled="saving" @click="close">Отмена</UiButton><UiButton class="products-delete__confirm" variant="danger" :loading="saving" :disabled="!products.length" @click="confirm">Удалить {{ products.length === 1 ? 'товар' : `товары (${products.length})` }}</UiButton></footer>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import UiModal from '../../../components/ui/UiModal.vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import type { StoreProduct } from '../types/storeCatalog.types'
const props = defineProps<{ products: StoreProduct[]; saving: boolean }>()
const emit = defineEmits<{ close: []; confirm: [] }>()
function close() { if (!props.saving) emit('close') }
function confirm() { if (!props.saving && props.products.length) emit('confirm') }
</script>

<style scoped>
.products-delete{display:grid;gap:16px}.products-delete>strong{font-size:14px}.products-delete ul{max-height:220px;overflow:auto;margin:0;padding:0;list-style:none;border:1px solid var(--border-color);border-radius:10px;background:var(--control-bg)}.products-delete li{display:grid;gap:4px;padding:10px 12px;overflow-wrap:anywhere;font-size:12px}.products-delete li+li{border-top:1px solid var(--border-color)}.products-delete small{color:var(--text-muted);font-size:10px}.products-delete p{margin:0;color:var(--text-secondary);font-size:12px;line-height:1.7}.products-delete__warning{display:flex;gap:10px;padding:12px;border-radius:10px;background:color-mix(in srgb,var(--danger) 7%,var(--card-solid));color:var(--danger);font-size:12px;line-height:1.6}.products-delete__warning svg{flex-shrink:0}.products-delete footer{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;padding-top:16px;border-top:1px solid var(--border-color)}.products-delete__confirm{color:var(--danger)}
</style>
