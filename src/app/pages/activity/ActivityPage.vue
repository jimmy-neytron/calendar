<template>
  <section class="activity-page">
    <header class="activity-hero panel">
      <div><span>История пространства</span><h1>Активность</h1><p>События, фильмы, спорт, идеи, дни рождения и изменения пространства в одном журнале.</p></div>
      <strong>{{ total }}</strong><small>записей</small>
    </header>

    <section class="activity-filters panel">
      <UiInput v-model="filters.query" placeholder="Поиск по изменениям" @keydown.enter="applyFilters" />
      <UiSelect v-model="filters.action">
        <option value="all">Все действия</option>
        <option value="event">События</option>
        <option value="movie">Фильмы</option>
        <option value="sport">Спорт</option>
        <option value="idea">Идеи</option>
        <option value="birthday">Дни рождения</option>
        <option value="calendar">Календари</option>
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
      <header v-if="isAdmin && entries.length" class="activity-admin">
        <label>
          <input type="checkbox" :checked="allPageSelected" @change="togglePageSelection">
          <span>{{ allPageSelected ? 'Снять выбор' : 'Выбрать страницу' }}</span>
        </label>
        <small v-if="selectedIds.length">Выбрано: {{ selectedIds.length }}</small>
        <div>
          <UiButton
            v-if="selectedIds.length"
            size="sm"
            variant="danger"
            :loading="deleting"
            @click="deleteSelected"
          >
            Удалить выбранные
          </UiButton>
          <UiButton
            size="sm"
            variant="danger"
            icon="trash"
            :loading="deleting && !selectedIds.length"
            :disabled="deleting"
            @click="clearAll"
          >
            Удалить всю историю
          </UiButton>
        </div>
      </header>

      <div v-if="loading" class="activity-state">Загружаем историю…</div>
      <div v-else-if="!entries.length" class="activity-state">
        <UiIcon name="activity" />
        <strong>Записей не найдено</strong>
        <span>Измени фильтры или выполни действие в любом разделе.</span>
      </div>
      <div v-else class="activity-list">
        <article v-for="entry in entries" :key="entry.id" :class="{ selected: isSelected(entry.id) }">
          <label v-if="isAdmin" class="activity-list__select" :aria-label="`Выбрать запись: ${entry.text}`">
            <input
              type="checkbox"
              :checked="isSelected(entry.id)"
              @change="toggleEntry(entry.id)"
            >
            <span><UiIcon name="check" /></span>
          </label>
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
import { deleteActivity, listActivity } from '../../api/supabase/activity.api.js'
import { workspaceStore } from '../../stores/workspace.store.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { useActivityLog } from '../../composables/history/useActivityLog.js'

const pageSize = 15
const page = ref(1)
const total = ref(0)
const entries = ref([])
const loading = ref(false)
const deleting = ref(false)
const selectedIds = ref([])
const members = workspaceStore.activeWorkspaceMembers
const { notify } = useNotification()
const { forgetActivity } = useActivityLog()
const filters = reactive({ query: '', action: 'all', userId: 'all' })
const isAdmin = computed(() => ['owner', 'admin'].includes(workspaceStore.getCurrentUserRole()))
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const visiblePages = computed(() => Array.from({ length: pageCount.value }, (_, index) => index + 1).filter((number) => Math.abs(number - page.value) <= 2))
const allPageSelected = computed(() => entries.value.length > 0 && entries.value.every((entry) => selectedIds.value.includes(entry.id)))

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
  selectedIds.value = selectedIds.value.filter((id) => entries.value.some((entry) => entry.id === id))
}
function applyFilters() { selectedIds.value = []; page.value = 1; load() }
function goPage(value) { selectedIds.value = []; page.value = Math.min(pageCount.value, Math.max(1, value)); load() }
function isSelected(id) { return selectedIds.value.includes(id) }
function toggleEntry(id) {
  selectedIds.value = isSelected(id)
    ? selectedIds.value.filter((item) => item !== id)
    : [...selectedIds.value, id]
}
function togglePageSelection() {
  selectedIds.value = allPageSelected.value ? [] : entries.value.map((entry) => entry.id)
}
async function deleteSelected() {
  if (!selectedIds.value.length || !isAdmin.value) return
  if (!window.confirm(`Удалить выбранные записи (${selectedIds.value.length})?`)) return
  await removeActivity(selectedIds.value)
}
async function clearAll() {
  if (!isAdmin.value || !total.value) return
  if (!window.confirm(`Полностью очистить журнал активности (${total.value} записей)? Это действие нельзя отменить.`)) return
  await removeActivity(null)
}
async function removeActivity(entryIds) {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId) return
  deleting.value = true
  try {
    const { data, error } = await deleteActivity({ workspaceId, entryIds })
    if (error) {
      notify(error.code === '42883'
        ? 'Выполни миграцию очистки активности в Supabase'
        : error.message, 'danger')
      return
    }
    forgetActivity(workspaceId, entryIds)
    selectedIds.value = []
    if (entryIds && entries.value.length === entryIds.length && page.value > 1) page.value -= 1
    if (!entryIds) page.value = 1
    await load()
    notify(entryIds ? `Удалено записей: ${data || entryIds.length}` : 'Журнал активности очищен', 'success')
  } catch (error) {
    notify(error.message || 'Не удалось удалить активность', 'danger')
  } finally {
    deleting.value = false
  }
}
const entryIcon = (action) => {
  if (action.endsWith(':delete') || action === 'movie:remove') return 'trash'
  if (action.startsWith('event')) return 'calendar'
  if (action.startsWith('movie')) return 'movie'
  if (action.startsWith('sport')) return 'sport'
  if (action.startsWith('idea')) return 'sparkles'
  if (action.startsWith('birthday')) return 'heart'
  if (action.startsWith('calendar')) return 'calendar'
  if (action.startsWith('member')) return 'users'
  if (action.startsWith('workspace')) return 'settings'
  return 'activity'
}
const actionLabel = (action) => ({
  create: 'Создание',
  update: 'Изменение',
  move: 'Перенос',
  delete: 'Удаление',
  duplicate: 'Копирование',
  save: 'Добавление в список',
  remove: 'Удаление из списка',
  plan: 'Планирование',
  unplan: 'Отмена планирования',
  complete: 'Выполнение',
  uncomplete: 'Снятие отметки',
  import: 'Импорт',
  comment: 'Комментарий',
  response: 'Ответ участника',
  role: 'Изменение роли',
  invite: 'Приглашение',
  calendar: 'Календарь',
  color: 'Изменение цвета',
  visibility: 'Видимость',
  'gift-add': 'Идея подарка',
  'gift-toggle': 'Статус подарка',
  'gift-delete': 'Удаление подарка',
}[action.split(':')[1]] || 'Изменение')
const formatDate = (value) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
watch(() => workspaceStore.activeWorkspaceId.value, () => { selectedIds.value = []; page.value = 1; load() }, { immediate: true })
</script>

