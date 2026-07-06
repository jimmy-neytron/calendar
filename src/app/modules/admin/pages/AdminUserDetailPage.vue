<template>
  <section class="admin-user-page">
    <header v-if="user" class="user-hero panel" :style="{ '--user-color': user.color }">
      <RouterLink class="user-crumb" :to="{ name: 'admin-users' }">
        <UiIcon name="left" />
        Пользователи
      </RouterLink>

      <div class="user-hero__main">
        <span class="user-avatar">{{ user.avatar || '?' }}</span>
        <div>
          <small>Профиль пользователя</small>
          <h1>{{ user.name || 'Пользователь' }}</h1>
          <p>{{ user.email || 'Email не указан' }} · {{ user.role === 'admin' ? 'админ' : 'пользователь' }} · {{ currentPlan.name }}</p>
        </div>
      </div>

      <div class="user-hero__status">
        <span :class="{ danger: !user.isActive }">{{ user.isActive ? 'Активен' : 'Отключён' }}</span>
        <strong>{{ accountAgeLabel }}</strong>
        <small>в аккаунте</small>
      </div>

      <UiButton icon="refresh" variant="secondary" :loading="isLoading" @click="loadPageData">
        Обновить
      </UiButton>
    </header>

    <div v-if="isLoading && !user" class="admin-state panel">
      <span><UiIcon name="refresh" /></span>
      <strong>Загружаем пользователя</strong>
    </div>

    <div v-else-if="errorMessage" class="admin-state admin-state--danger panel">
      <span><UiIcon name="warning" /></span>
      <strong>{{ errorMessage }}</strong>
    </div>

    <template v-else-if="user">
      <section class="user-metrics">
        <article v-for="item in metricCards" :key="item.label">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.caption }}</small>
        </article>
      </section>

      <section class="user-dashboard">
        <article class="chart-card chart-card--wide panel">
          <header>
            <div>
              <small>Сводка</small>
              <h2>Активность и данные</h2>
            </div>
            <span>{{ formatNumber(totalSignal) }} всего</span>
          </header>
          <div class="chart-canvas chart-canvas--bar">
            <Bar :data="activityChartData" :options="barOptions" />
          </div>
        </article>

        <article class="chart-card panel">
          <header>
            <div>
              <small>Доступ</small>
              <h2>Профиль</h2>
            </div>
          </header>
          <div class="chart-canvas">
            <Doughnut :data="accessDonutData" :options="doughnutOptions" />
          </div>
        </article>
      </section>

      <section class="user-workspace">
        <article class="settings-panel panel">
          <header>
            <div>
              <small>Управление</small>
              <h2>Доступ и тариф</h2>
            </div>
            <span>{{ hasProfileChanges ? 'Есть изменения' : 'Без изменений' }}</span>
          </header>

          <div class="settings-grid">
            <label>
              <span>Роль</span>
              <UiSelect v-model="form.role" aria-label="Роль пользователя" :disabled="isSavingProfile || !form.isActive">
                <option value="user">Пользователь</option>
                <option value="admin">Админ</option>
              </UiSelect>
            </label>
            <label>
              <span>Тариф</span>
              <UiSelect v-model="form.subscriptionTier" aria-label="Тариф пользователя" :disabled="isSavingProfile || !form.isActive">
                <option v-for="plan in plans" :key="plan.id" :value="plan.id">{{ plan.name }}</option>
              </UiSelect>
            </label>
            <label>
              <span>Статус</span>
              <UiSelect v-model="form.isActive" aria-label="Статус пользователя" :disabled="isSavingProfile || isCurrentUser">
                <option :value="true">Активен</option>
                <option :value="false">Отключён</option>
              </UiSelect>
            </label>
          </div>

          <footer>
            <span>ID: {{ user.id }}</span>
            <UiButton :loading="isSavingProfile" :disabled="!hasProfileChanges" @click="saveProfile">
              Сохранить профиль
            </UiButton>
          </footer>
        </article>

        <article class="modal-panel panel">
          <header>
            <div>
              <small>Коммуникация</small>
              <h2>Персональная модалка</h2>
            </div>
            <span :class="{ active: selectedModal }">{{ selectedModal ? 'Назначена' : 'Общая логика' }}</span>
          </header>

          <div class="modal-spotlight">
            <span class="modal-spotlight__icon"><UiIcon :name="selectedModal ? 'message-square' : 'mail'" /></span>
            <div>
              <strong>{{ selectedModalTitle }}</strong>
              <p>{{ selectedModalStatus }}</p>
            </div>
            <i :class="{ active: selectedModal?.isActive, draft: selectedModal && !selectedModal.isActive }">
              {{ selectedModalBadge }}
            </i>
          </div>

          <label class="modal-picker">
            <span>Сценарий показа</span>
            <UiSelect v-model="selectedModalId" aria-label="Персональная модалка пользователя" :disabled="isSavingModal">
              <option value="">Без персональной модалки</option>
              <option v-for="modal in modals" :key="modal.id" :value="modal.id">
                {{ modal.title || 'Без названия' }}
              </option>
            </UiSelect>
          </label>

          <div class="modal-chip-row">
            <span><UiIcon name="user" /> Только этот пользователь</span>
            <span><UiIcon name="settings" /> Приоритет выше аудитории</span>
            <span><UiIcon name="check" /> Покажется после входа</span>
          </div>

          <footer>
            <small>{{ selectedModal ? 'Можно назначить даже черновик, не включая его глобально.' : 'Пользователь останется на общей системе модалок.' }}</small>
            <UiButton :loading="isSavingModal" :disabled="selectedModalId === originalModalId" @click="saveModalOverride">
              Сохранить модалку
            </UiButton>
          </footer>
        </article>

        <article class="profile-panel panel">
          <header>
            <div>
              <small>Детали</small>
              <h2>Информация</h2>
            </div>
          </header>
          <dl>
            <div><dt>Создан</dt><dd>{{ formatDate(user.createdAt) }}</dd></div>
            <div><dt>Обновлён</dt><dd>{{ formatDate(user.updatedAt) }}</dd></div>
            <div><dt>На тарифе</dt><dd>{{ planAgeLabel }}</dd></div>
            <div><dt>Лимит пространств</dt><dd>{{ user.workspaceLimit }}</dd></div>
            <div><dt>Последняя активность</dt><dd>{{ stats.lastActivityAt ? formatDate(stats.lastActivityAt) : 'Нет записей' }}</dd></div>
          </dl>
        </article>
      </section>
    </template>
  </section>
