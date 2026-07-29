<template>
  <div class="courses-page">
    <header class="courses-hero">
      <RouterLink :to="{ name: 'integrations' }"><UiIcon name="left" /> Интеграции</RouterLink>
      <div>
        <span class="courses-hero__mark"><UiIcon name="play" /></span>
        <div>
          <small>Обучение</small>
          <h1>Courses</h1>
          <p>Выберите курс, удобные дни — занятия сами появятся в календаре.</p>
        </div>
      </div>
    </header>

    <section v-if="isLoading" class="courses-state">
      <UiIcon name="refresh" />
      <span>Загружаем интеграцию…</span>
    </section>

    <section v-else-if="!isConnected" class="courses-connect">
      <div class="courses-connect__copy">
        <span><UiIcon name="key" /></span>
        <div>
          <h2>Подключите Courses</h2>
          <p>Создайте персональный токен в настройках приложения Courses и вставьте его сюда.</p>
        </div>
      </div>
      <UiInput
        v-model="token"
        type="password"
        label="Персональный токен"
        placeholder="crs_..."
        autocomplete="off"
        @keydown.enter="connect"
      />
      <UiButton icon="link" :loading="isConnecting" :disabled="token.trim().length < 16" @click="connect">
        Подключить
      </UiButton>
    </section>

    <template v-else>
      <section class="courses-summary">
        <article>
          <span><UiIcon name="check" /></span>
          <div><small>Статус</small><strong>Подключено</strong></div>
        </article>
        <article>
          <span><UiIcon name="play" /></span>
          <div><small>Курсы</small><strong>{{ courses.length }}</strong></div>
        </article>
        <article>
          <span><UiIcon name="calendar" /></span>
          <div><small>Планы</small><strong>{{ plans.length }}</strong></div>
        </article>
      </section>

      <section class="courses-plans">
        <header>
          <div>
            <small>Расписание</small>
            <h2>Мои курсы</h2>
          </div>
          <UiButton icon="plus" @click="openWizard">Запланировать курс</UiButton>
        </header>

        <div v-if="plans.length" class="courses-plans__list">
          <article v-for="plan in plans" :key="plan.id">
            <span class="courses-plans__cover" :style="{ '--course-color': plan.course_accent_color }">
              <img v-if="isHttpUrl(plan.course_cover_url)" :src="plan.course_cover_url" alt="">
              <UiIcon v-else name="play" />
            </span>
            <div>
              <strong>{{ plan.course_title }}</strong>
              <small>{{ sessionCount(plan) }} занятий · с {{ formatDate(plan.start_date) }}</small>
            </div>
            <div class="courses-plans__actions">
              <b>{{ plan.status === 'active' ? 'Активен' : plan.status }}</b>
              <UiButton size="sm" variant="secondary" icon="trash" @click="openDeletePlan(plan)">
                Удалить
              </UiButton>
            </div>
          </article>
        </div>
        <div v-else class="courses-plans__empty">
          <span><UiIcon name="calendar" /></span>
          <strong>Пока нет запланированных курсов</strong>
          <p>Выберите курс и дни занятий — остальное календарь сделает сам.</p>
        </div>
      </section>

      <footer class="courses-footer">
        <UiButton variant="secondary" icon="refresh" :loading="isRefreshing" @click="refresh">Обновить</UiButton>
        <UiButton variant="danger" icon="link" @click="isDisconnectModalOpen = true">Отключить</UiButton>
      </footer>
    </template>

    <p v-if="errorMessage" class="courses-error">{{ errorMessage }}</p>

    <CoursePlanWizard
      v-model="isWizardOpen"
      :workspace-id="workspaceId"
      :integration-id="integration?.id || ''"
      :courses="courses"
      :calendars="calendars"
      @created="handleCreated"
    />

    <UiModal
      v-model="isDeletePlanModalOpen"
      title="Удалить план курса?"
      eyebrow="Календарь"
      width="460px"
      :close-on-overlay="!isDeletingPlan"
    >
      <div class="courses-confirm">
        <span class="courses-confirm__icon"><UiIcon name="trash" /></span>
        <div>
          <strong>{{ planToDelete?.course_title }}</strong>
          <p>
            План и все {{ sessionCount(planToDelete || {}) }} занятий этого курса будут удалены из календаря.
            Отменить это действие нельзя.
          </p>
        </div>
        <footer>
          <UiButton variant="secondary" :disabled="isDeletingPlan" @click="closeDeletePlan">Отмена</UiButton>
          <UiButton variant="danger" icon="trash" :loading="isDeletingPlan" @click="deletePlan">
            Удалить занятия
          </UiButton>
        </footer>
      </div>
    </UiModal>

    <UiModal
      v-model="isDisconnectModalOpen"
      title="Отключить Courses?"
      eyebrow="Управление интеграцией"
      width="520px"
      :close-on-overlay="!isDisconnecting"
    >
      <div class="courses-disconnect">
        <div class="courses-disconnect__intro">
          <span><UiIcon name="link" /></span>
          <p>Выберите, что сделать с уже созданными занятиями.</p>
        </div>

        <button type="button" :disabled="isDisconnecting" @click="disconnect(false)">
          <span><UiIcon name="calendar" /></span>
          <div>
            <strong>Оставить занятия</strong>
            <small>Интеграция отключится, но события останутся в календаре.</small>
          </div>
          <UiIcon name="right" />
        </button>

        <button class="danger" type="button" :disabled="isDisconnecting" @click="disconnect(true)">
          <span><UiIcon name="trash" /></span>
          <div>
            <strong>Удалить всё и отключить</strong>
            <small>Все планы Courses и связанные события исчезнут из календаря.</small>
          </div>
          <UiIcon name="right" />
        </button>

        <UiButton variant="secondary" :disabled="isDisconnecting" @click="isDisconnectModalOpen = false">
          Отмена
        </UiButton>
      </div>
    </UiModal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import UiButton from '../../../../components/ui/UiButton.vue'
