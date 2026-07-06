<template>
  <section class="admin-users-page">
    <header class="admin-section-hero">
      <div>
        <span>Пользователи</span>
        <h1>Аккаунты и доступы</h1>
        <p>Поиск пользователей, роли, тарифы и деактивация аккаунтов.</p>
      </div>
      <UiButton icon="refresh" variant="secondary" :loading="isLoading" @click="loadUsers">
        Обновить
      </UiButton>
    </header>

    <section class="admin-stats">
      <article>
        <span class="admin-stat-icon"><UiIcon name="users" /></span>
        <div>
          <small>Всего</small>
          <strong>{{ users.length }}</strong>
          <span>пользователей</span>
        </div>
      </article>
      <article>
        <span class="admin-stat-icon admin-stat-icon--success"><UiIcon name="check" /></span>
        <div>
          <small>Активные</small>
          <strong>{{ activeCount }}</strong>
          <span>могут войти</span>
        </div>
      </article>
      <article>
        <span class="admin-stat-icon admin-stat-icon--warning"><UiIcon name="key" /></span>
        <div>
          <small>Админы</small>
          <strong>{{ adminCount }}</strong>
          <span>с доступом</span>
        </div>
      </article>
    </section>

    <section class="admin-toolbar panel">
      <UiInput v-model="searchQuery" placeholder="Поиск по имени или email" aria-label="Поиск пользователей" />
      <UiSelect v-model="statusFilter" aria-label="Фильтр по статусу">
        <option value="all">Все статусы</option>
        <option value="active">Активные</option>
        <option value="inactive">Деактивированные</option>
      </UiSelect>
      <UiSelect v-model="roleFilter" aria-label="Фильтр по роли">
        <option value="all">Все роли</option>
        <option value="admin">Админы</option>
        <option value="user">Пользователи</option>
      </UiSelect>
    </section>

    <section class="admin-panel">
      <div v-if="isLoading" class="admin-state">
        <span><UiIcon name="refresh" /></span>
        <strong>Загружаем пользователей</strong>
      </div>
      <div v-else-if="errorMessage" class="admin-state admin-state--danger">
        <span><UiIcon name="warning" /></span>
        <strong>{{ errorMessage }}</strong>
      </div>
      <div v-else-if="!filteredUsers.length" class="admin-state">
        <span><UiIcon name="search" /></span>
        <strong>Ничего не найдено</strong>
      </div>
      <div v-else class="admin-table">
        <div class="admin-table__row admin-table__row--head">
          <strong>Пользователь</strong>
          <strong>Статус</strong>
          <strong>Роль</strong>
          <strong>Тариф</strong>
          <strong>Действия</strong>
        </div>

        <article v-for="user in filteredUsers" :key="user.id" class="admin-table__row">
          <div class="admin-user">
            <span class="admin-user__avatar" :style="{ '--user-color': user.color }">
              {{ user.avatar || '?' }}
            </span>
            <div>
              <strong>{{ user.name || 'Пользователь' }}</strong>
              <small>{{ user.email }}</small>
            </div>
          </div>

          <span class="admin-badge" :class="user.isActive ? 'admin-badge--success' : 'admin-badge--danger'">
            {{ user.isActive ? 'Активен' : 'Отключён' }}
          </span>

          <UiSelect
            :model-value="user.role"
            compact
            aria-label="Роль пользователя"
            :disabled="isSaving(user.id) || !user.isActive"
            @update:model-value="updateUser(user, { role: $event })"
          >
            <option value="user">Пользователь</option>
            <option value="admin">Админ</option>
          </UiSelect>

          <UiSelect
            :model-value="user.subscriptionTier"
            compact
            aria-label="Тариф пользователя"
            :disabled="isSaving(user.id) || !user.isActive"
            @update:model-value="updateUser(user, { subscriptionTier: $event })"
          >
            <option v-for="plan in plans" :key="plan.id" :value="plan.id">
              {{ plan.name }}
            </option>
          </UiSelect>

          <div class="admin-actions">
            <RouterLink class="admin-user-details-link" :to="{ name: 'admin-user-detail', params: { userId: user.id } }">
              Открыть
            </RouterLink>
            <UiButton
              size="sm"
              :variant="user.isActive ? 'danger' : 'secondary'"
              :disabled="isCurrentUser(user) || isSaving(user.id)"
              :loading="savingUserId === user.id"
              @click="updateUser(user, { isActive: !user.isActive })"
            >
              {{ user.isActive ? 'Деактивировать' : 'Активировать' }}
            </UiButton>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { adminApi } from '../api/admin.api.js'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import { useNotification } from '../../../composables/ui/useNotification.js'
import { authStore } from '../../../stores/auth.store.js'
import { SUBSCRIPTION_TIERS, normalizeSubscriptionTier } from '../../../utils/constants/subscriptionConstants.js'

const { notify } = useNotification()
const users = ref([])
const isLoading = ref(false)
const savingUserId = ref('')
const errorMessage = ref('')
const searchQuery = ref('')
const statusFilter = ref('all')
const roleFilter = ref('all')

const plans = Object.values(SUBSCRIPTION_TIERS)
const activeCount = computed(() => users.value.filter((user) => user.isActive).length)
const adminCount = computed(() => users.value.filter((user) => user.role === 'admin').length)
const filteredUsers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return users.value.filter((user) => {
    const matchesQuery = !query
      || user.name.toLowerCase().includes(query)
      || user.email.toLowerCase().includes(query)
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'active' && user.isActive)
      || (statusFilter.value === 'inactive' && !user.isActive)
    const matchesRole = roleFilter.value === 'all' || user.role === roleFilter.value
    return matchesQuery && matchesStatus && matchesRole
  })
})

