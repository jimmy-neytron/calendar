<template>
  <section class="settings-page">
    <header class="settings-hero panel">
      <div class="settings-hero__copy">
        <span class="settings-eyebrow">Настройки календаря</span>
        <h1>Отображение и поведение</h1>
        <p>Настрой календарь так, чтобы он открывался в нужном виде и показывал только важное.</p>
      </div>

      <div class="settings-hero__actions">
        <span v-if="preferencesSaved" class="saved-status">
          <UiIcon name="check" /> Сохранено
        </span>
        <UiButton size="sm" variant="secondary" icon="sparkles" @click="isWhatsNewOpen = true">
          Что нового
        </UiButton>
        <UiButton size="sm" variant="secondary" icon="play" @click="openOnboarding">
          Обучение
        </UiButton>
      </div>
    </header>

    <section class="profile-settings panel">
      <div class="profile-settings__identity">
        <span
          class="profile-settings__avatar"
          :style="{ '--profile-color': currentUser?.color }"
        >
          {{ currentUser?.avatar || '?' }}
        </span>
        <div>
          <small>Профиль</small>
          <strong>{{ currentUser?.name || 'Пользователь' }}</strong>
          <span>{{ currentUser?.email }}</span>
        </div>
      </div>

      <UiButton
        variant="secondary"
        :disabled="isLoggingOut"
        @click="logout"
      >
        {{ isLoggingOut ? 'Выходим…' : 'Выйти из аккаунта' }}
      </UiButton>
    </section>

    <section class="settings-links panel">
      <RouterLink class="settings-link" :to="{ name: 'subscriptions' }">
        <span class="settings-link__icon"><UiIcon name="star" /></span>
        <span>
          <small>Тарифы</small>
          <strong>Подписки и возможности</strong>
        </span>
        <UiIcon name="right" />
      </RouterLink>
    </section>

    <section class="calendar-settings">
      <header class="calendar-settings__header">
        <span class="calendar-settings__icon"><UiIcon name="calendar" /></span>
        <div>
          <small>Календарь</small>
          <h2>Как будет выглядеть ваше расписание</h2>
          <p>Изменения применяются сразу и сохраняются на этом устройстве.</p>
        </div>
      </header>

      <div class="settings-grid">
        <article class="setting-card setting-card--large">
          <div class="setting-card__head">
            <span class="setting-card__icon"><UiIcon name="grid" /></span>
            <div>
              <strong>Стартовый режим</strong>
              <small>Какой вид открывать первым</small>
            </div>
          </div>

          <div class="view-options">
            <button
              v-for="mode in viewModes"
              :key="mode.value"
              type="button"
              :class="{ active: preferences.defaultMode === mode.value }"
              @click="setPreference('defaultMode', mode.value)"
            >
              <span><UiIcon :name="mode.icon" /></span>
              <strong>{{ mode.label }}</strong>
              <small>{{ mode.description }}</small>
              <i><UiIcon name="check" /></i>
            </button>
          </div>
        </article>

        <article class="setting-card">
          <div class="setting-card__head">
            <span class="setting-card__icon"><UiIcon name="calendar" /></span>
            <div>
              <strong>Начало недели</strong>
              <small>Первый день в календарной сетке</small>
            </div>
          </div>
          <div class="segmented-control">
            <button
              v-for="day in weekStartOptions"
              :key="day.value"
              type="button"
              :class="{ active: preferences.weekStartsOn === day.value }"
              @click="setPreference('weekStartsOn', day.value)"
            >
              {{ day.label }}
            </button>
          </div>
        </article>

        <article class="setting-card">
          <div class="setting-card__head">
            <span class="setting-card__icon"><UiIcon name="settings" /></span>
            <div>
              <strong>Плотность</strong>
              <small>Размер карточек и расстояния</small>
            </div>
          </div>
          <div class="density-options">
            <button
              v-for="density in densityOptions"
              :key="density.value"
              type="button"
              :class="{ active: preferences.density === density.value }"
              @click="setPreference('density', density.value)"
            >
              <span :class="`density-preview density-preview--${density.value}`"><i /><i /><i /></span>
              <div><strong>{{ density.label }}</strong><small>{{ density.description }}</small></div>
              <UiIcon name="check" />
            </button>
          </div>
        </article>

        <article class="setting-card">
          <div class="setting-card__head">
            <span class="setting-card__icon"><UiIcon name="sparkles" /></span>
            <div>
              <strong>Тема</strong>
              <small>Цветовая схема приложения</small>
            </div>
          </div>
          <div class="theme-options">
            <button
              v-for="theme in themeOptions"
              :key="theme.value"
              type="button"
              :class="[`theme-option--${theme.value}`, { active: preferences.theme === theme.value }]"
              @click="setPreference('theme', theme.value)"
            >
              <span><i /><i /><i /></span>
              <strong>{{ theme.label }}</strong>
              <UiIcon name="check" />
            </button>
          </div>
        </article>

        <article class="setting-card">
          <div class="setting-card__head">
            <span class="setting-card__icon"><UiIcon name="globe" /></span>
            <div>
              <strong>Страна праздников</strong>
              <small>Официальные выходные в календаре</small>
            </div>
          </div>

          <div class="country-setting">
            <UiSelect
              :model-value="preferences.holidayCountry"
              aria-label="Страна праздничного календаря"
              @update:model-value="setPreference('holidayCountry', $event)"
            >
              <option
                v-for="country in holidayCountryOptions"
                :key="country.value"
                :value="country.value"
              >
                {{ country.label }}
              </option>
            </UiSelect>
            <p>Праздники выбранной страны автоматически появятся в режимах месяца, недели и дня.</p>
          </div>
        </article>

        <article class="setting-card setting-card--switches">
          <div class="setting-card__head">
            <span class="setting-card__icon"><UiIcon name="filter" /></span>
            <div>
              <strong>Поведение</strong>
              <small>Что показывать в расписании</small>
            </div>
          </div>

          <label class="setting-switch">
            <span>
              <strong>Скрывать прошедшие события</strong>
              <small>Прошлые записи не будут отвлекать от текущих планов.</small>
            </span>
            <UiToggle
              v-model="preferences.hidePastEvents"
              label="Скрывать прошедшие события"
              @update:model-value="markPreferencesSaved"
            />
          </label>

          <label class="setting-switch">
            <span>
              <strong>Журнал активности</strong>
              <small>Сохранять историю изменений в Supabase. Когда выключено, раздел «Активность» скрыт и база не заполняется.</small>
            </span>
            <UiToggle
              :model-value="activityLogEnabled"
              label="Журнал активности"
              @update:model-value="toggleActivityLog"
            />
          </label>

          <label class="setting-switch">
            <span>
              <strong>Учёт времени</strong>
              <small>Добавляет отдельный раздел для проектов и часов. Когда выключено, таблицы учёта времени не загружаются и в Supabase ничего не записывается.</small>
            </span>
            <UiToggle
              :model-value="timeTrackingEnabled"
              label="Учёт времени"
              @update:model-value="toggleTimeTracking"
            />
          </label>

          <label class="setting-switch">
            <span>
              <strong>Бюджет</strong>
              <small>Показывает раздел бюджета и связанные платежи в календаре. Когда выключено, бюджет не пишет данные в Supabase, а события платежей скрываются до повторного включения.</small>
            </span>
            <UiToggle
              :model-value="budgetEnabled"
              label="Бюджет"
              @update:model-value="toggleBudget"
            />
          </label>
        </article>
      </div>
    </section>

    <UiModal v-model="isWhatsNewOpen" title="История обновлений" eyebrow="Что нового" width="920px">
      <div class="release-center">
        <div v-if="releaseNotesLoading" class="release-state">
          <span><UiIcon name="refresh" /></span>
          <strong>Загружаем обновления</strong>
        </div>
        <div v-else-if="releaseNotesError" class="release-state release-state--danger">
          <span><UiIcon name="warning" /></span>
          <strong>{{ releaseNotesError }}</strong>
        </div>
        <template v-else>
          <nav class="release-center__nav" aria-label="Версии приложения">
            <button
              v-for="release in versionReleases"
              :key="release.id"
              type="button"
              :class="{ active: selectedReleaseId === release.id }"
              @click="selectedReleaseId = release.id"
            >
              <span>{{ release.version }}</span>
              <small>{{ release.date }}</small>
            </button>
          </nav>

          <article class="release-center__content">
            <header class="release-cover">
              <span class="release-cover__icon"><UiIcon :name="selectedRelease.icon" /></span>
              <div class="release-cover__copy">
                <div class="release-cover__meta">
                  <span>{{ selectedRelease.version }}</span>
                  <span>{{ selectedRelease.date }}</span>
                  <span>{{ selectedRelease.details.length }} изменений</span>
                </div>
                <h3>{{ selectedRelease.title }}</h3>
                <p>{{ selectedRelease.summary }}</p>
              </div>
            </header>

            <section v-if="selectedRelease.cards.length" class="release-feature-grid">
              <article v-for="card in selectedRelease.cards" :key="card.title" class="release-feature-card">
                <UiIcon :name="card.icon" />
                <div>
                  <strong>{{ card.title }}</strong>
                  <p>{{ card.text }}</p>
                </div>
              </article>
            </section>

            <section v-if="selectedRelease.details.length" class="release-details">
              <h4>Все изменения</h4>
              <ul>
                <li v-for="item in selectedRelease.details" :key="item">
                  <span>{{ item }}</span>
                </li>
              </ul>
            </section>
          </article>
        </template>
      </div>
    </UiModal>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '../../components/ui/UiButton.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import UiModal from '../../components/ui/UiModal.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import UiToggle from '../../components/ui/UiToggle.vue'
