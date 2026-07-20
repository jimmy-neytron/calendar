<template>
<section class="family-tree-page">
  <header class="tree-toolbar">
    <div class="tree-title"><span>СЕМЬЯ · {{ people.length }} ЧЕЛ.</span><h1>Семейное дерево</h1></div>
    <div class="smart-search"><span>⌕</span><input v-model="search" placeholder="Имя, год, город, тег или заметка…" /><kbd>/</kbd></div>
    <select v-model="genderFilter"><option value="">Все</option><option value="female">Женщины</option><option value="male">Мужчины</option><option value="other">Другой</option></select>
    <label class="living-filter"><input v-model="livingOnly" type="checkbox" /> Сейчас живы</label>
    <UiButton variant="secondary" @click="exportJson">Экспорт</UiButton>
    <UiButton variant="secondary" @click="$refs.file.click()">Импорт</UiButton><input ref="file" hidden type="file" accept=".json,application/json" @change="importJson" />
    <UiButton icon="＋" @click="openCreate">Добавить человека</UiButton>
  </header>

  <div v-if="isPending" class="tree-state">Загружаем семейную историю…</div>
  <div v-else-if="isError" class="tree-state tree-state--error">Не удалось загрузить дерево. Сначала выполните SQL-миграцию.</div>
  <div v-else class="tree-stage">
    <FamilyTreeCanvas :people="people" :relationships="relationships" :positions="tree.positions" :selected-id="selectedId" :visible-ids="visibleIds" @select="selectPerson" @positions="savePositions" />
    <div class="tree-hint">Колесо — масштаб · перетаскивайте карточки · клик — подробнее</div>
    <aside v-if="selected" class="person-card">
      <button class="person-card__close" @click="selectedId=''">×</button>
      <div class="person-card__avatar">{{ initials(selected) }}</div>
      <small>{{ selected.gender==='female'?'ЖЕНЩИНА':selected.gender==='male'?'МУЖЧИНА':'ЧЕЛОВЕК' }}</small>
      <h2>{{ fullName(selected) }}</h2><p>{{ selected.birthDate || 'Дата рождения не указана' }}<template v-if="selected.deathDate"> — {{ selected.deathDate }}</template></p>
      <p v-if="selected.birthPlace">⌖ {{ selected.birthPlace }}</p><p v-if="selected.notes">{{ selected.notes }}</p>
      <div class="tags"><span v-for="tag in selected.tags" :key="tag">#{{ tag }}</span></div>
      <footer><UiButton variant="secondary" @click="editSelected">Редактировать</UiButton><UiButton variant="danger" @click="removeSelected">Удалить</UiButton></footer>
    </aside>
  </div>

  <UiModal v-model="editorOpen" :title="editingId?'Редактировать человека':'Новый человек'" eyebrow="Семейное дерево" width="620px">
    <form class="person-form" @submit.prevent="savePerson">
      <UiInput v-model="form.firstName" label="Имя *" placeholder="Анна" /><UiInput v-model="form.lastName" label="Фамилия" placeholder="Соколова" />
      <label><span>Пол</span><UiSelect v-model="form.gender"><option value="female">Женщина</option><option value="male">Мужчина</option><option value="other">Другой / не указан</option></UiSelect></label>
      <UiInput v-model="form.birthDate" type="date" label="Дата рождения" /><UiInput v-model="form.deathDate" type="date" label="Дата смерти" /><UiInput v-model="form.birthPlace" label="Место рождения" />
      <UiInput v-model="form.notes" type="textarea" label="История и заметки" /><UiInput v-model="form.tagsText" label="Теги через запятую" placeholder="ветвь Ивановых, Москва" />
      <label><span>Связать с</span><UiSelect v-model="form.relativeId"><option value="">Без новой связи</option><option v-for="p in otherPeople" :key="p.id" :value="p.id">{{ fullName(p) }}</option></UiSelect></label>
      <label><span>Тип связи</span><UiSelect v-model="form.relationshipType"><option value="parent">Этот человек — родитель</option><option value="child">Этот человек — ребёнок</option><option value="partner">Партнёры</option></UiSelect></label>
      <footer><UiButton variant="secondary" @click="editorOpen=false">Отмена</UiButton><UiButton type="submit" :loading="isSaving">Сохранить</UiButton></footer>
    </form>
  </UiModal>
