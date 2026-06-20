<template>
  <section class="settings-page">
    <header class="settings-page__hero panel">
      <div>
        <span>Персональные настройки</span>
        <h1>Настрой приложение под себя</h1>
        <p>Профиль, внешний вид календаря и управление локальными данными — без рабочих разделов и лишнего шума.</p>
      </div>
      <RouterLink class="settings-page__workspace-link" :to="{ name: 'workspace' }">
        <small>Текущее пространство</small>
        <strong>{{ activeWorkspace?.name || 'Не выбрано' }}</strong>
        <span>Участники и доступ →</span>
      </RouterLink>
    </header>

    <div class="settings-page__grid">
      <SettingsSectionCard
        icon="◉"
        eyebrow="Профиль"
        title="Личный аккаунт"
        description="Имя и визуальный идентификатор, которые видят участники пространства."
        tone="accent"
      >
        <div class="profile-preview">
          <div class="profile-preview__avatar" :style="{ '--profile-color': accountForm.color }">
            {{ accountForm.avatar || '?' }}
          </div>
          <div>
            <strong>{{ accountForm.name || 'Пользователь' }}</strong>
            <span>{{ currentUser?.email }}</span>
          </div>
        </div>

        <div class="settings-fields settings-fields--profile">
          <UiInput v-model="accountForm.name" label="Имя" />
          <UiInput v-model="accountForm.avatar" label="Аватар" placeholder="Одна буква" />
          <label class="settings-field">
            <span>Цвет профиля</span>
            <input v-model="accountForm.color" type="color" />
          </label>
        </div>

        <template #actions>
          <UiButton @click="saveAccount">Сохранить профиль</UiButton>
          <UiButton variant="secondary" @click="logout">Выйти из аккаунта</UiButton>
        </template>
      </SettingsSectionCard>

      <SettingsSectionCard
        icon="✦"
        eyebrow="Календарь"
        title="Отображение и поведение"
        description="Настройки применяются сразу и сохраняются на этом устройстве."
        tone="success"
      >
        <template #status>
          <span v-if="preferencesSaved" class="saved-badge">Сохранено</span>
        </template>

        <div class="preference-grid">
          <label class="preference-card">
            <span class="preference-card__icon">▦</span>
            <span>
              <strong>Стартовый режим</strong>
              <small>Как открывать календарь</small>
            </span>
            <UiSelect v-model="preferences.defaultMode" @change="markPreferencesSaved">
              <option value="month">Месяц</option>
              <option value="week">Неделя</option>
              <option value="day">День</option>
            </UiSelect>
          </label>

          <label class="preference-card">
            <span class="preference-card__icon">1</span>
            <span>
              <strong>Начало недели</strong>
              <small>Первый день сетки</small>
            </span>
            <UiSelect v-model.number="preferences.weekStartsOn" @change="markPreferencesSaved">
              <option :value="1">Понедельник</option>
              <option :value="0">Воскресенье</option>
            </UiSelect>
          </label>

          <label class="preference-card">
            <span class="preference-card__icon">≡</span>
            <span>
              <strong>Плотность</strong>
              <small>Расстояние между элементами</small>
            </span>
            <UiSelect v-model="preferences.density" @change="markPreferencesSaved">
              <option value="compact">Компактная</option>
              <option value="normal">Обычная</option>
            </UiSelect>
          </label>

          <label class="preference-card">
            <span class="preference-card__icon">◐</span>
            <span>
              <strong>Тема</strong>
              <small>Цветовая схема интерфейса</small>
            </span>
            <UiSelect v-model="preferences.theme" @change="markPreferencesSaved">
              <option v-for="theme in themeOptions" :key="theme.value" :value="theme.value">
                {{ theme.label }}
              </option>
            </UiSelect>
          </label>
        </div>

        <label class="settings-switch">
          <span>
            <strong>Скрывать прошедшие события</strong>
            <small>Прошедшие записи не будут мешать текущему расписанию.</small>
          </span>
          <UiToggle v-model="preferences.hidePastEvents" @update:model-value="markPreferencesSaved" />
        </label>

        <div class="settings-switch">
          <span>
            <strong>Уведомления на устройстве</strong>
            <small>Напоминания о событиях будут появляться даже при свёрнутой вкладке.</small>
          </span>
          <UiButton
            size="sm"
            :variant="localRemindersEnabled ? 'secondary' : 'primary'"
            @click="toggleLocalReminders"
          >
            {{ localRemindersEnabled ? 'Выключить' : 'Включить' }}
          </UiButton>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        icon="↓"
        eyebrow="Хранилище"
        title="Резервная копия и данные"
        description="Общие данные синхронизируются с Supabase, а JSON остаётся резервной копией."
        tone="warning"
      >
        <div class="storage-summary">
          <div class="storage-summary__meter">
            <span :style="{ width: `${Math.min(quota.percentUsed || 0, 100)}%` }" />
          </div>
          <div>
            <strong>{{ quota.supported ? `${quota.percentUsed}% занято` : 'Оценка хранилища недоступна' }}</strong>
            <small v-if="quota.supported">{{ formatBytes(quota.usage) }} из {{ formatBytes(quota.quota) }}</small>
          </div>
        </div>

        <div class="data-tools">
          <label class="settings-field">
            <span>Режим импорта</span>
            <UiSelect v-model="importMode">
              <option value="replace">Заменить текущие данные</option>
              <option value="merge">Объединить по ID</option>
            </UiSelect>
          </label>
          <p :class="{ warning: isWarning }">
            {{ isWarning ? 'Хранилище почти заполнено — рекомендуем экспортировать JSON.' : 'События и общие разделы синхронизируются с Supabase.' }}
          </p>
        </div>

        <template #actions>
          <UiButton icon="↓" @click="exportAll">Экспорт JSON</UiButton>
          <UiButton variant="secondary" @click="migrateLocalData">Перенести старые данные в Supabase</UiButton>
          <label class="upload-button">
            <input type="file" accept="application/json" @change="handleImport" />
            Импорт JSON
          </label>
          <UiButton variant="secondary" @click="handleManualBackup">Создать автобэкап</UiButton>
          <UiButton variant="secondary" @click="handleRestoreAutoBackup">Восстановить</UiButton>
          <UiButton variant="danger" @click="clearAll">Сбросить данные</UiButton>
        </template>
      </SettingsSectionCard>
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import SettingsSectionCard from '../../components/settings/SettingsSectionCard.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiInput from '../../components/ui/UiInput.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import UiToggle from '../../components/ui/UiToggle.vue'
import { authStore } from '../../stores/auth.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'
import { useAppBackup } from '../../composables/data/useAppBackup.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { useStorageQuota } from '../../composables/storage/useStorageQuota.js'
import { useAutoBackup } from '../../composables/storage/useAutoBackup.js'
import { useCalendarPreferences } from '../../composables/preferences/useCalendarPreferences.js'
import { useLocalReminders } from '../../composables/notifications/useLocalReminders.js'
import { migrateLocalDataToSupabase } from '../../services/backend/localDataMigration.service.js'