</template>

<script setup>
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Bar, Doughnut } from 'vue-chartjs'
import { useRoute } from 'vue-router'
import { adminApi } from '../api/admin.api.js'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import { useNotification } from '../../../composables/ui/useNotification.js'
import { authStore } from '../../../stores/auth.store.js'
import { getSubscriptionPlan, normalizeSubscriptionTier, SUBSCRIPTION_TIERS } from '../../../utils/constants/subscriptionConstants.js'

ChartJS.register(ArcElement, BarElement, CategoryScale, Legend, LinearScale, Tooltip)

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
const selectedModal = computed(() => modals.value.find((modal) => modal.id === selectedModalId.value) || null)
const selectedModalTitle = computed(() => selectedModal.value?.title || 'Не назначена')
const selectedModalStatus = computed(() => {
  if (!selectedModal.value) return 'Пользователь увидит общую активную модалку, если подходит по аудитории.'
  return selectedModal.value.isActive
    ? 'Активная модалка назначена персонально.'
    : 'Черновик назначен персонально и будет показан только этому пользователю.'
})
const selectedModalBadge = computed(() => {
  if (!selectedModal.value) return 'Auto'
  return selectedModal.value.isActive ? 'Live' : 'Draft'
})
const totalSignal = computed(() => (
  Number(stats.value.memberWorkspacesCount || 0)
  + Number(stats.value.ownedWorkspacesCount || 0)
  + Number(stats.value.eventsCreatedCount || 0)
  + Number(stats.value.activityCount || 0)
))
const metricCards = computed(() => [
  { label: 'Тариф', value: currentPlan.value.name, caption: `лимит ${user.value?.workspaceLimit || 0}` },
  { label: 'Пространства', value: formatNumber(stats.value.memberWorkspacesCount), caption: `${formatNumber(stats.value.ownedWorkspacesCount)} создано` },
  { label: 'События', value: formatNumber(stats.value.eventsCreatedCount), caption: 'создано пользователем' },
  { label: 'Активность', value: formatNumber(stats.value.activityCount), caption: stats.value.lastActivityAt ? 'есть журнал' : 'без записей' },
])
const chartColors = {
  text: getCssVar('--text-secondary', '#8b949e'),
  muted: getCssVar('--text-muted', '#6b7280'),
  border: getCssVar('--border-color', 'rgba(148, 163, 184, 0.24)'),
  card: getCssVar('--card-solid', '#111827'),
  success: getCssVar('--success', '#22c55e'),
  warning: getCssVar('--warning', '#f59e0b'),
  danger: getCssVar('--danger', '#ef4444'),
  info: '#38bdf8',
  violet: '#a78bfa',
}
const activityChart = computed(() => [
  { label: 'Создано', value: Number(stats.value.ownedWorkspacesCount || 0), color: '#38bdf8' },
  { label: 'Участие', value: Number(stats.value.memberWorkspacesCount || 0), color: user.value?.color || '#60a5fa' },
  { label: 'События', value: Number(stats.value.eventsCreatedCount || 0), color: '#22c55e' },
  { label: 'Журнал', value: Number(stats.value.activityCount || 0), color: '#f59e0b' },
  { label: 'Лимит', value: Number(user.value?.workspaceLimit || 0), color: '#a78bfa' },
])
const accessDonut = computed(() => [
  { label: user.value?.isActive ? 'Активен' : 'Отключён', value: 1, color: user.value?.isActive ? '#22c55e' : '#ef4444' },
  { label: user.value?.role === 'admin' ? 'Админ' : 'Пользователь', value: 1, color: user.value?.role === 'admin' ? '#f59e0b' : '#38bdf8' },
  { label: currentPlan.value.name, value: Math.max(1, Number(user.value?.workspaceLimit || 1)), color: user.value?.color || '#60a5fa' },
])
const activityChartData = computed(() => ({
  labels: activityChart.value.map((item) => item.label),
  datasets: [{
    label: 'Количество',
    data: activityChart.value.map((item) => item.value),
    backgroundColor: activityChart.value.map((item) => item.color),
    borderRadius: 9,
    maxBarThickness: 54,
  }],
}))
const accessDonutData = computed(() => ({
  labels: accessDonut.value.map((item) => item.label),
  datasets: [{
    data: accessDonut.value.map((item) => item.value),
    backgroundColor: accessDonut.value.map((item) => item.color),
    borderColor: chartColors.card,
    borderWidth: 3,
    hoverOffset: 5,
  }],
}))
const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: chartColors.text, font: { size: 11, weight: 700 } },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: chartColors.muted, precision: 0 },
      grid: { color: chartColors.border },
      border: { display: false },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: tooltipOptions(),
  },
}
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        color: chartColors.text,
        font: { size: 11, weight: 700 },
        padding: 12,
      },
    },
    tooltip: tooltipOptions(),
  },
}

