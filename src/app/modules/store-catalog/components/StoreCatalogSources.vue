<template>
  <section class="sources-screen">
    <header class="sources-header">
      <div><small>Каталог и цены</small><h2>Источники магазинов</h2><p>Разделы каталога, из которых обновляются товары для твоего меню.</p></div>
      <UiButton v-if="sources.length" icon="plus" :disabled="saving || Boolean(syncingSourceId)" @click="$emit('create')">Добавить источник</UiButton>
    </header>
    <section v-if="!sources.length" class="sources-welcome">
      <div class="sources-welcome__copy"><span class="store-mark">М</span><h3>Начни с одного раздела</h3><p>Добавь ссылку на каталог Магнита. После обновления товары появятся в списке, и их можно будет связать с ингредиентами меню.</p><UiButton icon="plus" :disabled="saving || Boolean(syncingSourceId)" @click="$emit('create')">Добавить первый источник</UiButton><small>Можно подключить несколько разделов одного магазина.</small></div>
      <ol class="sources-steps"><li><b>01</b><div><strong>Скопируй ссылку</strong><span>Открой нужный раздел Магнита, выбрав магазин и режим покупки.</span></div></li><li><b>02</b><div><strong>Подключи источник</strong><span>Вставь ссылку и задай удобное название. Код магазина определится из ссылки.</span></div></li><li><b>03</b><div><strong>Обнови товары</strong><span>Нажми «Обновить сейчас», затем привяжи товары к своему меню.</span></div></li></ol>
    </section>
    <template v-else>
      <div class="sources-summary" aria-label="Сводка источников"><span><UiIcon name="link" /><b>{{ sources.length }}</b> подключено</span><span><i class="summary-dot" /><b>{{ autoCount }}</b> с автообновлением</span><span v-if="errorCount" class="sources-summary__error"><UiIcon name="warning" /><b>{{ errorCount }}</b> с ошибкой</span></div>
      <div class="sources-toolbar"><label class="sources-search"><UiIcon name="search" /><input v-model="query" type="search" aria-label="Найти источник" placeholder="Название, ссылка или код магазина" /></label><UiSelect v-model="filter" aria-label="Фильтр источников"><option value="all">Все источники</option><option value="auto">С автообновлением</option><option value="manual">Только вручную</option><option value="error">С ошибками</option></UiSelect></div>
      <div v-if="!visibleSources.length" class="sources-no-results"><UiIcon name="search" /><strong>Источники не найдены</strong><span>Попробуй другое название или сбрось фильтры.</span><UiButton variant="secondary" @click="resetFilters">Сбросить фильтры</UiButton></div>
      <div v-else class="source-list" aria-label="Подключённые источники">
        <StoreSourceListItem v-for="source in visibleSources" :key="source.id" :source="source" :busy="saving || Boolean(syncingSourceId) || source.status === 'syncing'" :syncing="syncingSourceId === source.id || source.status === 'syncing'" @toggle="enabled => $emit('toggle', source.id, enabled)" @sync="$emit('sync', source.id)" @edit="$emit('edit', source)" @clear="$emit('clear', source)" @remove="$emit('remove', source)" />
      </div>
      <div class="sources-footnote"><UiIcon name="clock" /><p>Автообновление — каждые 12 часов при настроенном расписании. «Обновить сейчас» работает и при выключенном авто. Для автоматического обновления используй один магазин и режим покупки.</p></div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import StoreSourceListItem from './StoreSourceListItem.vue'
import type { StoreCatalogSource } from '../types/storeCatalog.types'
const props = defineProps<{ sources: StoreCatalogSource[]; saving: boolean; syncingSourceId: string }>()
defineEmits<{ create: []; toggle: [id: string, enabled: boolean]; sync: [id: string]; edit: [source: StoreCatalogSource]; remove: [source: StoreCatalogSource]; clear: [source: StoreCatalogSource] }>()
const query = ref(''), filter = ref('all')
const autoCount = computed(() => props.sources.filter(source => source.enabled).length)
const errorCount = computed(() => props.sources.filter(source => source.status === 'error').length)
const visibleSources = computed(() => {
  const search = query.value.trim().toLocaleLowerCase('ru-RU')
  return props.sources.filter(source => [source.name, source.url, source.storeCode].join(' ').toLocaleLowerCase('ru-RU').includes(search)
    && (filter.value === 'all' || (filter.value === 'auto' && source.enabled) || (filter.value === 'manual' && !source.enabled) || (filter.value === 'error' && source.status === 'error')))
})
function resetFilters() { query.value = ''; filter.value = 'all' }
</script>