import UiIcon from '../../../../components/ui/UiIcon.vue'
import UiInput from '../../../../components/ui/UiInput.vue'
import UiModal from '../../../../components/ui/UiModal.vue'
import { useNotification } from '../../../../composables/ui/useNotification.js'
import { calendarStore } from '../../../../stores/calendar.store.js'
import { calendarCollectionStore } from '../../../../stores/calendarCollection.store.js'
import { workspaceStore } from '../../../../stores/workspace.store.js'
import { coursesIntegrationApi } from '../api/coursesIntegration.api.js'
import CoursePlanWizard from '../components/CoursePlanWizard.vue'

const { notify } = useNotification()
const integration = ref(null)
const courses = ref([])
const plans = ref([])
const token = ref('')
const errorMessage = ref('')
const isLoading = ref(true)
const isConnecting = ref(false)
const isRefreshing = ref(false)
const isDisconnecting = ref(false)
const isDeletingPlan = ref(false)
const isWizardOpen = ref(false)
const isDeletePlanModalOpen = ref(false)
const isDisconnectModalOpen = ref(false)
const planToDelete = ref(null)
const workspaceId = computed(() => workspaceStore.activeWorkspaceId.value || '')
const calendars = calendarCollectionStore.activeCollections
const isConnected = computed(() => integration.value?.connected === true)

onMounted(load)

async function load() {
  if (!workspaceId.value) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    const status = await coursesIntegrationApi.getStatus(workspaceId.value)
    integration.value = status.integration
    if (isConnected.value) await loadConnectedData()
  } catch (error) {
    errorMessage.value = error.message || 'Не удалось загрузить интеграцию'
  } finally {
    isLoading.value = false
  }
}

async function loadPlans() {
  const result = await coursesIntegrationApi.listPlans(workspaceId.value)
  if (result.error) throw result.error
  plans.value = result.data || []
}

async function loadConnectedData({ forceCourses = false } = {}) {
  const [courseItems, planResult] = await Promise.all([
    coursesIntegrationApi.listCourses(workspaceId.value, { force: forceCourses }),
    coursesIntegrationApi.listPlans(workspaceId.value),
  ])
  if (planResult.error) throw planResult.error
  courses.value = courseItems
  plans.value = planResult.data || []
}

async function connect() {
  if (isConnecting.value || token.value.trim().length < 16) return
  isConnecting.value = true
  errorMessage.value = ''
  try {
    const result = await coursesIntegrationApi.connect(workspaceId.value, token.value.trim())
    integration.value = result.integration
    courses.value = result.courses
    token.value = ''
    await loadPlans()
    notify('Courses подключён', 'success')
  } catch (error) {
    errorMessage.value = error.message || 'Не удалось подключить Courses'
  } finally {
    isConnecting.value = false
  }
}

