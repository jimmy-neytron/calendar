<template>
  <section class="admin-leads-page">
    <header class="admin-section-hero">
      <div>
        <span>Заявки</span>
        <h1>Лиды с лендинга</h1>
        <p>Заявки из таблицы landing_leads: контакты, сообщения и источники.</p>
      </div>
      <UiButton icon="refresh" variant="secondary" :loading="isLoading" @click="loadLeads">
        Обновить
      </UiButton>
    </header>

    <section class="admin-lead-stats">
      <article>
        <span class="admin-stat-icon"><UiIcon name="table" /></span>
        <div>
          <small>Всего</small>
          <strong>{{ leads.length }}</strong>
          <span>заявок</span>
        </div>
      </article>
      <article>
        <span class="admin-stat-icon admin-stat-icon--warning"><UiIcon name="mail" /></span>
        <div>
          <small>Новые</small>
          <strong>{{ unreadCount }}</strong>
          <span>не просмотрены</span>
        </div>
      </article>
      <article>
        <span class="admin-stat-icon admin-stat-icon--success"><UiIcon name="check" /></span>
        <div>
          <small>Просмотрены</small>
          <strong>{{ viewedCount }}</strong>
          <span>обработаны</span>
        </div>
      </article>
    </section>

    <section class="admin-toolbar panel">
      <UiInput v-model="searchQuery" placeholder="Поиск по имени, контакту или сообщению" aria-label="Поиск заявок" />
      <UiSelect v-model="statusFilter" aria-label="Фильтр по просмотру">
        <option value="all">Все заявки</option>
        <option value="unread">Новые</option>
        <option value="viewed">Просмотренные</option>
      </UiSelect>
    </section>

    <section class="admin-leads-list">
      <div v-if="isLoading" class="admin-state">
        <span><UiIcon name="refresh" /></span>
        <strong>Загружаем заявки</strong>
      </div>
      <div v-else-if="errorMessage" class="admin-state admin-state--danger">
        <span><UiIcon name="warning" /></span>
        <strong>{{ errorMessage }}</strong>
      </div>
      <div v-else-if="!filteredLeads.length" class="admin-state">
        <span><UiIcon name="search" /></span>
        <strong>Заявок не найдено</strong>
      </div>
      <article
        v-for="lead in filteredLeads"
        v-else
        :key="lead.id"
        class="lead-card"
        :class="{ 'lead-card--unread': !lead.viewedAt }"
      >
        <header class="lead-card__header">
          <div>
            <small>{{ formatDate(lead.createdAt) }}</small>
            <h2>{{ lead.name || 'Без имени' }}</h2>
          </div>
          <span class="lead-card__status" :class="{ 'lead-card__status--new': !lead.viewedAt }">
            {{ lead.viewedAt ? 'Просмотрено' : 'Новая' }}
          </span>
        </header>

        <div class="lead-card__contact">
          <UiIcon name="mail" />
          <strong>{{ lead.contact }}</strong>
        </div>

        <p v-if="lead.message">{{ lead.message }}</p>

        <footer class="lead-card__footer">
          <span>{{ lead.formName }}</span>
          <span>{{ lead.source }}</span>
          <UiButton
            v-if="!lead.viewedAt"
            size="sm"
            variant="secondary"
            :loading="savingLeadId === lead.id"
            :disabled="Boolean(savingLeadId)"
            @click="markViewed(lead)"
          >
            Отметить просмотренной
          </UiButton>
        </footer>
      </article>
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
import { useAdminLeadNotifications } from '../composables/useAdminLeadNotifications.js'
import { useNotification } from '../../../composables/ui/useNotification.js'

const { notify } = useNotification()
const { setUnreadLeadCount } = useAdminLeadNotifications()
const leads = ref([])
const isLoading = ref(false)
const savingLeadId = ref('')
const errorMessage = ref('')
const searchQuery = ref('')
const statusFilter = ref('all')

const unreadCount = computed(() => leads.value.filter((lead) => !lead.viewedAt).length)
const viewedCount = computed(() => leads.value.length - unreadCount.value)
const filteredLeads = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return leads.value.filter((lead) => {
    const matchesQuery = !query
      || lead.name.toLowerCase().includes(query)
      || lead.contact.toLowerCase().includes(query)
      || lead.message.toLowerCase().includes(query)
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'unread' && !lead.viewedAt)
      || (statusFilter.value === 'viewed' && lead.viewedAt)
    return matchesQuery && matchesStatus
  })
})

function mapLead(row) {
  return {
    id: row.id,
    formName: row.form_name || 'landing',
    name: row.name || '',
    contact: row.contact || '',
    message: row.message || '',
    source: row.source || 'landing',
    userAgent: row.user_agent || '',
    createdAt: row.created_at || '',
    viewedAt: row.viewed_at || '',
  }
}