<style scoped>
.sources-screen{display:grid;gap:20px;min-width:0;padding:12px 0}.sources-header{display:flex;align-items:center;justify-content:space-between;gap:20px}.sources-header small{font-size:10px;font-weight:700;color:var(--text-muted);letter-spacing:.12em;text-transform:uppercase}.sources-header h2{margin:7px 0;font-size:24px;letter-spacing:-.03em}.sources-header p{margin:0;font-size:12px;line-height:1.6;color:var(--text-secondary)}.sources-welcome{display:grid;grid-template-columns:1.1fr 1fr;gap:48px;align-items:center;padding:40px;border:1px solid var(--border-color);border-radius:18px;background:linear-gradient(120deg,var(--card-solid),var(--card-soft))}.sources-welcome__copy{max-width:470px}.store-mark{display:grid;place-items:center;width:46px;height:46px;border:1px solid color-mix(in srgb,var(--danger) 25%,var(--border-color));border-radius:14px;background:color-mix(in srgb,var(--danger) 8%,var(--card-solid));color:var(--danger);font-size:24px;font-weight:850}.sources-welcome h3{margin:20px 0 12px;font-size:27px;letter-spacing:-.04em}.sources-welcome p{margin:0 0 24px;color:var(--text-secondary);font-size:13px;line-height:1.8}.sources-welcome__copy>small{display:block;margin-top:12px;font-size:10px;color:var(--text-muted);line-height:1.6}.sources-steps{display:grid;gap:26px;margin:0;padding:0;list-style:none}.sources-steps li{display:flex;align-items:flex-start;gap:18px}.sources-steps b{flex-shrink:0;font-size:11px;color:var(--text-muted);padding-top:3px;font-variant-numeric:tabular-nums}.sources-steps li>div{display:grid;gap:7px}.sources-steps strong{font-size:13px}.sources-steps span{color:var(--text-secondary);font-size:12px;line-height:1.7}.sources-summary{display:flex;gap:22px;flex-wrap:wrap;font-size:12px;color:var(--text-secondary)}.sources-summary>span{display:flex;align-items:center;gap:7px}.sources-summary b{color:var(--text-primary)}.sources-summary svg{font-size:15px}.summary-dot{width:7px;height:7px;border-radius:50%;background:var(--success)}.sources-summary__error{color:var(--warning)}.sources-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:12px}.sources-search{display:flex;align-items:center;gap:10px;min-width:0;border:1px solid var(--border-color);border-radius:10px;padding:0 12px;background:var(--field-bg);color:var(--text-muted)}.sources-search input{width:100%;min-width:0;min-height:40px;border:0;background:transparent;color:var(--text-primary);outline:none;font-size:12px}.sources-search:focus-within{outline:2px solid var(--accent);outline-offset:2px}.source-list{display:grid;gap:10px}.sources-footnote{display:flex;gap:10px;max-width:800px;color:var(--text-muted)}.sources-footnote svg{flex-shrink:0;margin-top:2px}.sources-footnote p{margin:0;font-size:11px;line-height:1.7}.sources-no-results{display:grid;place-items:center;align-content:center;gap:12px;min-height:200px;border:1px dashed var(--border-color);border-radius:14px;color:var(--text-secondary);font-size:12px}
@media(max-width:750px){.sources-welcome{grid-template-columns:1fr;padding:24px;gap:32px}.sources-welcome h3{font-size:24px}.sources-steps{border-top:1px solid var(--border-color);padding-top:24px;gap:20px}.sources-header{align-items:flex-start;flex-direction:column;gap:14px}.sources-toolbar{grid-template-columns:1fr}.sources-summary{gap:12px;font-size:11px}.sources-header h2{font-size:22px}}
</style>