const router = useRouter()
const { notify } = useNotification()
const { exportAll, importAll, clearAll } = useAppBackup()
const { quota, isWarning, formatBytes, refreshQuota } = useStorageQuota()
const { createAutoBackup, restoreAutoBackup } = useAutoBackup()
const { preferences, themeOptions } = useCalendarPreferences()
const {
  enabled: localRemindersEnabled,
  enable: enableLocalReminders,
  disable: disableLocalReminders,
} = useLocalReminders()

const currentUser = authStore.currentUser
const activeWorkspace = workspaceStore.activeWorkspace
const accountForm = reactive({ name: '', avatar: '', color: '#ffffff' })
const importMode = ref('replace')
const preferencesSaved = ref(false)
let preferencesSavedTimer = null

watch(currentUser, (user) => {
  accountForm.name = user?.name || ''
  accountForm.avatar = user?.avatar || ''
  accountForm.color = user?.color || '#ffffff'
}, { immediate: true })

async function saveAccount() {
  const result = await authStore.updateCurrentUser({ ...accountForm })
  notify(result.ok ? 'Профиль обновлён' : result.message, result.ok ? 'success' : 'danger')
}

async function logout() {
  await authStore.logout()
  router.push({ name: 'login' })
}

function markPreferencesSaved() {
  preferencesSaved.value = true
  window.clearTimeout(preferencesSavedTimer)
  preferencesSavedTimer = window.setTimeout(() => {
    preferencesSaved.value = false
  }, 1500)
}

async function toggleLocalReminders() {
  if (localRemindersEnabled.value) {
    disableLocalReminders()
    notify('Уведомления выключены', 'info')
    return
  }
  const result = await enableLocalReminders()
  notify(result.message, result.ok ? 'success' : 'warning')
}

async function migrateLocalData() {
  const result = await migrateLocalDataToSupabase()
  notify(
    result.ok ? `Перенесено записей: ${result.total}` : result.message,
    result.ok ? 'success' : 'danger'
  )
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    await importAll(file, importMode.value)
  } catch (error) {
    notify(error.message || 'Не удалось импортировать данные', 'danger')
  } finally {
    event.target.value = ''
  }
}

