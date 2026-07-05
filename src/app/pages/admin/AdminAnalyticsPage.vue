<template>
  <section class="admin-analytics-page">
    <header class="admin-section-hero">
      <div>
        <span>Обзор</span>
        <h1>Главные метрики</h1>
        <p>Короткая сводка по пользователям, событиям и заявкам без лишнего шума.</p>
      </div>
      <UiButton icon="refresh" variant="secondary" :loading="isLoading" @click="loadMetrics">
        Обновить
      </UiButton>
    </header>

    <div v-if="isLoading && !metrics" class="admin-state">
      <span><UiIcon name="refresh" /></span>
      <strong>Загружаем аналитику</strong>
    </div>

    <div v-else-if="errorMessage" class="admin-state admin-state--danger">
      <span><UiIcon name="warning" /></span>
      <strong>{{ errorMessage }}</strong>
    </div>

    <template v-else>
      <section class="analytics-metrics">
        <article v-for="item in metricCards" :key="item.label">
          <span class="analytics-metrics__icon" :class="item.tone">
            <UiIcon :name="item.icon" />
          </span>
          <div>
            <small>{{ item.label }}</small>
            <strong>{{ item.value }}</strong>
            <span>{{ item.caption }}</span>
          </div>
        </article>
      </section>

      <section class="analytics-summary">
        <article>
          <header>
            <UiIcon name="users" />
            <strong>Пользователи</strong>
          </header>
          <p>{{ activeUsersLabel }} активны, {{ blockedUsersLabel }} заблокированы.</p>
        </article>
        <article>
          <header>
            <UiIcon name="mail" />
            <strong>Заявки</strong>
          </header>
          <p>{{ unreadLeadsLabel }} новых, {{ viewedLeadsLabel }} уже просмотрены.</p>
        </article>
      </section>

      <AdminOverviewCharts :metrics="currentMetrics" />
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { adminApi } from '../../api/supabase/admin.api.js'
import AdminOverviewCharts from '../../components/admin/AdminOverviewCharts.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiIcon from '../../components/ui/UiIcon.vue'

const isLoading = ref(false)
const errorMessage = ref('')
const metrics = ref(null)

const fallbackMetrics = {
  totalUsers: 0,
  activeUsers: 0,
  blockedUsers: 0,
  adminUsers: 0,
  totalEvents: 0,
  totalLeads: 0,
  unreadLeads: 0,
  viewedLeads: 0,
}
const currentMetrics = computed(() => metrics.value || fallbackMetrics)
const activeUsersLabel = computed(() => formatNumber(currentMetrics.value.activeUsers))
const blockedUsersLabel = computed(() => formatNumber(currentMetrics.value.blockedUsers))
const unreadLeadsLabel = computed(() => formatNumber(currentMetrics.value.unreadLeads))
const viewedLeadsLabel = computed(() => formatNumber(currentMetrics.value.viewedLeads))
const metricCards = computed(() => [
  {
    label: 'Пользователи',
    value: formatNumber(currentMetrics.value.totalUsers),
    caption: 'всего аккаунтов',
    icon: 'users',
    tone: 'tone-accent',
  },
  {
    label: 'Активные',
    value: formatNumber(currentMetrics.value.activeUsers),
    caption: 'могут войти',
    icon: 'check',
    tone: 'tone-success',
  },
  {
    label: 'Заблокированы',
    value: formatNumber(currentMetrics.value.blockedUsers),
    caption: 'доступ закрыт',
    icon: 'warning',
    tone: 'tone-danger',
  },
  {
    label: 'Админы',
    value: formatNumber(currentMetrics.value.adminUsers),
    caption: 'с правами',
    icon: 'key',
    tone: 'tone-accent',
  },
  {
    label: 'События',
    value: formatNumber(currentMetrics.value.totalEvents),
    caption: 'в календарях',
    icon: 'calendar',
    tone: 'tone-info',
  },
  {
    label: 'Заявки',
    value: formatNumber(currentMetrics.value.totalLeads),
    caption: 'с лендинга',
    icon: 'mail',
    tone: 'tone-warning',
  },
])

function mapMetrics(row) {
  return {
    totalUsers: Number(row?.total_users || 0),
    activeUsers: Number(row?.active_users || 0),
    blockedUsers: Number(row?.blocked_users || 0),
    adminUsers: Number(row?.admin_users || 0),
    totalEvents: Number(row?.total_events || 0),
    totalLeads: Number(row?.total_leads || 0),
    unreadLeads: Number(row?.unread_leads || 0),
    viewedLeads: Number(row?.viewed_leads || 0),
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(value)
}

async function loadMetrics() {
  if (isLoading.value) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await adminApi.getOverviewMetrics()
    if (error) {
      errorMessage.value = error.message || 'Не удалось загрузить аналитику'
      return
    }
    metrics.value = mapMetrics(Array.isArray(data) ? data[0] : data)
  } catch (error) {
    errorMessage.value = error.message || 'Не удалось загрузить аналитику'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadMetrics)
</script>

<style scoped>
.admin-analytics-page{display:grid;gap:12px}.admin-section-hero{display:flex;align-items:center;justify-content:space-between;gap:18px}.admin-section-hero span{color:var(--accent);font-size:9px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}.admin-section-hero h1{margin:5px 0 7px}.admin-section-hero p{margin:0;color:var(--text-secondary)}.analytics-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.analytics-metrics article{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;gap:10px;min-height:78px;border:1px solid var(--border-color);border-radius:8px;padding:10px 12px;background:var(--card-solid);box-shadow:var(--shadow-sm)}.analytics-metrics__icon{display:grid;place-items:center;width:40px;height:40px;border-radius:8px;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--control-bg));font-size:19px}.analytics-metrics__icon.tone-success{color:var(--success);background:color-mix(in srgb,var(--success) 10%,var(--control-bg))}.analytics-metrics__icon.tone-danger{color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,var(--control-bg))}.analytics-metrics__icon.tone-warning{color:var(--warning);background:color-mix(in srgb,var(--warning) 11%,var(--control-bg))}.analytics-metrics__icon.tone-info{color:#38bdf8;background:color-mix(in srgb,#38bdf8 11%,var(--control-bg))}.analytics-metrics small{color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.analytics-metrics strong{display:block;margin:3px 0 2px;font-size:23px;line-height:1}.analytics-metrics span:not(.analytics-metrics__icon){color:var(--text-secondary);font-size:11px}.analytics-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.analytics-summary article{display:grid;gap:8px;border:1px solid var(--border-color);border-radius:8px;padding:13px;background:var(--card-solid);box-shadow:var(--shadow-sm)}.analytics-summary header{display:flex;align-items:center;gap:8px;color:var(--text-primary)}.analytics-summary header svg{color:var(--accent);font-size:18px}.analytics-summary p{margin:0;color:var(--text-secondary);line-height:1.5}.admin-state{display:grid;justify-items:center;gap:8px;border:1px solid var(--border-color);border-radius:8px;padding:48px 16px;color:var(--text-secondary);background:var(--card-solid);text-align:center}.admin-state span{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--control-bg));font-size:20px}.admin-state--danger span{color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,var(--control-bg))}@media(max-width:860px){.analytics-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.admin-section-hero,.analytics-summary{display:grid}.analytics-metrics{grid-template-columns:1fr}}
</style>