import { useOnboarding } from '../../composables/onboarding/useOnboarding.js'
import { useActivityLogSettings } from '../../composables/preferences/useActivityLogSettings.js'
import { useBudgetSettings } from '../../composables/preferences/useBudgetSettings.js'
import { useTimeTrackingSettings } from '../../composables/preferences/useTimeTrackingSettings.js'
import { useCalendarPreferences } from '../../composables/preferences/useCalendarPreferences.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { HOLIDAY_COUNTRY_OPTIONS } from '../../utils/constants/calendarConstants.js'
import { authStore } from '../../stores/auth.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'
import { budgetStore } from '../../stores/budget.store.js'
import { timeTrackingStore } from '../../stores/timeTracking.store'
import { discardSyncOperations } from '../../repositories/SyncedCollectionRepository.js'
import { releaseNotesApi } from '../../api/supabase/releaseNotes.api.js'

const { notify } = useNotification()
const router = useRouter()
const { preferences, themeOptions } = useCalendarPreferences()
const {
  isEnabled: activityLogEnabled,
  setEnabled: setActivityLogEnabled,
} = useActivityLogSettings()
const {
  isEnabled: timeTrackingEnabled,
  setEnabled: setTimeTrackingEnabled,
} = useTimeTrackingSettings()
const {
  isEnabled: budgetEnabled,
  setEnabled: setBudgetEnabled,
} = useBudgetSettings()
const { start: startOnboarding } = useOnboarding()