async function loadLeads() {
  if (isLoading.value) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await adminApi.listLeads()
    if (error) {
      errorMessage.value = error.message || 'Не удалось загрузить заявки'
      return
    }
    leads.value = (data || []).map(mapLead)
    setUnreadLeadCount(unreadCount.value)
  } catch (error) {
    errorMessage.value = error.message || 'Не удалось загрузить заявки'
  } finally {
    isLoading.value = false
  }
}

async function markViewed(lead) {
  if (savingLeadId.value) return
  savingLeadId.value = lead.id
  try {
    const { data, error } = await adminApi.markLeadViewed(lead.id)
    if (error) {
      notify(error.message || 'Не удалось обновить заявку', 'danger')
      return
    }
    const updated = mapLead(data)
    leads.value = leads.value.map((item) => (item.id === updated.id ? updated : item))
    setUnreadLeadCount(unreadCount.value)
    notify('Заявка отмечена просмотренной', 'success')
  } catch (error) {
    notify(error.message || 'Не удалось обновить заявку', 'danger')
  } finally {
    savingLeadId.value = ''
  }
}

function formatDate(value) {
  if (!value) return 'Без даты'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

onMounted(loadLeads)
</script>

<style scoped>
.admin-leads-page{display:grid;gap:12px}.admin-section-hero{display:flex;align-items:center;justify-content:space-between;gap:18px}.admin-section-hero span{color:var(--accent);font-size:9px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}.admin-section-hero h1{margin:5px 0 7px}.admin-section-hero p{margin:0;color:var(--text-secondary)}.admin-lead-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.admin-lead-stats article{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;gap:10px;min-height:72px;border:1px solid var(--border-color);border-radius:8px;padding:9px 12px;background:var(--card-solid);box-shadow:var(--shadow-sm)}.admin-stat-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:8px;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--control-bg));font-size:18px}.admin-stat-icon--success{color:var(--success);background:color-mix(in srgb,var(--success) 10%,var(--control-bg))}.admin-stat-icon--warning{color:var(--warning);background:color-mix(in srgb,var(--warning) 11%,var(--control-bg))}.admin-lead-stats small{color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.admin-lead-stats strong{display:block;margin:3px 0 2px;font-size:22px;line-height:1}.admin-lead-stats span:not(.admin-stat-icon){color:var(--text-secondary);font-size:11px}.admin-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) 190px;align-items:center;gap:8px;max-height:58px;padding:8px;overflow:visible}.admin-leads-list{display:grid;gap:10px}.admin-state{display:grid;justify-items:center;gap:8px;border:1px solid var(--border-color);border-radius:8px;padding:48px 16px;color:var(--text-secondary);background:var(--card-solid);text-align:center}.admin-state span{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--control-bg));font-size:20px}.admin-state--danger span{color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,var(--control-bg))}.lead-card{display:grid;gap:12px;border:1px solid var(--border-color);border-radius:8px;padding:15px;background:var(--card-solid);box-shadow:var(--shadow-sm)}.lead-card--unread{border-color:color-mix(in srgb,var(--warning) 35%,var(--border-color));background:linear-gradient(135deg,color-mix(in srgb,var(--warning) 6%,var(--card-solid)),var(--card-solid))}.lead-card__header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.lead-card__header small{color:var(--text-muted);font-size:10px}.lead-card__header h2{margin:3px 0 0;font-size:18px}.lead-card__status{border:1px solid var(--border-color);border-radius:999px;padding:5px 8px;color:var(--text-secondary);background:var(--control-bg);font-size:10px;font-weight:850}.lead-card__status--new{color:var(--warning);border-color:color-mix(in srgb,var(--warning) 32%,var(--border-color));background:color-mix(in srgb,var(--warning) 8%,var(--control-bg))}.lead-card__contact{display:inline-flex;align-items:center;gap:7px;width:fit-content;border:1px solid var(--border-color);border-radius:8px;padding:8px 10px;color:var(--text-primary);background:var(--control-bg)}.lead-card__contact svg{color:var(--accent)}.lead-card p{margin:0;color:var(--text-secondary);line-height:1.55}.lead-card__footer{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.lead-card__footer span{border:1px solid var(--border-color);border-radius:999px;padding:5px 8px;color:var(--text-muted);background:var(--control-bg);font-size:10px;font-weight:750}.lead-card__footer :deep(.ui-button){margin-left:auto}@media(max-width:760px){.admin-section-hero{display:grid}.admin-lead-stats,.admin-toolbar{grid-template-columns:1fr}.admin-toolbar{max-height:none}.lead-card__header{display:grid}.lead-card__footer :deep(.ui-button){width:100%;margin-left:0}}
</style>
