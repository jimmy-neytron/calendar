<template>
  <section class="activity-page">
    <header class="activity-hero panel">
      <div><span>История пространства</span><h1>Активность</h1><p>Все изменения календаря с удобным поиском, фильтрами и страницами.</p></div>
      <strong>{{ total }}</strong><small>записей</small>
    </header>

    <section class="activity-filters panel">
      <UiInput v-model="filters.query" placeholder="Поиск по изменениям" @keydown.enter="applyFilters" />
      <UiSelect v-model="filters.action">
        <option value="all">Все действия</option>
        <option value="event">События</option>
        <option value="workspace">Пространство</option>
        <option value="member">Участники</option>
      </UiSelect>
      <UiSelect v-model="filters.userId">
        <option value="all">Все участники</option>
        <option v-for="member in members" :key="member.id" :value="member.id">{{ member.name }}</option>
      </UiSelect>
      <UiButton icon="⌕" @click="applyFilters">Применить</UiButton>
    </section>

    <section class="activity-card">
      <div v-if="loading" class="activity-state">Загружаем историю…</div>
      <div v-else-if="!entries.length" class="activity-state">
        <UiIcon name="activity" />
        <strong>Записей не найдено</strong>
        <span>Измени фильтры или создай событие в календаре.</span>
      </div>
      <div v-else class="activity-list">
        <article v-for="entry in entries" :key="entry.id">
          <span class="activity-list__icon"><UiIcon :name="entryIcon(entry.action)" /></span>
          <div><strong>{{ entry.userName }}</strong><p>{{ entry.text }}</p><small>{{ actionLabel(entry.action) }}</small></div>
          <time>{{ formatDate(entry.createdAt) }}</time>
        </article>
      </div>

      <footer v-if="pageCount > 1" class="activity-pagination">
        <UiIconButton icon="left" label="Предыдущая страница" :disabled="page === 1" @click="goPage(page - 1)" />
        <button v-for="number in visiblePages" :key="number" type="button" :class="{ active: number === page }" @click="goPage(number)">{{ number }}</button>
        <UiIconButton icon="right" label="Следующая страница" :disabled="page === pageCount" @click="goPage(page + 1)" />
      </footer>
    </section>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import UiIconButton from '../../components/ui/UiIconButton.vue'
import UiInput from '../../components/ui/UiInput.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import { listActivity } from '../../api/supabase/activity.api.js'
import { workspaceStore } from '../../stores/workspace.store.js'

const pageSize = 15
const page = ref(1)
const total = ref(0)
const entries = ref([])
const loading = ref(false)
const members = workspaceStore.activeWorkspaceMembers
const filters = reactive({ query: '', action: 'all', userId: 'all' })
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const visiblePages = computed(() => Array.from({ length: pageCount.value }, (_, index) => index + 1).filter((number) => Math.abs(number - page.value) <= 2))

async function load() {
  const workspaceId = workspaceStore.activeWorkspace.value?.id
  if (!workspaceId) return
  loading.value = true
  const { data, count, error } = await listActivity({ workspaceId, page: page.value, pageSize, ...filters })
  loading.value = false
  if (error) return
  entries.value = (data || []).map((row) => ({
    id: row.id, action: row.action, text: row.message, userId: row.actor_id,
    userName: row.metadata?.userName || 'Пользователь', createdAt: row.created_at,
  }))
  total.value = count || 0
}
function applyFilters() { page.value = 1; load() }
function goPage(value) { page.value = Math.min(pageCount.value, Math.max(1, value)); load() }
const entryIcon = (action) => action.startsWith('event:delete') ? 'trash' : action.startsWith('event') ? 'calendar' : 'activity'
const actionLabel = (action) => ({ create: 'Создание', update: 'Изменение', move: 'Перенос', delete: 'Удаление', duplicate: 'Копирование' }[action.split(':')[1]] || 'Изменение')
const formatDate = (value) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
watch(() => workspaceStore.activeWorkspaceId.value, () => { page.value = 1; load() }, { immediate: true })
</script>

<style scoped>
.activity-page{display:grid;gap:14px;max-width:1120px;margin:0 auto;padding:14px}.activity-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:6px 18px;padding:20px}.activity-hero>div{grid-row:span 2}.activity-hero span,.activity-hero small{color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:.11em}.activity-hero h1{margin:3px 0 6px}.activity-hero p{margin:0;color:var(--text-secondary)}.activity-hero>strong{font-size:38px;line-height:1}.activity-filters{display:grid;grid-template-columns:minmax(220px,1fr) 190px 190px auto;align-items:end;gap:8px;padding:12px}.activity-card{border:1px solid var(--border-color);border-radius:var(--radius-xl);background:var(--card-solid);overflow:hidden}.activity-list article{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:11px;align-items:start;border-bottom:1px solid var(--border-color);padding:13px 15px}.activity-list article:last-child{border-bottom:0}.activity-list__icon{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;color:var(--info);background:color-mix(in srgb,var(--info) 9%,var(--control-bg));font-size:17px}.activity-list strong,.activity-list small{display:block}.activity-list p{margin:2px 0;color:var(--text-secondary)}.activity-list small,.activity-list time{color:var(--text-muted);font-size:10px}.activity-state{display:grid;place-items:center;gap:6px;min-height:260px;color:var(--text-muted);text-align:center}.activity-state :deep(svg){font-size:28px;color:var(--info)}.activity-pagination{display:flex;justify-content:center;align-items:center;gap:5px;border-top:1px solid var(--border-color);padding:12px}.activity-pagination>button:not(.ui-icon-button){width:30px;height:30px;border:1px solid var(--border-color);border-radius:9px;color:var(--text-secondary);background:var(--control-bg)}.activity-pagination>button.active{color:var(--text-inverse);background:var(--accent)}@media(max-width:760px){.activity-page{padding:10px}.activity-filters{grid-template-columns:1fr}.activity-list article{grid-template-columns:34px minmax(0,1fr)}.activity-list time{grid-column:2}.activity-hero{grid-template-columns:1fr}.activity-hero>div{grid-row:auto}}
</style>