const preferencesSaved = ref(false)
const isLoggingOut = ref(false)
const isWhatsNewOpen = ref(false)
const selectedReleaseId = ref('')
const versionReleases = ref([])
const releaseNotesLoading = ref(false)
const releaseNotesError = ref('')
const currentUser = authStore.currentUser
let preferencesSavedTimer = null

const viewModes = [
  { value: 'month', label: 'Месяц', description: 'Вся картина месяца', icon: 'grid' },
  { value: 'week', label: 'Неделя', description: 'Подробный план недели', icon: 'calendar' },
  { value: 'day', label: 'День', description: 'Фокус на одном дне', icon: 'activity' },
]
const weekStartOptions = [
  { value: 1, label: 'Понедельник' },
  { value: 0, label: 'Воскресенье' },
]
const densityOptions = [
  { value: 'compact', label: 'Компактная', description: 'Больше событий на экране' },
  { value: 'normal', label: 'Обычная', description: 'Больше воздуха между элементами' },
]
const emptyRelease = {
  id: 'empty',
  version: '—',
  date: '',
  title: 'История обновлений пока не загружена',
  icon: 'sparkles',
  summary: 'Примените миграцию app_releases в Supabase и откройте настройки снова.',
  cards: [],
  details: [],
}
const selectedRelease = computed(() => (
  versionReleases.value.find((release) => release.id === selectedReleaseId.value)
  || versionReleases.value[0]
  || emptyRelease
))
const holidayCountryOptions = HOLIDAY_COUNTRY_OPTIONS