async function refresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  errorMessage.value = ''
  try {
    await loadConnectedData({ forceCourses: true })
    notify('Данные Courses обновлены', 'success')
  } catch (error) {
    errorMessage.value = error.message || 'Не удалось обновить данные'
  } finally {
    isRefreshing.value = false
  }
}

async function disconnect(deletePlans) {
  if (isDisconnecting.value) return
  isDisconnecting.value = true
  errorMessage.value = ''
  try {
    let deletedEventCount = 0
    if (deletePlans) {
      const cleared = await coursesIntegrationApi.clearPlans(
        workspaceId.value,
        integration.value.id,
      )
      deletedEventCount = Number(cleared?.deletedEventCount || 0)
    }
    const result = await coursesIntegrationApi.disconnect(workspaceId.value)
    integration.value = result.integration
    courses.value = []
    plans.value = deletePlans ? [] : plans.value
    isDisconnectModalOpen.value = false
    if (deletePlans) {
      await calendarStore.loadWorkspace(workspaceId.value)
      notify(`Courses отключён. Удалено занятий: ${deletedEventCount}`, 'success')
    } else {
      notify('Courses отключён. Созданные события сохранены.', 'success')
    }
  } catch (error) {
    errorMessage.value = error.message || 'Не удалось отключить Courses'
  } finally {
    isDisconnecting.value = false
  }
}

function openDeletePlan(plan) {
  planToDelete.value = plan
  isDeletePlanModalOpen.value = true
}

function closeDeletePlan() {
  if (isDeletingPlan.value) return
  isDeletePlanModalOpen.value = false
  planToDelete.value = null
}

async function deletePlan() {
  if (!planToDelete.value || isDeletingPlan.value) return
  isDeletingPlan.value = true
  errorMessage.value = ''
  try {
    const result = await coursesIntegrationApi.deletePlan(planToDelete.value.id)
    plans.value = plans.value.filter((plan) => plan.id !== planToDelete.value.id)
    await calendarStore.loadWorkspace(workspaceId.value)
    notify(`Удалено занятий: ${result?.deletedEventCount || 0}`, 'success')
    closeDeletePlan()
  } catch (error) {
    errorMessage.value = error.message || 'Не удалось удалить план курса'
  } finally {
    isDeletingPlan.value = false
    if (!errorMessage.value) {
      isDeletePlanModalOpen.value = false
      planToDelete.value = null
    }
  }
}

async function openWizard() {
  if (!courses.value.length) await refresh()
  isWizardOpen.value = true
}

async function handleCreated(result) {
  await Promise.all([
    loadPlans(),
    calendarStore.loadWorkspace(workspaceId.value),
  ])
  notify(`Добавлено занятий: ${result?.eventCount || 0}`, 'success')
}

