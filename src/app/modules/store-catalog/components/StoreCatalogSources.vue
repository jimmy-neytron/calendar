<template>
  <section class="sources-layout">
    <form class="source-form panel" @submit.prevent="submit">
      <header><small>Новый раздел</small><h2>Добавить источник</h2><p>«Авто» управляет обновлением каждые 12 часов при настроенном расписании. «Обновить сейчас» работает и при выключенном авто. Автообновляемые источники должны относиться к одному магазину и режиму покупки.</p></header>
      <label>Название раздела<input v-model.trim="draft.name" required maxlength="120" placeholder="Молоко и яйца" /></label>
      <label>Ссылка Магнита<input v-model.trim="draft.url" required type="url" placeholder="https://magnit.ru/catalog/..." /></label>
      <label>Код магазина<input v-model.trim="draft.storeCode" maxlength="80" placeholder="Автоматически из shopCode" /><small>Можно не заполнять, если параметр shopCode уже есть в ссылке.</small></label>
      <UiButton type="submit" icon="plus" :loading="saving">Добавить источник</UiButton>
    </form>

    <div class="source-list">
      <article v-if="!sources.length" class="empty-state"><UiIcon name="link"/><strong>Источников пока нет</strong><span>Добавьте первую ссылку на раздел каталога.</span></article>
      <article v-for="source in sources" v-else :key="source.id" class="source-card" :class="`source-card--${source.status}`">
        <header><span class="source-icon"><UiIcon name="link"/></span><div><small>Магнит · {{ source.storeCode }}</small><h3>{{ source.name }}</h3><a :href="source.url" target="_blank" rel="noreferrer">{{ compactUrl(source.url) }}</a></div><div class="source-auto"><span>Авто</span><UiToggle :model-value="source.enabled" :label="source.enabled ? 'Выключить автообновление' : 'Включить автообновление'" @update:model-value="$emit('toggle', source.id, $event)"/></div></header>
        <dl><div><dt>Товаров</dt><dd>{{ source.productCount }}</dd></div><div><dt>Последняя синхронизация</dt><dd>{{ formatDate(source.lastSyncedAt) }}</dd></div><div><dt>Следующий автозапуск</dt><dd>{{ source.enabled ? formatDate(source.nextSyncAt) : 'Авто выключено' }}</dd></div></dl>
        <p v-if="source.lastError" class="source-error"><UiIcon name="warning"/>{{ source.lastError }}</p>
        <footer><span :class="`status status--${source.status}`">{{ statusLabel(source.status) }}</span><UiButton size="sm" variant="secondary" icon="refresh" :disabled="Boolean(syncingSourceId)" :loading="syncingSourceId === source.id" @click="$emit('sync', source.id)">Обновить сейчас</UiButton></footer>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiToggle from '../../../components/ui/UiToggle.vue'
import type { StoreCatalogSource, StoreSourceDraft, StoreSourceStatus } from '../types/storeCatalog.types'
defineProps<{ sources: StoreCatalogSource[]; saving: boolean; syncingSourceId: string }>()
const emit=defineEmits<{ add:[draft:StoreSourceDraft];toggle:[id:string,enabled:boolean];sync:[id:string] }>()
const draft=reactive<StoreSourceDraft>({name:'',url:'',storeCode:''});function submit(){const storeCode=draft.storeCode||getStoreCode(draft.url);emit('add',{...draft,storeCode});draft.name='';draft.url='';draft.storeCode=''}
function getStoreCode(value:string){try{return new URL(value).searchParams.get('shopCode')?.trim()||''}catch{return ''}}
const compactUrl=(v:string)=>{try{const u=new URL(v);return `${u.hostname}${u.pathname}`}catch{return v}}
const formatDate=(v:string|null)=>v?new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'Ещё не запускалась'
const statusLabel=(v:StoreSourceStatus)=>({idle:'Ожидает',syncing:'Обновляется',success:'Актуален',error:'Ошибка'}[v])
</script>

<style scoped>
.source-auto{display:flex;align-items:center;gap:6px;color:var(--text-secondary);font-size:12px}
.sources-layout{display:grid;grid-template-columns:300px minmax(0,1fr);align-items:start;gap:12px}.source-form{position:sticky;top:82px;display:grid;gap:12px;padding:15px}.source-form header small{color:var(--info);font-size:11px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.source-form h2{margin:4px 0}.source-form header p{margin:0;color:var(--text-muted);font-size:10px;line-height:1.5}.source-form label{display:grid;gap:5px;color:var(--text-secondary);font-size:10px;font-weight:750}.source-form label>small{color:var(--text-muted);font-size:10px;font-weight:500;line-height:1.4}.source-form input{min-width:0;min-height:37px;border:1px solid var(--border-color);border-radius:9px;padding:0 10px;color:var(--text-primary);background:var(--field-bg)}.source-list{display:grid;gap:8px}.source-card{display:grid;gap:12px;border:1px solid var(--border-color);border-radius:11px;padding:13px;background:var(--card-solid);box-shadow:var(--shadow-sm)}.source-card--error{border-color:color-mix(in srgb,var(--danger) 30%,var(--border-color))}.source-card header{display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:10px}.source-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:9px;color:var(--text-inverse);background:var(--accent)}.source-card header small{color:var(--text-muted);font-size:8px;text-transform:uppercase}.source-card h3{margin:2px 0;font-size:14px}.source-card a{display:block;overflow:hidden;color:var(--info);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.source-card dl{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:0}.source-card dl div{border:1px solid var(--border-color);border-radius:8px;padding:8px;background:var(--control-bg)}.source-card dt{color:var(--text-muted);font-size:8px;text-transform:uppercase}.source-card dd{margin:4px 0 0;font-size:10px;font-weight:750}.source-card footer{display:flex;align-items:center;justify-content:space-between;gap:8px}.status{border-radius:99px;padding:5px 8px;color:var(--text-muted);background:var(--control-bg);font-size:9px;font-weight:800}.status--success{color:var(--success);background:color-mix(in srgb,var(--success) 9%,var(--control-bg))}.status--error{color:var(--danger);background:color-mix(in srgb,var(--danger) 9%,var(--control-bg))}.status--syncing{color:var(--info)}.source-error{display:flex;gap:6px;margin:0;border-radius:8px;padding:8px;color:var(--danger);background:color-mix(in srgb,var(--danger) 7%,transparent);font-size:9px}.empty-state{display:grid;place-items:center;gap:7px;min-height:280px;border:1px dashed var(--border-color);border-radius:11px;color:var(--text-muted);text-align:center}.empty-state span{font-size:10px}@media(max-width:900px){.sources-layout{grid-template-columns:1fr}.source-form{position:static}.source-card dl{grid-template-columns:1fr}} 
</style>
