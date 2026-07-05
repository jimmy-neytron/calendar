<template>
  <section class="admin-user-detail-page">
    <header class="admin-user-detail-hero">
      <RouterLink class="admin-user-detail-back" :to="{ name: 'admin-users' }">
        Назад
      </RouterLink>
      <div v-if="user" class="admin-user-detail-profile">
        <span class="admin-user-detail-avatar" :style="{ '--user-color': user.color }">
          {{ user.avatar || '?' }}
        </span>
        <div>
          <span>Пользователь</span>
          <h1>{{ user.name || 'Пользователь' }}</h1>
          <p>{{ user.email || 'Email не указан' }}</p>
        </div>
      </div>
      <UiButton icon="refresh" variant="secondary" :loading="isLoading" @click="loadPageData">
        Обновить
      </UiButton>
    </header>

    <div v-if="isLoading && !user" class="admin-state">
      <span><UiIcon name="refresh" /></span>
      <strong>Загружаем пользователя</strong>
    </div>

    <div v-else-if="errorMessage" class="admin-state admin-state--danger">
      <span><UiIcon name="warning" /></span>
      <strong>{{ errorMessage }}</strong>
    </div>

    <template v-else-if="user">
      <section class="admin-user-detail-stats">
        <article v-for="item in statisticCards" :key="item.label">
          <span class="admin-user-detail-stat-icon" :class="item.tone">
            <UiIcon :name="item.icon" />
          </span>
          <div>
            <small>{{ item.label }}</small>
            <strong>{{ item.value }}</strong>
            <span>{{ item.caption }}</span>
          </div>
        </article>
      </section>

      <section class="admin-user-detail-grid">
        <article class="admin-user-detail-panel">
          <header>
            <UiIcon name="user" />
            <strong>Информация</strong>
          </header>
          <dl class="admin-user-detail-list">
            <div>
              <dt>ID</dt>
              <dd>{{ user.id }}</dd>
            </div>
            <div>
              <dt>Создан</dt>
              <dd>{{ formatDate(user.createdAt) }}</dd>
            </div>
            <div>
              <dt>Обновлён</dt>
              <dd>{{ formatDate(user.updatedAt) }}</dd>
            </div>
            <div>
              <dt>В аккаунте</dt>
              <dd>{{ accountAgeLabel }}</dd>
            </div>
            <div>
              <dt>Тариф</dt>
              <dd>{{ currentPlan.name }} · лимит {{ user.workspaceLimit }}</dd>
            </div>
          </dl>
        </article>

        <article class="admin-user-detail-panel">
          <header>
            <UiIcon name="settings" />
            <strong>Доступ и тариф</strong>
          </header>
          <div class="admin-user-detail-form">
            <label>
              <span>Роль</span>
              <UiSelect
                v-model="form.role"
                aria-label="Роль пользователя"
                :disabled="isSavingProfile || !form.isActive"
              >
                <option value="user">Пользователь</option>
                <option value="admin">Админ</option>
              </UiSelect>
            </label>
            <label>
              <span>Тариф</span>
              <UiSelect
                v-model="form.subscriptionTier"
                aria-label="Тариф пользователя"
                :disabled="isSavingProfile || !form.isActive"
              >
                <option v-for="plan in plans" :key="plan.id" :value="plan.id">
                  {{ plan.name }}
                </option>
              </UiSelect>
            </label>
            <label>
              <span>Статус</span>
              <UiSelect
                v-model="form.isActive"
                aria-label="Статус пользователя"
                :disabled="isSavingProfile || isCurrentUser"
              >
                <option :value="true">Активен</option>
                <option :value="false">Отключён</option>
              </UiSelect>
            </label>
            <UiButton :loading="isSavingProfile" :disabled="!hasProfileChanges" @click="saveProfile">
              Сохранить профиль
            </UiButton>
          </div>
        </article>

        <article class="admin-user-detail-panel admin-user-detail-panel--wide">
          <header>
            <UiIcon name="message-square" />
            <strong>Персональная модалка</strong>
          </header>
          <div class="admin-user-detail-form">
            <label>
              <span>Переопределение</span>
              <UiSelect
                v-model="selectedModalId"
                aria-label="Персональная модалка пользователя"
                :disabled="isSavingModal"
              >
                <option value="">Без персональной модалки</option>
                <option v-for="modal in modals" :key="modal.id" :value="modal.id">
                  {{ modal.title || 'Без названия' }}
                </option>
              </UiSelect>
            </label>
            <p>
              Если выбрать модалку здесь, она будет показана этому пользователю первой и не будет зависеть от общей аудитории.
            </p>
            <UiButton :loading="isSavingModal" :disabled="selectedModalId === originalModalId" @click="saveModalOverride">
              Сохранить модалку
            </UiButton>
          </div>
        </article>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { adminApi } from '../../api/supabase/admin.api.js'