</section>
</template>
<script setup>
import { computed, reactive, ref, watch } from 'vue'
import FamilyTreeCanvas from '../../components/family-tree/FamilyTreeCanvas.vue'
import UiButton from '../../components/ui/UiButton.vue';import UiInput from '../../components/ui/UiInput.vue';import UiModal from '../../components/ui/UiModal.vue';import UiSelect from '../../components/ui/UiSelect.vue'
import { workspaceStore } from '../../stores/workspace.store.js';import { useFamilyTree } from '../../composables/family-tree/useFamilyTree.js';import { useNotification } from '../../composables/ui/useNotification.js'
const workspaceId=computed(()=>workspaceStore.activeWorkspace.value?.id||'');const {data,isPending,isError,save,isSaving}=useFamilyTree(workspaceId);const {notify}=useNotification()
const cloneDocument=value=>JSON.parse(JSON.stringify(value))
const localTree=ref(null);watch(data,v=>{if(v)localTree.value=cloneDocument(v)},{immediate:true});const tree=computed(()=>localTree.value||{version:1,people:[],relationships:[],positions:{}});const people=computed(()=>tree.value.people||[]);const relationships=computed(()=>tree.value.relationships||[])
const search=ref('');const genderFilter=ref('');const livingOnly=ref(false);const selectedId=ref('');const editorOpen=ref(false);const editingId=ref('')
const empty=()=>({firstName:'',lastName:'',gender:'other',birthDate:'',deathDate:'',birthPlace:'',notes:'',tagsText:'',relativeId:'',relationshipType:'parent'});const form=reactive(empty())
const normalize=v=>String(v||'').toLocaleLowerCase('ru-RU').replace(/ё/g,'е');const visibleIds=computed(()=>{const terms=normalize(search.value).split(/\s+/).filter(Boolean);return people.value.filter(p=>(!genderFilter.value||p.gender===genderFilter.value)&&(!livingOnly.value||!p.deathDate)&&terms.every(t=>normalize([p.firstName,p.lastName,p.birthDate,p.deathDate,p.birthPlace,p.notes,...(p.tags||[])].join(' ')).includes(t))).map(p=>p.id)})
const selected=computed(()=>people.value.find(p=>p.id===selectedId.value));const otherPeople=computed(()=>people.value.filter(p=>p.id!==editingId.value));const fullName=p=>[p.firstName,p.lastName].filter(Boolean).join(' ');const initials=p=>[p.firstName,p.lastName].filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()
function openCreate(){editingId.value='';Object.assign(form,empty());editorOpen.value=true}function editSelected(){editingId.value=selected.value.id;Object.assign(form,empty(),selected.value,{tagsText:(selected.value.tags||[]).join(', ')});editorOpen.value=true}function selectPerson(id){selectedId.value=id}
async function persist(next,message){localTree.value=next;try{await save(next);if(message)notify(message,'success')}catch(e){notify(e.message,'warning')}}
async function savePerson(){if(!form.firstName.trim())return notify('Укажите имя','warning');const id=editingId.value||crypto.randomUUID();const person={id,firstName:form.firstName.trim(),lastName:form.lastName.trim(),gender:form.gender,birthDate:form.birthDate,deathDate:form.deathDate,birthPlace:form.birthPlace.trim(),notes:form.notes.trim(),tags:form.tagsText.split(',').map(x=>x.trim()).filter(Boolean)};const next=cloneDocument(tree.value);const i=next.people.findIndex(p=>p.id===id);if(i<0)next.people.push(person);else next.people[i]=person;if(form.relativeId&&!editingId.value){let from=id,to=form.relativeId;if(form.relationshipType==='child'){from=form.relativeId;to=id}next.relationships.push({id:crypto.randomUUID(),from,to,type:form.relationshipType==='partner'?'partner':'parent'})}await persist(next,'Дерево сохранено');selectedId.value=id;editorOpen.value=false}
async function removeSelected(){if(!confirm('Удалить человека и все его связи?'))return;const id=selectedId.value;const next=cloneDocument(tree.value);next.people=next.people.filter(p=>p.id!==id);next.relationships=next.relationships.filter(r=>r.from!==id&&r.to!==id);delete next.positions[id];selectedId.value='';await persist(next,'Человек удалён')}
let positionTimer;function savePositions(positions){localTree.value={...tree.value,positions};clearTimeout(positionTimer);positionTimer=setTimeout(()=>persist(cloneDocument(localTree.value)),500)}
function exportJson(){const blob=new Blob([JSON.stringify(tree.value,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`family-tree-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)}
async function importJson(e){try{const parsed=JSON.parse(await e.target.files[0].text());if(!Array.isArray(parsed.people)||!Array.isArray(parsed.relationships))throw new Error('Неверный формат JSON');await persist({version:Number(parsed.version)||1,people:parsed.people,relationships:parsed.relationships,positions:parsed.positions||{}},'Дерево импортировано')}catch(err){notify(err.message,'warning')}finally{e.target.value=''}}
</script>
<style scoped>
.family-tree-page{height:calc(100dvh - var(--header-height));display:grid;grid-template-rows:auto minmax(0,1fr);padding:12px;gap:10px}.tree-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.tree-title{margin-right:auto}.tree-title span,.person-card small,.person-form label>span{color:var(--text-muted);font-size:9px;font-weight:800;letter-spacing:.11em}.tree-title h1{margin:2px 0 0;font-size:22px}.smart-search{min-width:290px;display:flex;align-items:center;gap:8px;border:1px solid var(--border-color);border-radius:999px;padding:0 11px;background:var(--field-bg)}.smart-search input{width:100%;height:34px;border:0;outline:0;color:var(--text-primary);background:transparent}.smart-search kbd{color:var(--text-muted)}.tree-toolbar>select,.living-filter{height:34px;border:1px solid var(--border-color);border-radius:999px;padding:0 11px;color:var(--text-secondary);background:var(--control-bg)}.living-filter{display:flex;align-items:center;gap:6px}.tree-stage{position:relative;min-height:500px;border:1px solid var(--border-color);border-radius:18px;overflow:hidden}.tree-hint{position:absolute;left:14px;bottom:12px;border:1px solid var(--border-color);border-radius:999px;padding:7px 10px;color:var(--text-muted);background:var(--sidebar-floating-bg);font-size:10px}.tree-state{display:grid;place-items:center;color:var(--text-muted)}.tree-state--error{color:var(--danger)}.person-card{position:absolute;top:12px;right:12px;width:280px;border:1px solid var(--border-strong);border-radius:16px;padding:18px;background:var(--sidebar-floating-bg);box-shadow:var(--shadow-lg)}.person-card__close{position:absolute;right:10px;top:8px;border:0;color:var(--text-muted);background:none;font-size:22px}.person-card__avatar{display:grid;place-items:center;width:58px;height:58px;margin-bottom:12px;border-radius:18px;color:var(--text-inverse);background:var(--accent);font-weight:900}.person-card h2{margin:4px 0}.person-card p{color:var(--text-secondary)}.tags{display:flex;gap:5px;flex-wrap:wrap}.tags span{border-radius:999px;padding:4px 7px;color:var(--text-muted);background:var(--control-bg);font-size:9px}.person-card footer,.person-form footer{display:flex;justify-content:flex-end;gap:7px;margin-top:16px}.person-form{display:grid;grid-template-columns:1fr 1fr;gap:10px}.person-form label{display:grid;gap:5px}.person-form footer,.person-form>:nth-child(7),.person-form>:nth-child(8){grid-column:1/-1}@media(max-width:900px){.family-tree-page{height:auto}.tree-stage{height:70vh}.smart-search{order:3;width:100%}.person-card{left:10px;right:10px;top:auto;bottom:46px;width:auto}.person-form{grid-template-columns:1fr}.person-form>*{grid-column:1!important}}
</style>