function sessionCount(plan) {
  return Number(plan.course_study_sessions?.[0]?.count || 0)
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ''))
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`))
}
</script>

<style scoped>
.courses-page{display:grid;gap:14px;width:min(100%,1020px);margin:0 auto}.courses-hero,.courses-connect,.courses-plans,.courses-summary article,.courses-state{border:1px solid var(--border-color);border-radius:18px;background:var(--panel-bg);box-shadow:var(--shadow-sm)}.courses-hero{display:grid;gap:22px;padding:20px 22px;background:radial-gradient(circle at 92% 0,color-mix(in srgb,#8b5cf6 18%,transparent),transparent 260px),var(--panel-bg)}.courses-hero>a{display:flex;align-items:center;gap:5px;width:max-content;color:var(--text-secondary);text-decoration:none}.courses-hero>div{display:flex;align-items:center;gap:15px}.courses-hero__mark,.courses-connect__copy>span{display:grid;place-items:center;width:54px;height:54px;border-radius:16px;color:#fff;background:linear-gradient(145deg,#8b5cf6,#4f46e5);font-size:22px}.courses-hero small,.courses-plans header small{color:#a78bfa;font-size:9px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.courses-hero h1,.courses-plans h2,.courses-connect h2{margin:3px 0}.courses-hero p,.courses-connect p{margin:0;color:var(--text-secondary)}.courses-state{display:flex;justify-content:center;align-items:center;gap:9px;min-height:160px;color:var(--text-secondary)}.courses-connect{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:14px;padding:20px}.courses-connect__copy{grid-column:1/-1;display:flex;align-items:center;gap:13px}.courses-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.courses-summary article{display:flex;align-items:center;gap:10px;padding:13px}.courses-summary article>span{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;color:#a78bfa;background:color-mix(in srgb,#8b5cf6 14%,transparent)}.courses-summary small,.courses-summary strong{display:block}.courses-summary small{color:var(--text-muted);font-size:9px;text-transform:uppercase}.courses-summary strong{margin-top:2px}.courses-plans{display:grid;gap:14px;padding:16px}.courses-plans>header{display:flex;align-items:center;justify-content:space-between;gap:12px}.courses-plans__list{display:grid;gap:8px}.courses-plans__list article{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:11px;border:1px solid var(--border-color);border-radius:13px;padding:10px;background:var(--card-bg)}.courses-plans__cover{display:grid;place-items:center;width:44px;height:44px;overflow:hidden;border-radius:11px;color:white;background:linear-gradient(145deg,var(--course-color),color-mix(in srgb,var(--course-color) 40%,#111827))}.courses-plans__cover img{width:100%;height:100%;object-fit:cover}.courses-plans__list strong,.courses-plans__list small{display:block}.courses-plans__list small{margin-top:3px;color:var(--text-muted)}.courses-plans__actions{display:flex;align-items:center;gap:7px}.courses-plans__actions b{border-radius:99px;padding:5px 8px;color:#34d399;background:color-mix(in srgb,#34d399 10%,transparent);font-size:9px;text-transform:uppercase}.courses-plans__empty{display:grid;justify-items:center;gap:6px;padding:34px;color:var(--text-secondary);text-align:center}.courses-plans__empty>span{display:grid;place-items:center;width:48px;height:48px;border-radius:15px;color:#a78bfa;background:color-mix(in srgb,#8b5cf6 12%,transparent);font-size:20px}.courses-plans__empty p{margin:0;color:var(--text-muted)}.courses-footer{display:flex;justify-content:space-between}.courses-error{margin:0;border-radius:11px;padding:11px;color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,transparent)}.courses-confirm{display:grid;justify-items:center;gap:14px;text-align:center}.courses-confirm__icon{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;color:var(--danger);background:color-mix(in srgb,var(--danger) 11%,var(--control-bg));font-size:22px}.courses-confirm p{margin:6px 0 0;color:var(--text-secondary);line-height:1.55}.courses-confirm footer{display:flex;justify-content:center;gap:8px;width:100%;border-top:1px solid var(--border-color);padding-top:14px}.courses-disconnect{display:grid;gap:9px}.courses-disconnect__intro{display:flex;align-items:center;gap:10px;margin-bottom:3px}.courses-disconnect__intro>span{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;color:#a78bfa;background:color-mix(in srgb,#8b5cf6 12%,transparent)}.courses-disconnect__intro p{margin:0;color:var(--text-secondary)}.courses-disconnect>button:not(.ui-button){display:grid;grid-template-columns:40px minmax(0,1fr) 18px;align-items:center;gap:11px;width:100%;border:1px solid var(--border-color);border-radius:14px;padding:12px;color:var(--text-primary);background:var(--card-bg);text-align:left}.courses-disconnect>button:not(.ui-button):hover{border-color:var(--border-strong);background:var(--control-bg)}.courses-disconnect>button:not(.ui-button)>span{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;color:#a78bfa;background:color-mix(in srgb,#8b5cf6 10%,transparent)}.courses-disconnect>button.danger>span{color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,transparent)}.courses-disconnect>button strong,.courses-disconnect>button small{display:block}.courses-disconnect>button small{margin-top:3px;color:var(--text-muted);line-height:1.4}@media(max-width:640px){.courses-summary{grid-template-columns:1fr}.courses-connect{grid-template-columns:1fr}.courses-plans>header{align-items:flex-start;flex-direction:column}.courses-plans__list article{grid-template-columns:44px minmax(0,1fr)}.courses-plans__actions{grid-column:1/-1;justify-content:space-between}.courses-footer{gap:8px}}
</style>