import UiButton from '../../components/ui/UiButton.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import { useNotification } from '../../composables/ui/useNotification.js'
import { authStore } from '../../stores/auth.store.js'
import { getSubscriptionPlan, normalizeSubscriptionTier, SUBSCRIPTION_TIERS } from '../../utils/constants/subscriptionConstants.js'

const route = useRoute()
const { notify } = useNotification()
const user = ref(null)
const stats = ref({})
const modals = ref([])
const selectedModalId = ref('')
const originalModalId = ref('')
const isLoading = ref(false)
const isSavingProfile = ref(false)
const isSavingModal = ref(false)
const errorMessage = ref('')
const form = reactive({
  role: 'user',
  subscriptionTier: 'free',
  isActive: true,
})

const plans = Object.values(SUBSCRIPTION_TIERS)
const currentPlan = computed(() => getSubscriptionPlan(user.value?.subscriptionTier))
const isCurrentUser = computed(() => user.value?.id === authStore.currentUserId.value)
const accountAgeLabel = computed(() => formatDurationSince(user.value?.createdAt))
const planAgeLabel = computed(() => formatDurationSince(user.value?.updatedAt))
const hasProfileChanges = computed(() => user.value && (
  form.role !== user.value.role
  || form.subscriptionTier !== user.value.subscriptionTier
  || form.isActive !== user.value.isActive
))
const statisticCards = computed(() => [
  {
    label: 'Статус',
    value: user.value?.isActive ? 'Активен' : 'Отключён',
    caption: user.value?.role === 'admin' ? 'админ-доступ' : 'обычный доступ',
    icon: user.value?.isActive ? 'check' : 'warning',
    tone: user.value?.isActive ? 'tone-success' : 'tone-danger',
  },
  {
    label: 'Тариф',
    value: currentPlan.value.name,
    caption: `лимит пространств: ${user.value?.workspaceLimit || 0}`,
    icon: currentPlan.value.icon,
    tone: 'tone-accent',
  },
  {
    label: 'На тарифе',
    value: planAgeLabel.value,
    caption: 'по последнему обновлению профиля',
    icon: 'clock',
    tone: 'tone-warning',
  },
  {
    label: 'Владелец',
    value: formatNumber(stats.value.ownedWorkspacesCount),
    caption: 'пространств создано',
    icon: 'layout-dashboard',
    tone: 'tone-info',
  },
  {
    label: 'Участник',
    value: formatNumber(stats.value.memberWorkspacesCount),
    caption: 'пространств всего',
    icon: 'users',
    tone: 'tone-accent',
  },
  {
    label: 'События',
    value: formatNumber(stats.value.eventsCreatedCount),
    caption: 'создано пользователем',
    icon: 'calendar',
    tone: 'tone-warning',
  },
  {
    label: 'Активность',
    value: formatNumber(stats.value.activityCount),
    caption: stats.value.lastActivityAt ? `последняя: ${formatDate(stats.value.lastActivityAt)}` : 'записей нет',
    icon: 'activity',
    tone: 'tone-info',
  },
])

function mapUser(row) {
  const name = row?.name || row?.email?.split('@')[0] || 'Пользователь'
  return {
    id: row?.id || '',
    email: row?.email || '',
    name,
    avatar: row?.avatar || name.slice(0, 1).toUpperCase(),
    color: row?.color || '#60a5fa',
    subscriptionTier: normalizeSubscriptionTier(row?.subscription_tier),
    workspaceLimit: Number(row?.workspace_limit || 0),
    role: row?.role || 'user',
    isActive: row?.is_active !== false,
    createdAt: row?.created_at || '',
    updatedAt: row?.updated_at || '',
  }
}