function handleManualBackup() {
  createAutoBackup()
  notify('Автобэкап обновлён', 'success')
}

function handleRestoreAutoBackup() {
  if (!restoreAutoBackup()) {
    notify('Автобэкап пока не найден', 'warning')
    return
  }
  window.location.reload()
}

onMounted(refreshQuota)
onBeforeUnmount(() => window.clearTimeout(preferencesSavedTimer))
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 14px;
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: 14px;
}

.settings-page__hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 230px;
  align-items: center;
  gap: 18px;
  padding: 20px;
  overflow: hidden;
}

.settings-page__hero span,
.settings-field > span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.11em;
}

.settings-page__hero h1 {
  margin: 3px 0 6px;
}

.settings-page__hero p {
  max-width: 650px;
  margin: 0;
  color: var(--text-secondary);
}

.settings-page__workspace-link {
  display: grid;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  color: var(--text-primary);
  background: var(--card-soft);
  text-decoration: none;
  transition:
    border-color 0.18s var(--ease-out),
    background 0.18s var(--ease-out),
    transform 0.18s var(--ease-out);
}

.settings-page__workspace-link:hover {
  border-color: var(--border-strong);
  background: var(--control-bg-hover);
  transform: translateY(-1px);
}

.settings-page__workspace-link small,
.settings-page__workspace-link span {
  color: var(--text-muted);
  font-size: 10px;
}

.settings-page__grid {
  display: grid;
  gap: 14px;
}

.profile-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px;
  background: var(--card-soft);
}

.profile-preview__avatar {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  color: var(--avatar-text);
  background: var(--profile-color);
  font-weight: 900;
}

.profile-preview strong,
.profile-preview span {
  display: block;
}

.profile-preview span {
  color: var(--text-muted);
  font-size: 11px;
}

.settings-fields,
.settings-field {
  display: grid;
  gap: 6px;
}

.settings-fields--profile {
  grid-template-columns: minmax(220px, 1.4fr) minmax(150px, 0.7fr) 110px;
}

.settings-field input[type='color'] {
  width: 100%;
  min-height: 36px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 4px;
  background: var(--field-bg);
}

.preference-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.preference-card {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-content: start;
  align-items: center;
  gap: 10px;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  background: var(--card-soft);
}

.preference-card__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  color: var(--text-secondary);
  background: var(--control-bg);
  font-weight: 900;
}

.preference-card strong,
.preference-card small {
  display: block;
}

.preference-card small {
  color: var(--text-muted);
  font-size: 10px;
}

.preference-card :deep(.ui-select) {
  grid-column: 1 / -1;
  margin-top: 2px;
}

.settings-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  background: var(--card-soft);
}

.settings-switch strong,
.settings-switch small {
  display: block;
}

.settings-switch small {
  color: var(--text-muted);
}

.saved-badge {
  border: 1px solid color-mix(in srgb, var(--success) 32%, transparent);
  border-radius: var(--radius-pill);
  padding: 4px 9px;
  color: var(--success);
  background: color-mix(in srgb, var(--success) 9%, transparent);
  font-size: 10px;
  font-weight: 800;
}

.storage-summary {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) 1fr;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px;
  background: var(--card-soft);
}

.storage-summary__meter {
  height: 8px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--control-bg);
}

.storage-summary__meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--warning);
}

.storage-summary small {
  display: block;
  color: var(--text-muted);
}

.data-tools {
  display: grid;
  grid-template-columns: minmax(260px, 0.65fr) 1fr;
  align-items: center;
  gap: 12px;
}

.data-tools p {
  margin: 0;
  color: var(--text-muted);
}

.data-tools p.warning {
  color: var(--warning);
}

.upload-button {
  display: grid;
  place-items: center;
  min-height: 34px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 0 14px;
  color: var(--text-primary);
  background: var(--control-bg);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.upload-button input {
  display: none;
}

@media (max-width: 1040px) {
  .preference-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings-fields--profile {
    grid-template-columns: minmax(0, 1fr) minmax(150px, 0.6fr) 100px;
  }
}

@media (max-width: 720px) {
  .settings-page {
    padding: 10px;
  }

  .settings-page__hero {
    grid-template-columns: 1fr;
    padding: 14px;
  }

  .settings-page__workspace-link {
    min-width: 0;
  }

  .settings-fields--profile,
  .preference-grid,
  .data-tools,
  .storage-summary {
    grid-template-columns: 1fr;
  }

  .profile-preview {
    padding: 11px;
  }

  .settings-switch {
    align-items: flex-start;
  }
}

@media (max-width: 460px) {
  .preference-card {
    padding: 10px;
  }

  .settings-page__hero h1 {
    font-size: 25px;
  }
}
</style>
