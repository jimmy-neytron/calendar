<template>
  <UiModal :model-value="true" :title="source ? 'Редактировать источник' : 'Подключить источник'" eyebrow="Каталог Магнита" width="620px"
    :close-on-overlay="!saving" :close-on-escape="!saving" :hide-close="saving" @update:model-value="close">
    <form class="source-editor" @submit.prevent="submit">
      <p class="source-editor__intro">{{ source ? 'Обнови параметры раздела. Товары и привязки останутся на месте.' : 'Один источник — один раздел каталога. Для цен на полке выбери обычный магазин на сайте Магнита, затем скопируй ссылку на раздел.' }}</p>
      <label>Ссылка на раздел Магнита<input v-model="draft.url" required type="url" aria-label="Ссылка Магнита" :autofocus="!source" placeholder="https://magnit.ru/catalog/…?shopCode=…&shopType=1" :disabled="saving" /><small>Для цен на полке выбери обычный магазин: ссылка должна содержать shopCode и shopType=1.</small></label>
      <div v-if="context" class="source-editor__preview" aria-label="Магазин из ссылки"><span class="preview-mark">М</span><div><strong>Магазин {{ context.storeCode }}</strong><span>{{ describeStoreSourceContext(context) }} · раздел {{ context.categoryId }}</span></div><UiIcon name="check-circle" /></div>
      <label>Название раздела<input v-model="draft.name" required maxlength="120" aria-label="Название раздела" :autofocus="Boolean(source)" placeholder="Например, овощи и фрукты" :disabled="saving" /><small>Так источник будет называться в твоём каталоге.</small></label>
      <details class="source-editor__advanced" :open="Boolean(source)"><summary><UiIcon name="settings" />Код магазина вручную<UiIcon name="down" /></summary><label>Код магазина<input v-model="draft.storeCode" maxlength="12" inputmode="numeric" aria-label="Код магазина" :placeholder="context?.storeCode || 'Определится из ссылки'" :disabled="saving" /><small>Необязательно, если shopCode есть в ссылке. Если заполняешь — коды должны совпадать.</small></label></details>
      <div class="source-editor__notice"><UiIcon name="clock" /><p>{{ source ? 'При смене ссылки или магазина цены нужно подтвердить заново через «Обновить сейчас».' : 'Добавление сохранит источник. Чтобы загрузить товары и цены, затем нажми «Обновить сейчас».' }} Цены сайта могут отличаться от ценника и кассы. Автообновляемые источники должны относиться к одному магазину и режиму покупки.</p></div>
      <p v-if="error || serverError" class="source-editor__error" role="alert">{{ error || serverError }}</p>
      <footer><UiButton variant="secondary" :disabled="saving" @click="close">Отмена</UiButton><UiButton type="submit" :loading="saving" :icon="source ? '' : 'plus'">{{ source ? 'Сохранить изменения' : 'Добавить источник' }}</UiButton></footer>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import UiModal from '../../../components/ui/UiModal.vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import { describeStoreSourceContext } from '../services/storeSourceDraft'
import { useStoreSourceForm } from '../composables/useStoreSourceForm'
import type { StoreCatalogSource, StoreSourceDraft } from '../types/storeCatalog.types'

const props = defineProps<{ source?: StoreCatalogSource; saving: boolean; serverError?: string }>()
const emit = defineEmits<{ close: []; save: [draft: StoreSourceDraft] }>()
const { draft, error, context, validate } = useStoreSourceForm(props.source)
function close() { if (!props.saving) emit('close') }
function submit() {
  if (props.saving) return
  const value = validate()
  if (value) emit('save', value)
}
</script>

<style scoped>
.source-editor__intro{margin:0;color:var(--text-secondary);font-size:12px;line-height:1.7}.source-editor__preview{display:flex;align-items:center;gap:12px;padding:14px;border:1px solid color-mix(in srgb,var(--success) 25%,var(--border-color));border-radius:12px;background:color-mix(in srgb,var(--success) 4%,var(--card-solid))}.preview-mark{display:grid;place-items:center;width:34px;height:38px;flex-shrink:0;border-radius:9px;background:var(--control-bg);color:var(--danger);font-size:20px;font-weight:800}.source-editor__preview>div{flex:1;min-width:0}.source-editor__preview strong{display:block;font-size:12px}.source-editor__preview span:not(.preview-mark){display:block;margin-top:5px;color:var(--text-secondary);font-size:11px;line-height:1.6}.source-editor__preview>svg{color:var(--success);flex-shrink:0}.source-editor__advanced summary{display:flex;align-items:center;gap:8px;list-style:none;cursor:pointer;color:var(--text-secondary);font-size:12px;padding:8px 0}.source-editor__advanced summary::-webkit-details-marker{display:none}.source-editor__advanced summary>svg{font-size:14px}.source-editor__advanced summary>svg:last-child{margin-left:auto}.source-editor__advanced[open] summary>svg:last-child{transform:rotate(180deg)}.source-editor__advanced>label{padding-top:8px}.source-editor__advanced summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.source-editor{display:grid;gap:18px}.source-editor label{display:grid;gap:7px;font-size:12px;font-weight:650;color:var(--text-secondary)}.source-editor input{width:100%;min-width:0;box-sizing:border-box;min-height:42px;padding:10px 12px;border:1px solid var(--border-color);border-radius:10px;background:var(--field-bg);color:var(--text-primary);font:inherit}.source-editor input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.source-editor small{font-size:11px;line-height:1.5;font-weight:400;color:var(--text-muted)}.source-editor__notice{display:flex;gap:10px;border:1px solid var(--border-color);border-radius:12px;padding:14px;background:var(--control-bg);color:var(--text-secondary)}.source-editor__notice svg{flex-shrink:0}.source-editor__notice p{margin:0;font-size:12px;line-height:1.6}.source-editor__error{margin:0;color:var(--danger);font-size:12px}.source-editor footer{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;border-top:1px solid var(--border-color);padding-top:16px}
</style>