function applyUser(nextUser) {
  user.value = nextUser
  form.role = nextUser.role
  form.subscriptionTier = nextUser.subscriptionTier
  form.isActive = nextUser.isActive
}

function mapDetail(payload) {
  const source = Array.isArray(payload) ? payload[0] : payload
  return {
    profile: mapUser(source?.profile || source),
    stats: {
      ownedWorkspacesCount: Number(source?.stats?.ownedWorkspacesCount || 0),
      memberWorkspacesCount: Number(source?.stats?.memberWorkspacesCount || 0),
      eventsCreatedCount: Number(source?.stats?.eventsCreatedCount || 0),
      activityCount: Number(source?.stats?.activityCount || 0),
      lastActivityAt: source?.stats?.lastActivityAt || '',
    },
    modalId: source?.modalOverride?.id || '',
  }
}

function mapModal(row) {
  return {
    id: row.id,
    title: row.title || '',
    isActive: row.is_active !== false,
  }
}

async function loadPageData() {
  if (isLoading.value) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    const userId = String(route.params.userId || '')
    const [detailResult, modalsResult] = await Promise.all([
      adminApi.getUserDetail(userId),
      adminApi.listModals(),
    ])

    if (detailResult.error) {
      errorMessage.value = detailResult.error.message || 'Не удалось загрузить пользователя'
      return
    }
    if (modalsResult.error) {
      errorMessage.value = modalsResult.error.message || 'Не удалось загрузить модалки'
      return
    }

    const detail = mapDetail(detailResult.data)
    applyUser(detail.profile)
    stats.value = detail.stats
    selectedModalId.value = detail.modalId
    originalModalId.value = detail.modalId
    modals.value = (modalsResult.data || []).map(mapModal)
  } catch (error) {
    errorMessage.value = error.message || 'Не удалось загрузить пользователя'
  } finally {
    isLoading.value = false
  }
}

async function saveProfile() {
  if (!user.value || isSavingProfile.value || !hasProfileChanges.value) return
  if (!form.isActive && isCurrentUser.value) {
    notify('Свой аккаунт нельзя отключить', 'warning')
    return
  }

  isSavingProfile.value = true
  try {
    const { data, error } = await adminApi.updateUser(user.value.id, {
      role: form.role,
      subscriptionTier: form.subscriptionTier,
      isActive: form.isActive,
    })
    if (error) {
      notify(error.message || 'Не удалось сохранить профиль', 'danger')
      return
    }
    applyUser(mapUser(data))
    notify('Профиль сохранён', 'success')
  } catch (error) {
    notify(error.message || 'Не удалось сохранить профиль', 'danger')
  } finally {
    isSavingProfile.value = false
  }
}