async function loadReleaseNotes() {
  if (releaseNotesLoading.value) return
  releaseNotesLoading.value = true
  releaseNotesError.value = ''

  try {
    const { data, error } = await releaseNotesApi.list()
    if (error) {
      releaseNotesError.value = 'Не удалось загрузить историю обновлений'
      return
    }
    versionReleases.value = data
    selectedReleaseId.value = data[0]?.id || emptyRelease.id
  } catch {
    releaseNotesError.value = 'Не удалось загрузить историю обновлений'
  } finally {
    releaseNotesLoading.value = false
  }
}

function setPreference(key, value) {
  preferences.value[key] = value
  markPreferencesSaved()
}

function markPreferencesSaved() {
  preferencesSaved.value = true
  window.clearTimeout(preferencesSavedTimer)
  preferencesSavedTimer = window.setTimeout(() => {
    preferencesSaved.value = false
  }, 1600)
}

function toggleActivityLog(enabled) {
  setActivityLogEnabled(enabled)
  markPreferencesSaved()
  notify(
    enabled ? 'Журнал активности включён' : 'Журнал активности выключен',
    enabled ? 'success' : 'info',
  )
}

async function toggleTimeTracking(enabled) {
  setTimeTrackingEnabled(enabled)
  if (enabled && workspaceStore.activeWorkspaceId.value) {
    await timeTrackingStore.loadWorkspace(workspaceStore.activeWorkspaceId.value)
  } else {
    discardSyncOperations('time_entries')
    discardSyncOperations('time_projects')
  }
  markPreferencesSaved()
  notify(
    enabled ? 'Учёт времени включён' : 'Учёт времени выключен — запись в базу остановлена',
    enabled ? 'success' : 'info',
  )
}

async function toggleBudget(enabled) {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  const saved = await setBudgetEnabled(enabled, workspaceId)

  if (!saved.ok) {
    notify(saved.message || 'Не удалось обновить доступность бюджета', 'danger')
    return
  }

  if (enabled && workspaceId) {
    await budgetStore.loadWorkspace(workspaceId)
    await budgetStore.syncCalendarLinks()
  } else {
    discardSyncOperations('budget_months')
    discardSyncOperations('budget_categories')
    discardSyncOperations('budget_recurring_rules')
    discardSyncOperations('budget_payments')

    if (router.currentRoute.value.name === 'budget') {
      await router.replace({ name: 'settings' })
    }
  }

  markPreferencesSaved()

  notify(
      enabled
          ? 'Бюджет включён'
          : 'Бюджет выключен — записи в базу остановлены, платежи скрыты из календаря',
      enabled ? 'success' : 'info',
  )
}

function openOnboarding() {
  startOnboarding({ force: true })
}

async function logout() {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  try {
    await authStore.logout()
    await router.replace({ name: 'login' })
  } catch {
    notify('Не удалось выйти из аккаунта', 'danger')
    isLoggingOut.value = false
  }
}

onMounted(loadReleaseNotes)
onBeforeUnmount(() => window.clearTimeout(preferencesSavedTimer))
</script>

