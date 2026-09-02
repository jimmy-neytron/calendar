<template>
  <UiModal :model-value="true" :title="clearProducts ? 'Очистить товары категории?' : 'Удалить источник?'" width="520px"
    :close-on-overlay="!saving" :close-on-escape="!saving" :hide-close="saving" @update:model-value="close">
    <div class="source-delete">
      <div class="source-delete__target"><UiIcon :name="clearProducts ? 'table' : 'link'" /><div><strong>{{ source.name }}</strong><span>Магнит · {{ source.storeCode }}</span></div></div>
      <template v-if="clearProducts">
        <p>Товары, которые есть только в этой категории, будут удалены вместе с историей цен, ручной фасовкой и привязками к ингредиентам. Товары из других источников сохранятся.</p>
        <p>Меню и рецепты останутся. Источник сохранится, автообновление выключится. Для повторной загрузки нажмите «Обновить сейчас»; привязки удалённых товаров нужно будет настроить заново.</p>
        <div class="source-delete__warning" role="note"><UiIcon name="warning" />Удаление нельзя отменить. Для обычного обновления цен очищать товары не нужно.</div>
      </template>
      <template v-else>
        <label class="source-delete__option"><input v-model="deleteProducts" type="checkbox" :disabled="saving" /><span>Удалить также товары этого источника</span></label>
        <template v-if="deleteProducts">
          <p>Источник и товары, которые есть только в нём, будут удалены вместе с историей цен, ручной фасовкой и привязками к ингредиентам. Общие товары других источников, меню и рецепты сохранятся.</p>
          <div class="source-delete__warning" role="note"><UiIcon name="warning" />Удаление нельзя отменить. Для сохранения товаров снимите галочку выше.</div>
        </template>
        <p v-else>Источник и его связи с каталогом будут удалены. Товары, история и привязки к ингредиентам сохранятся, но цены этого источника перестанут учитываться в расчёте до подтверждения другим источником.</p>
      </template>
      <footer><UiButton variant="secondary" autofocus :disabled="saving" @click="close">Отмена</UiButton><UiButton class="source-delete__confirm" variant="danger" :loading="saving" @click="confirm">{{ clearProducts ? 'Удалить товары категории' : deleteProducts ? 'Удалить источник и товары' : 'Удалить только источник' }}</UiButton></footer>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import type { StoreCatalogSource } from '../types/storeCatalog.types'
const props = defineProps<{ source: StoreCatalogSource; clearProducts: boolean; saving: boolean }>()
const emit = defineEmits<{ close: []; confirm: [deleteProducts: boolean] }>()
const deleteProducts = ref(true)
function close() { if (!props.saving) emit('close') }
function confirm() { if (!props.saving) emit('confirm', props.clearProducts || deleteProducts.value) }
</script>

<style scoped>
.source-delete__option{display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--border-color);border-radius:10px;color:var(--text-primary);font-size:13px;line-height:1.5;cursor:pointer}.source-delete__option input{flex-shrink:0;width:17px;height:17px;margin:2px 0 0;accent-color:var(--accent)}.source-delete__option input:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.source-delete{display:grid;gap:16px}.source-delete__target{display:flex;align-items:center;gap:12px;padding:14px;border:1px solid var(--border-color);border-radius:12px;background:var(--control-bg)}.source-delete__target>svg{color:var(--text-muted);flex-shrink:0}.source-delete__target strong,.source-delete__target span{display:block;overflow-wrap:anywhere}.source-delete__target span{margin-top:4px;font-size:11px;color:var(--text-muted)}.source-delete p{margin:0;font-size:13px;line-height:1.7;color:var(--text-secondary)}.source-delete__warning{display:flex;gap:10px;padding:12px;border-radius:10px;color:var(--danger);background:color-mix(in srgb,var(--danger) 7%,var(--card-solid));font-size:12px;line-height:1.6}.source-delete__warning svg{flex-shrink:0}.source-delete footer{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;padding-top:16px;border-top:1px solid var(--border-color)}.source-delete__confirm{color:var(--danger)}
</style>