function mapAdminUser(row) {
  const name = row.name || row.email?.split('@')[0] || 'Пользователь'
  return {
    id: row.id,
    email: row.email || '',
    name,
    avatar: row.avatar || name.slice(0, 1).toUpperCase(),
    color: row.color || '#60a5fa',
    subscriptionTier: normalizeSubscriptionTier(row.subscription_tier),
    workspaceLimit: Number(row.workspace_limit || 0),
    role: row.role || 'user',
    isActive: row.is_active !== false,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  }
}

async function loadUsers() {
  if (isLoading.value) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await adminApi.listUsers()
    if (error) {
      errorMessage.value = error.message || 'Не удалось загрузить пользователей'
      return
    }
    users.value = (data || []).map(mapAdminUser)
  } catch (error) {
    errorMessage.value = error.message || 'Не удалось загрузить пользователей'
  } finally {
    isLoading.value = false
  }
}

function isCurrentUser(user) {
  return user.id === authStore.currentUserId.value
}

function isSaving(userId) {
  return savingUserId.value === userId
}

async function updateUser(user, updates) {
  if (savingUserId.value) return
  if (updates.isActive === false && isCurrentUser(user)) {
    notify('Свой аккаунт нельзя деактивировать', 'warning')
    return
  }

  savingUserId.value = user.id
  try {
    const { data, error } = await adminApi.updateUser(user.id, updates)
    if (error) {
      notify(error.message || 'Не удалось обновить пользователя', 'danger')
      return
    }

    const updated = mapAdminUser(data)
    users.value = users.value.map((item) => (item.id === user.id ? updated : item))
    if (isCurrentUser(updated)) authStore.mergeUsers([updated])
    notify('Пользователь обновлён', 'success')
  } catch (error) {
    notify(error.message || 'Не удалось обновить пользователя', 'danger')
  } finally {
    savingUserId.value = ''
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.admin-users-page{display:grid;gap:12px}.admin-section-hero{display:flex;align-items:center;justify-content:space-between;gap:18px}.admin-section-hero span{color:var(--accent);font-size:9px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}.admin-section-hero h1{margin:5px 0 7px}.admin-section-hero p{margin:0;color:var(--text-secondary)}.admin-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.admin-stats article{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;gap:10px;min-height:72px;border:1px solid var(--border-color);border-radius:8px;padding:9px 12px;background:var(--card-solid);box-shadow:var(--shadow-sm)}.admin-stat-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:8px;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--control-bg));font-size:18px}.admin-stat-icon--success{color:var(--success);background:color-mix(in srgb,var(--success) 10%,var(--control-bg))}.admin-stat-icon--warning{color:var(--warning);background:color-mix(in srgb,var(--warning) 11%,var(--control-bg))}.admin-stats small{color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.admin-stats strong{display:block;margin:3px 0 2px;font-size:22px;line-height:1}.admin-stats span:not(.admin-stat-icon){color:var(--text-secondary);font-size:11px}.admin-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) 180px 180px;align-items:center;gap:8px;max-height:58px;padding:8px;overflow:visible}.admin-panel{overflow:hidden;border:1px solid var(--border-color);border-radius:8px;background:var(--card-solid);box-shadow:var(--shadow-sm)}.admin-state{display:grid;justify-items:center;gap:8px;padding:48px 16px;color:var(--text-secondary);text-align:center}.admin-state span{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--control-bg));font-size:20px}.admin-state--danger span{color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,var(--control-bg))}.admin-table{display:grid;overflow-x:auto}.admin-table__row{display:grid;grid-template-columns:minmax(250px,1.5fr) 120px 150px 150px 190px;align-items:center;gap:12px;min-width:870px;border-top:1px solid var(--border-color);padding:11px 14px}.admin-table__row:first-child{border-top:0}.admin-table__row--head{min-height:42px;color:var(--text-muted);background:var(--control-bg);font-size:10px;letter-spacing:.08em;text-transform:uppercase}.admin-user{display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:10px;min-width:0}.admin-user__avatar{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;color:#071016;background:var(--user-color,var(--accent));font-weight:850}.admin-user strong,.admin-user small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.admin-user small{margin-top:2px;color:var(--text-muted);font-size:10px}.admin-badge{display:inline-flex;justify-content:center;border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:5px 8px;font-size:10px;font-weight:850}.admin-badge--success{color:var(--success);border-color:color-mix(in srgb,var(--success) 28%,var(--border-color));background:color-mix(in srgb,var(--success) 8%,var(--control-bg))}.admin-badge--danger{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 28%,var(--border-color));background:color-mix(in srgb,var(--danger) 8%,var(--control-bg))}.admin-actions{display:flex;justify-content:flex-end;align-items:center;gap:8px}.admin-user-details-link{display:inline-flex;align-items:center;justify-content:center;min-height:32px;border:1px solid var(--border-color);border-radius:8px;padding:0 10px;color:var(--text-secondary);background:var(--control-bg);font-size:12px;font-weight:750;text-decoration:none;transition:color .18s var(--ease-out),border-color .18s var(--ease-out),background .18s var(--ease-out)}.admin-user-details-link:hover{color:var(--text-primary);border-color:var(--border-strong);background:var(--control-bg-hover)}@media(max-width:760px){.admin-section-hero{display:grid}.admin-stats,.admin-toolbar{grid-template-columns:1fr}.admin-toolbar{max-height:none}.admin-panel{overflow-x:auto}}
</style>