async function saveModalOverride() {
  if (!user.value || isSavingModal.value || selectedModalId.value === originalModalId.value) return
  isSavingModal.value = true
  try {
    const { error } = await adminApi.setUserModalOverride(user.value.id, selectedModalId.value)
    if (error) {
      notify(error.message || 'Не удалось сохранить модалку', 'danger')
      return
    }
    originalModalId.value = selectedModalId.value
    notify('Персональная модалка сохранена', 'success')
  } catch (error) {
    notify(error.message || 'Не удалось сохранить модалку', 'danger')
  } finally {
    isSavingModal.value = false
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return 'Не указано'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDurationSince(value) {
  if (!value) return 'Неизвестно'
  const created = new Date(value).getTime()
  const diffDays = Math.max(0, Math.floor((Date.now() - created) / 86400000))
  if (diffDays < 1) return 'меньше дня'
  if (diffDays < 30) return `${diffDays} дн.`
  const months = Math.floor(diffDays / 30)
  if (months < 12) return `${months} мес.`
  const years = Math.floor(months / 12)
  const restMonths = months % 12
  return restMonths ? `${years} г. ${restMonths} мес.` : `${years} г.`
}

watch(() => route.params.userId, loadPageData)
onMounted(loadPageData)
</script>

<style scoped>
.admin-user-detail-page{display:grid;gap:12px}.admin-user-detail-hero{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px}.admin-user-detail-back{display:inline-flex;align-items:center;justify-content:center;min-height:34px;border:1px solid var(--border-color);border-radius:8px;padding:0 12px;color:var(--text-secondary);background:var(--control-bg);font-weight:750;text-decoration:none}.admin-user-detail-back:hover{color:var(--text-primary);background:var(--control-bg-hover)}.admin-user-detail-profile{display:grid;grid-template-columns:54px minmax(0,1fr);align-items:center;gap:12px;min-width:0}.admin-user-detail-avatar{display:grid;place-items:center;width:54px;height:54px;border-radius:50%;color:#071016;background:var(--user-color,var(--accent));font-size:22px;font-weight:900}.admin-user-detail-profile span:not(.admin-user-detail-avatar){color:var(--accent);font-size:9px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}.admin-user-detail-profile h1{overflow:hidden;margin:4px 0 5px;text-overflow:ellipsis;white-space:nowrap}.admin-user-detail-profile p{overflow:hidden;margin:0;color:var(--text-secondary);text-overflow:ellipsis;white-space:nowrap}.admin-user-detail-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.admin-user-detail-stats article{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;gap:10px;min-height:78px;border:1px solid var(--border-color);border-radius:8px;padding:10px 12px;background:var(--card-solid);box-shadow:var(--shadow-sm)}.admin-user-detail-stat-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:8px;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--control-bg));font-size:19px}.admin-user-detail-stat-icon.tone-success{color:var(--success);background:color-mix(in srgb,var(--success) 10%,var(--control-bg))}.admin-user-detail-stat-icon.tone-danger{color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,var(--control-bg))}.admin-user-detail-stat-icon.tone-warning{color:var(--warning);background:color-mix(in srgb,var(--warning) 11%,var(--control-bg))}.admin-user-detail-stat-icon.tone-info{color:#38bdf8;background:color-mix(in srgb,#38bdf8 11%,var(--control-bg))}.admin-user-detail-stats small{color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.admin-user-detail-stats strong{display:block;overflow:hidden;margin:3px 0 2px;font-size:22px;line-height:1;text-overflow:ellipsis;white-space:nowrap}.admin-user-detail-stats span:not(.admin-user-detail-stat-icon){color:var(--text-secondary);font-size:11px}.admin-user-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.admin-user-detail-panel{display:grid;align-content:start;gap:12px;border:1px solid var(--border-color);border-radius:8px;padding:14px;background:var(--card-solid);box-shadow:var(--shadow-sm)}.admin-user-detail-panel--wide{grid-column:1/-1}.admin-user-detail-panel header{display:flex;align-items:center;gap:8px;color:var(--text-primary)}.admin-user-detail-panel header svg{color:var(--accent);font-size:18px}.admin-user-detail-list{display:grid;gap:8px;margin:0}.admin-user-detail-list div{display:grid;grid-template-columns:130px minmax(0,1fr);gap:10px;border-top:1px solid var(--border-color);padding-top:8px}.admin-user-detail-list div:first-child{border-top:0;padding-top:0}.admin-user-detail-list dt{color:var(--text-muted);font-size:10px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.admin-user-detail-list dd{min-width:0;margin:0;overflow:hidden;color:var(--text-secondary);text-overflow:ellipsis;white-space:nowrap}.admin-user-detail-form{display:grid;gap:10px}.admin-user-detail-form label{display:grid;gap:6px}.admin-user-detail-form label>span{color:var(--text-muted);font-size:10px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.admin-user-detail-form p{margin:0;color:var(--text-secondary);line-height:1.5}.admin-state{display:grid;justify-items:center;gap:8px;border:1px solid var(--border-color);border-radius:8px;padding:48px 16px;color:var(--text-secondary);background:var(--card-solid);text-align:center}.admin-state span{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--control-bg));font-size:20px}.admin-state--danger span{color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,var(--control-bg))}@media(max-width:920px){.admin-user-detail-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-user-detail-grid{grid-template-columns:1fr}}@media(max-width:640px){.admin-user-detail-hero{grid-template-columns:1fr}.admin-user-detail-stats{grid-template-columns:1fr}.admin-user-detail-list div{grid-template-columns:1fr}.admin-user-detail-list dd{white-space:normal}}
</style>