function tooltipOptions() {
  return {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    titleColor: '#fff',
    bodyColor: '#fff',
    displayColors: false,
    padding: 10,
  }
}

function getCssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

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
.admin-user-page{display:grid;gap:12px;width:min(100%,1160px);margin:0 auto;animation:fadeSlideUp .42s var(--ease-out)}.user-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:end;gap:18px;overflow:hidden;padding:24px 26px;background:radial-gradient(circle at 88% 22%,color-mix(in srgb,var(--user-color) 18%,transparent),transparent 255px),var(--panel-bg)}.user-crumb{grid-column:1/-1;display:flex;align-items:center;gap:5px;width:max-content;color:var(--text-muted);font-size:10px;text-decoration:none}.user-crumb:hover{color:var(--text-primary)}.user-hero__main{display:flex;align-items:center;gap:13px;min-width:0}.user-avatar{display:grid;place-items:center;flex:0 0 auto;width:58px;height:58px;border-radius:18px;color:#071016;background:var(--user-color);font-size:24px;font-weight:900}.user-hero__main small,.chart-card header small,.settings-panel header small,.modal-panel header small,.profile-panel header small{color:var(--user-color);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.user-hero h1{overflow:hidden;margin:2px 0 4px;text-overflow:ellipsis;white-space:nowrap}.user-hero p{overflow:hidden;margin:0;color:var(--text-muted);text-overflow:ellipsis;white-space:nowrap}.user-hero__status{display:grid;justify-items:end;min-width:155px;border:1px solid var(--border-color);border-radius:16px;padding:13px 15px;background:var(--card-soft)}.user-hero__status span{color:var(--success);font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.user-hero__status span.danger{color:var(--danger)}.user-hero__status strong{margin:2px 0;font-size:24px}.user-hero__status small{color:var(--text-muted);font-size:9px}.user-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.user-metrics article{display:grid;gap:2px;border:1px solid var(--border-color);border-radius:14px;padding:16px 17px;background:var(--card-bg)}.user-metrics span{color:var(--text-muted);font-size:9px;font-weight:800;text-transform:uppercase}.user-metrics strong{font-size:22px}.user-metrics small{color:var(--text-muted);font-size:9px}.user-dashboard{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(320px,.7fr);gap:12px}.chart-card{display:grid;gap:18px;min-width:0;padding:19px}.chart-canvas{position:relative;height:220px;min-width:0}.chart-canvas--bar{height:250px}.chart-card header,.settings-panel header,.modal-panel header,.profile-panel header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.chart-card h2,.settings-panel h2,.modal-panel h2,.profile-panel h2{margin:2px 0 0}.chart-card header>span,.settings-panel header>span,.modal-panel header>span{max-width:210px;overflow:hidden;color:var(--text-muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.modal-panel header>span{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--border-color);border-radius:999px;padding:6px 9px;background:var(--control-bg);font-weight:850}.modal-panel header>span.active{color:var(--success);border-color:color-mix(in srgb,var(--success) 34%,var(--border-color));background:color-mix(in srgb,var(--success) 8%,var(--control-bg))}.user-workspace{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);gap:12px;align-items:start}.settings-panel,.modal-panel,.profile-panel{display:grid;gap:14px;padding:18px}.modal-panel{position:relative;overflow:hidden;background:radial-gradient(circle at 92% 10%,color-mix(in srgb,var(--user-color) 13%,transparent),transparent 170px),var(--card-solid)}.profile-panel{grid-column:1/-1}.settings-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.settings-grid label,.modal-picker{display:grid;gap:6px}.settings-grid label>span,.modal-picker>span{color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.settings-panel footer,.modal-panel footer{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--border-color);padding-top:12px}.settings-panel footer span,.modal-panel footer small{min-width:0;overflow:hidden;color:var(--text-muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.modal-spotlight{position:relative;display:grid;grid-template-columns:52px minmax(0,1fr) auto;align-items:center;gap:12px;border:1px solid color-mix(in srgb,var(--user-color) 34%,var(--border-color));border-radius:16px;padding:14px;background:linear-gradient(135deg,color-mix(in srgb,var(--user-color) 10%,var(--control-bg)),var(--control-bg));box-shadow:inset 0 1px 0 color-mix(in srgb,white 5%,transparent)}.modal-spotlight__icon{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;color:var(--user-color);background:color-mix(in srgb,var(--user-color) 15%,var(--card-soft));font-size:23px}.modal-spotlight strong,.modal-spotlight p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.modal-spotlight strong{display:block;color:var(--text-primary);font-size:16px}.modal-spotlight p{margin:4px 0 0;color:var(--text-muted);font-size:10px}.modal-spotlight i{display:inline-flex;align-items:center;justify-content:center;min-width:46px;border:1px solid var(--border-color);border-radius:999px;padding:6px 8px;color:var(--text-muted);background:var(--card-soft);font-size:9px;font-style:normal;font-weight:900;text-transform:uppercase}.modal-spotlight i.active{color:var(--success);border-color:color-mix(in srgb,var(--success) 36%,var(--border-color));background:color-mix(in srgb,var(--success) 9%,var(--card-soft))}.modal-spotlight i.draft{color:var(--warning);border-color:color-mix(in srgb,var(--warning) 38%,var(--border-color));background:color-mix(in srgb,var(--warning) 10%,var(--card-soft))}.modal-chip-row{display:flex;flex-wrap:wrap;gap:6px}.modal-chip-row span{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border-color);border-radius:999px;padding:7px 9px;color:var(--text-secondary);background:var(--control-bg);font-size:10px;font-weight:750}.modal-chip-row svg{color:var(--user-color);font-size:13px}.profile-panel dl{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:0}.profile-panel dl div{display:grid;gap:4px;border:1px solid var(--border-color);border-radius:12px;padding:11px;background:var(--control-bg)}.profile-panel dt{color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.profile-panel dd{min-width:0;margin:0;overflow:hidden;color:var(--text-secondary);text-overflow:ellipsis;white-space:nowrap}.admin-state{display:grid;justify-items:center;gap:8px;padding:48px 16px;color:var(--text-secondary);text-align:center}.admin-state span{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--control-bg));font-size:20px}.admin-state--danger span{color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,var(--control-bg))}@media(max-width:960px){.user-dashboard,.user-workspace{grid-template-columns:1fr}.user-metrics{grid-template-columns:repeat(2,1fr)}.profile-panel dl{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:680px){.user-hero{grid-template-columns:1fr;padding:18px}.user-hero__status{justify-items:start}.settings-grid{grid-template-columns:1fr}.settings-panel footer,.modal-panel footer{align-items:flex-start;display:grid}.user-dashboard{grid-template-columns:1fr}.user-metrics{grid-template-columns:1fr 1fr}.chart-canvas--bar{height:220px}}@media(max-width:440px){.user-metrics,.profile-panel dl{grid-template-columns:1fr}.user-hero__main{align-items:flex-start}.user-avatar{width:48px;height:48px;border-radius:15px}.user-hero p{white-space:normal}.chart-canvas{height:200px}.chart-canvas--bar{height:210px}.modal-spotlight{grid-template-columns:44px minmax(0,1fr)}.modal-spotlight__icon{width:44px;height:44px;border-radius:14px}.modal-spotlight i{grid-column:1/-1;width:max-content}}
</style>