<style scoped>
.activity-page{display:grid;gap:14px;max-width:1120px;margin:0 auto;padding:14px}.activity-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:6px 18px;padding:20px}.activity-hero>div{grid-row:span 2}.activity-hero span,.activity-hero small{color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:.11em}.activity-hero h1{margin:3px 0 6px}.activity-hero p{margin:0;color:var(--text-secondary)}.activity-hero>strong{font-size:38px;line-height:1}.activity-filters{display:grid;grid-template-columns:minmax(220px,1fr) 190px 190px auto;align-items:end;gap:8px;padding:12px}.activity-card{border:1px solid var(--border-color);border-radius:var(--radius-xl);background:var(--card-solid);overflow:hidden}.activity-admin{display:flex;align-items:center;gap:12px;min-height:54px;border-bottom:1px solid var(--border-color);padding:9px 14px;background:color-mix(in srgb,var(--warning) 4%,var(--control-bg))}.activity-admin>label{display:flex;align-items:center;gap:8px;color:var(--text-secondary);font-size:11px;font-weight:750;cursor:pointer}.activity-admin>small{color:var(--text-muted)}.activity-admin>div{display:flex;gap:6px;margin-left:auto}.activity-list article{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:11px;align-items:start;border-bottom:1px solid var(--border-color);padding:13px 15px;transition:background .18s var(--ease-out)}.activity-list article:has(.activity-list__select){grid-template-columns:28px 38px minmax(0,1fr) auto}.activity-list article.selected{background:color-mix(in srgb,var(--info) 6%,var(--control-bg))}.activity-list article:last-child{border-bottom:0}.activity-list__select{position:relative;display:grid;place-items:center;width:26px;height:36px;cursor:pointer}.activity-list__select input{position:absolute;opacity:0;pointer-events:none}.activity-list__select span{display:grid;place-items:center;width:20px;height:20px;border:1px solid var(--border-strong);border-radius:6px;color:transparent;background:var(--field-bg)}.activity-list__select input:checked+span{color:var(--text-inverse);border-color:var(--accent);background:var(--accent)}.activity-list__icon{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;color:var(--info);background:color-mix(in srgb,var(--info) 9%,var(--control-bg));font-size:17px}.activity-list strong,.activity-list small{display:block}.activity-list p{margin:2px 0;color:var(--text-secondary)}.activity-list small,.activity-list time{color:var(--text-muted);font-size:10px}.activity-state{display:grid;place-items:center;gap:6px;min-height:260px;color:var(--text-muted);text-align:center}.activity-state :deep(svg){font-size:28px;color:var(--info)}.activity-pagination{display:flex;justify-content:center;align-items:center;gap:5px;border-top:1px solid var(--border-color);padding:12px}.activity-pagination>button:not(.ui-icon-button){width:30px;height:30px;border:1px solid var(--border-color);border-radius:9px;color:var(--text-secondary);background:var(--control-bg)}.activity-pagination>button.active{color:var(--text-inverse);background:var(--accent)}@media(max-width:760px){.activity-page{padding:10px}.activity-filters{grid-template-columns:1fr}.activity-admin{align-items:flex-start;flex-wrap:wrap}.activity-admin>div{width:100%;margin-left:0}.activity-admin>div :deep(.ui-button){flex:1}.activity-list article,.activity-list article:has(.activity-list__select){grid-template-columns:26px 34px minmax(0,1fr)}.activity-list time{grid-column:3}.activity-hero{grid-template-columns:1fr}.activity-hero>div{grid-row:auto}}
</style>