<style scoped>
.settings-page{display:grid;gap:12px;width:min(100%,1080px);margin:0 auto}.settings-hero{position:relative;display:flex;align-items:center;justify-content:space-between;gap:22px;overflow:hidden;padding:24px 26px;background:radial-gradient(circle at 90% 20%,color-mix(in srgb,var(--info) 10%,transparent),transparent 220px),var(--panel-bg)}.settings-hero::after{position:absolute;top:-80px;right:-55px;width:230px;height:230px;border:1px solid color-mix(in srgb,var(--info) 12%,transparent);border-radius:50%;content:"";pointer-events:none}.settings-eyebrow{color:var(--info);font-size:9px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}.settings-hero h1{margin:5px 0 7px}.settings-hero p{max-width:610px;margin:0;color:var(--text-secondary)}.settings-hero__actions{position:relative;z-index:1;display:flex;align-items:center;gap:8px}.saved-status{display:flex;align-items:center;gap:5px;border:1px solid color-mix(in srgb,var(--success) 24%,var(--border-color));border-radius:var(--radius-pill);padding:6px 9px;color:var(--success);background:color-mix(in srgb,var(--success) 7%,var(--control-bg));font-size:9px;font-weight:800;animation:savedPop .3s var(--ease-out)}
.profile-settings{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px 18px}.profile-settings__identity{display:flex;align-items:center;gap:11px;min-width:0}.profile-settings__avatar{display:grid;place-items:center;width:42px;height:42px;flex:0 0 auto;border:2px solid color-mix(in srgb,var(--profile-color) 45%,var(--border-color));border-radius:50%;color:#071016;background:var(--profile-color,var(--accent));font-size:15px;font-weight:850}.profile-settings__identity div{min-width:0}.profile-settings__identity small,.profile-settings__identity strong,.profile-settings__identity span{display:block}.profile-settings__identity small{color:var(--info);font-size:8px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.profile-settings__identity strong{margin-top:2px}.profile-settings__identity span{overflow:hidden;margin-top:1px;color:var(--text-muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}
.settings-links{display:grid;padding:10px}.settings-link{display:grid;grid-template-columns:38px minmax(0,1fr) 18px;align-items:center;gap:10px;border:1px solid var(--border-color);border-radius:12px;padding:11px;color:var(--text-secondary);background:var(--control-bg);text-decoration:none;transition:.18s var(--ease-out)}.settings-link:hover{border-color:var(--border-strong);color:var(--text-primary);transform:translateY(-1px)}.settings-link__icon{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--control-bg));font-size:17px}.settings-link small,.settings-link strong{display:block}.settings-link small{color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.settings-link strong{margin-top:2px;color:var(--text-primary)}
.calendar-settings{display:grid;gap:18px;border:1px solid var(--border-color);border-radius:var(--radius-xl);padding:22px;background:var(--card-solid);box-shadow:var(--shadow-sm)}.calendar-settings__header{display:flex;align-items:center;gap:12px}.calendar-settings__icon{display:grid;place-items:center;width:46px;height:46px;border-radius:14px;color:var(--info);background:color-mix(in srgb,var(--info) 10%,var(--control-bg));font-size:21px}.calendar-settings__header small{color:var(--info);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.calendar-settings__header h2{margin:2px 0 3px}.calendar-settings__header p{margin:0;color:var(--text-muted);font-size:11px}
.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.setting-card{display:grid;align-content:start;gap:15px;min-width:0;border:1px solid var(--border-color);border-radius:14px;padding:16px;background:linear-gradient(145deg,var(--card-soft),var(--bg-panel));transition:border-color .2s var(--ease-out),transform .2s var(--ease-out)}.setting-card:hover{border-color:var(--border-strong)}.setting-card--large,.setting-card--switches{grid-column:1/-1}.setting-card__head{display:flex;align-items:center;gap:10px}.setting-card__icon{display:grid;place-items:center;width:36px;height:36px;flex:0 0 auto;border-radius:10px;color:var(--text-secondary);background:var(--control-bg);font-size:16px}.setting-card__head strong,.setting-card__head small{display:block}.setting-card__head small{margin-top:2px;color:var(--text-muted);font-size:9px}
.view-options{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.view-options button{position:relative;display:grid;justify-items:start;gap:4px;min-height:122px;border:1px solid var(--border-color);border-radius:12px;padding:13px;color:var(--text-secondary);background:var(--control-bg);text-align:left;transition:.2s var(--ease-out)}.view-options button:hover{border-color:var(--border-strong);transform:translateY(-2px)}.view-options button.active{color:var(--text-primary);border-color:color-mix(in srgb,var(--info) 38%,var(--border-color));background:color-mix(in srgb,var(--info) 7%,var(--control-bg))}.view-options button>span{display:grid;place-items:center;width:34px;height:34px;margin-bottom:7px;border-radius:10px;color:var(--info);background:color-mix(in srgb,var(--info) 10%,var(--control-bg));font-size:16px}.view-options button small{color:var(--text-muted);font-size:9px}.view-options button>i{position:absolute;top:10px;right:10px;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;color:transparent;background:var(--control-bg);font-size:10px;font-style:normal}.view-options button.active>i{color:var(--text-inverse);background:var(--accent)}
.segmented-control{display:grid;grid-template-columns:1fr 1fr;gap:4px;border:1px solid var(--border-color);border-radius:11px;padding:4px;background:var(--control-bg)}.segmented-control button{min-height:38px;border:0;border-radius:8px;color:var(--text-muted);background:transparent;font-size:10px;font-weight:750;transition:.18s var(--ease-out)}.segmented-control button.active{color:var(--text-inverse);background:var(--accent);box-shadow:var(--shadow-sm)}
.density-options{display:grid;gap:6px}.density-options button{display:grid;grid-template-columns:66px minmax(0,1fr) 22px;align-items:center;gap:10px;border:1px solid var(--border-color);border-radius:11px;padding:9px;color:var(--text-secondary);background:var(--control-bg);text-align:left}.density-options button.active{color:var(--text-primary);border-color:var(--border-strong);background:var(--control-bg-hover)}.density-options button>svg{color:transparent}.density-options button.active>svg{color:var(--success)}.density-options strong,.density-options small{display:block}.density-options small{color:var(--text-muted);font-size:9px}.density-preview{display:grid;align-content:center;gap:4px;height:42px;border:1px solid var(--border-color);border-radius:8px;padding:7px;background:var(--bg-primary)}.density-preview i{display:block;height:4px;border-radius:3px;background:var(--text-muted)}.density-preview i:nth-child(2){width:72%}.density-preview--normal{gap:7px}
.theme-options{display:grid;grid-template-columns:1fr 1fr;gap:7px}.theme-options button{display:grid;grid-template-columns:42px minmax(0,1fr) 18px;align-items:center;gap:9px;border:1px solid var(--border-color);border-radius:11px;padding:9px;color:var(--text-secondary);background:var(--control-bg);text-align:left}.theme-options button.active{border-color:var(--border-strong);color:var(--text-primary)}.theme-options button>span{display:grid;grid-template-columns:13px 1fr;grid-template-rows:1fr 1fr;gap:3px;width:42px;height:34px;border-radius:7px;padding:4px;overflow:hidden}.theme-options button>span i{border-radius:3px}.theme-options button>span i:first-child{grid-row:1/-1}.theme-option--black>span{background:#050505}.theme-option--black>span i{background:#242424}.theme-option--black>span i:first-child{background:#111}.theme-option--light>span{background:#f4f1ea}.theme-option--light>span i{background:#ddd5c8}.theme-option--light>span i:first-child{background:#fffaf1}.theme-options button>svg{color:transparent}.theme-options button.active>svg{color:var(--success)}
.country-setting{display:grid;gap:8px}.country-setting :deep(.ui-select){width:100%}.country-setting p{margin:0;color:var(--text-muted);font-size:9px;line-height:1.5}
.setting-card--switches{gap:10px}.setting-switch{display:flex;align-items:center;justify-content:space-between;gap:16px;border-top:1px solid var(--border-color);padding:13px 2px 3px;cursor:pointer}.setting-switch strong,.setting-switch small{display:block}.setting-switch small{max-width:680px;margin-top:2px;color:var(--text-muted);font-size:9px}.setting-switch .setting-switch__status{margin-top:6px;color:var(--info);font-weight:750}.setting-switch .setting-switch__status--success{color:var(--success)}.setting-switch .setting-switch__status--warning{color:var(--warning)}.setting-switch .setting-switch__status--danger{color:var(--danger)}
.release-center{display:grid;gap:16px}.release-state{display:grid;justify-items:center;gap:7px;padding:44px 16px;color:var(--text-secondary);text-align:center}.release-state span{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--control-bg));font-size:20px}.release-state--danger span{color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,var(--control-bg))}.release-center__nav{display:flex;gap:6px;overflow-x:auto;border:1px solid var(--border-color);border-radius:12px;padding:4px;background:var(--control-bg)}.release-center__nav button{display:flex;align-items:center;gap:7px;min-height:32px;border:0;border-radius:9px;padding:0 11px;color:var(--text-muted);background:transparent;font-size:10px;font-weight:850;white-space:nowrap;transition:.18s var(--ease-out)}.release-center__nav button:hover{color:var(--text-primary);background:var(--control-bg-hover)}.release-center__nav button.active{color:var(--text-inverse);background:var(--accent)}.release-center__nav small{color:inherit;font-size:9px;font-weight:700;opacity:.72}.release-center__content{display:grid;gap:12px;min-width:0}.release-cover{display:grid;grid-template-columns:54px minmax(0,1fr);gap:14px;border:1px solid var(--border-color);border-radius:16px;padding:18px;background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 7%,var(--card-solid)),var(--card-solid))}.release-cover__icon{display:grid;place-items:center;width:54px;height:54px;border-radius:14px;color:var(--accent);background:color-mix(in srgb,var(--accent) 11%,var(--control-bg));font-size:24px}.release-cover__meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.release-cover__meta span{border:1px solid var(--border-color);border-radius:999px;padding:4px 8px;color:var(--text-muted);background:var(--control-bg);font-size:9px;font-weight:800}.release-cover__copy h3{max-width:680px;margin:0 0 7px;font-size:24px;line-height:1.15}.release-cover__copy p{max-width:700px;margin:0;color:var(--text-secondary);font-size:12px;line-height:1.6}.release-feature-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.release-feature-card{display:grid;align-content:start;gap:8px;min-width:0;border:1px solid var(--border-color);border-radius:14px;padding:12px;background:var(--card-soft)}.release-feature-card>svg{color:var(--accent);font-size:18px}.release-feature-card strong{display:block;color:var(--text-primary);font-size:12px;line-height:1.25}.release-feature-card p{margin:3px 0 0;color:var(--text-muted);font-size:10px;line-height:1.45}.release-details{display:grid;gap:10px;border:1px solid var(--border-color);border-radius:16px;padding:16px;background:var(--card-soft)}.release-details h4{margin:0;font-size:13px}.release-details ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 14px;margin:0;padding:0;list-style:none}.release-details li{position:relative;padding-left:16px;color:var(--text-secondary);font-size:11px;line-height:1.45}.release-details li::before{position:absolute;left:0;top:.58em;width:5px;height:5px;border-radius:50%;background:var(--success);content:""}
@keyframes savedPop{from{opacity:0;transform:translateY(-5px) scale(.94)}to{opacity:1;transform:none}}@media(max-width:860px){.release-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.release-details ul{grid-template-columns:1fr}}@media(max-width:720px){.settings-hero{align-items:flex-start;padding:19px}.settings-hero__actions{display:grid}.calendar-settings{padding:15px}.settings-grid{grid-template-columns:1fr}.setting-card--large,.setting-card--switches{grid-column:auto}.view-options{grid-template-columns:1fr}.view-options button{min-height:92px;grid-template-columns:42px minmax(0,1fr);align-items:center}.view-options button>span{grid-row:1/3;margin:0}.theme-options{grid-template-columns:1fr}.release-cover{grid-template-columns:1fr}.release-feature-grid{grid-template-columns:1fr}}@media(max-width:480px){.settings-hero{display:grid}.settings-hero__actions{grid-template-columns:auto auto}.profile-settings{align-items:stretch;display:grid}.profile-settings :deep(.ui-button){width:100%}.calendar-settings__header{align-items:flex-start}.setting-switch{align-items:flex-start}.release-cover__copy h3{font-size:20px}}
</style>
