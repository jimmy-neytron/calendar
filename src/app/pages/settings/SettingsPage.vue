<template>
  <section class="settings-page">
    <header class="settings-page__hero panel">
      <div>
        <span>Персональные настройки</span>
        <h1>Настрой приложение под себя</h1>
        <p>Профиль, внешний вид календаря и понятное управление синхронизацией — без технического шума.</p>
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
            <UiColorPicker v-model="accountForm.color" label="Цвет профиля" />
          </label>
        </div>

        <template #actions>
          <UiButton @click="saveAccount">Сохранить профиль</UiButton>
          <UiButton variant="secondary" @click="logout">Выйти из аккаунта</UiButton>
        </template>
      </SettingsSectionCard>

      <SettingsSectionCard
        icon="?"
        eyebrow="Помощь"
        title="Обучение по приложению"
        description="Полноэкранный тур объяснит назначение календаря, фильмов, спорта, идей, активности, аналитики и остальных возможностей."
        tone="warning"
      >
        <div class="learning-preview">
          <span><UiIcon name="play" /></span>
          <div>
            <strong>Пройти обучение заново</strong>
            <small>Прогресс и данные приложения не изменятся. Тур можно закрыть в любой момент.</small>
          </div>
          <UiButton icon="play" @click="openOnboarding">Запустить обучение</UiButton>
        </div>
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
        icon="↻"
        eyebrow="Данные"
        title="Синхронизация и перенос"
        description="События сохраняются в Supabase автоматически. Здесь нужны только перенос и личная копия."
        tone="accent"
      >
        <div class="sync-status" :class="{ 'sync-status--error': workspaceStore.error.value }">
          <span class="sync-status__icon">{{ workspaceStore.error.value ? '!' : '✓' }}</span>
          <div>
            <strong>{{ workspaceStore.error.value ? 'Есть проблема с синхронизацией' : 'Синхронизация включена' }}</strong>
            <small>
              {{ workspaceStore.error.value || `Пространство «${activeWorkspace?.name || 'Моё пространство'}» подключено к Supabase` }}
            </small>
          </div>
        </div>

        <div class="data-actions">
          <article>
            <span>☁</span>
            <div>
              <strong>Сохраняется автоматически</strong>
              <small>События, дни рождения, идеи, спорт и участники доступны после входа на другом устройстве.</small>
            </div>
          </article>
          <article>
            <span>↓</span>
            <div>
              <strong>Личная JSON-копия</strong>
              <small>Нужна только для архива или ручного переноса. Для обычной работы экспортировать ничего не требуется.</small>
            </div>
          </article>
          <article>
            <span>↥</span>
            <div>
              <strong>Старые данные браузера</strong>
              <small>Если до подключения Supabase уже были события, перенеси их один раз в текущее пространство.</small>
            </div>
          </article>
        </div>

        <label class="settings-field import-mode">
          <span>При импорте JSON</span>
          <UiSelect v-model="importMode">
            <option value="merge">Добавить недостающие записи</option>
            <option value="replace">Полностью заменить локальную копию</option>
          </UiSelect>
        </label>

        <template #actions>
          <UiButton icon="↓" @click="exportAll">Скачать JSON-копию</UiButton>
          <UiButton variant="secondary" @click="migrateLocalData">Перенести старые данные</UiButton>
          <label class="upload-button">
            <input type="file" accept="application/json" @change="handleImport" />
            Загрузить JSON
          </label>
          <UiButton variant="danger" @click="clearLocalData">Очистить локальный кеш</UiButton>
        </template>
      </SettingsSectionCard>
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import SettingsSectionCard from '../../components/settings/SettingsSectionCard.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiInput from '../../components/ui/UiInput.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import UiToggle from '../../components/ui/UiToggle.vue'
import UiColorPicker from '../../components/ui/UiColorPicker.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import { authStore } from '../../stores/auth.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'
import { useAppBackup } from '../../composables/data/useAppBackup.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { useCalendarPreferences } from '../../composables/preferences/useCalendarPreferences.js'
import { useLocalReminders } from '../../composables/notifications/useLocalReminders.js'
import { migrateLocalDataToSupabase } from '../../services/backend/localDataMigration.service.js'
import { useOnboarding } from '../../composables/onboarding/useOnboarding.js'

const router = useRouter()
const { notify } = useNotification()
const { start: startOnboarding } = useOnboarding()
const { exportAll, importAll, clearAll } = useAppBackup()
const { preferences, themeOptions } = useCalendarPreferences()
const {
  enabled: localRemindersEnabled,
  enable: enableLocalReminders,
  disable: disableLocalReminders,
} = useLocalReminders()

const currentUser = authStore.currentUser
const activeWorkspace = workspaceStore.activeWorkspace
const accountForm = reactive({ name: '', avatar: '', color: '#ffffff' })
const importMode = ref('merge')
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

function clearLocalData() {
  clearAll()
  notify('Локальный кеш очищен. Облачные данные останутся в Supabase.', 'info')
}

function openOnboarding() {
  startOnboarding({ force: true })
}

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
  grid-template-columns: minmax(220px, 1.2fr) minmax(150px, 0.6fr) minmax(190px, 0.8fr);
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

.learning-preview {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid color-mix(in srgb, var(--warning) 22%, var(--border-color));
  border-radius: 14px;
  padding: 14px;
  background:
    radial-gradient(circle at 100% 0, color-mix(in srgb, var(--warning) 10%, transparent), transparent 180px),
    var(--card-soft);
}

.learning-preview > span {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 11%, var(--control-bg));
  font-size: 20px;
}

.learning-preview strong,
.learning-preview small {
  display: block;
}

.learning-preview small {
  margin-top: 3px;
  color: var(--text-muted);
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 11px;
  border: 1px solid color-mix(in srgb, var(--success) 28%, var(--border-color));
  border-radius: 12px;
  padding: 14px;
  background: color-mix(in srgb, var(--success) 7%, var(--card-soft));
}

.sync-status--error {
  border-color: color-mix(in srgb, var(--danger) 30%, var(--border-color));
  background: color-mix(in srgb, var(--danger) 7%, var(--card-soft));
}

.sync-status__icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--success);
  background: color-mix(in srgb, var(--success) 14%, var(--control-bg));
  font-weight: 900;
}

.sync-status--error .sync-status__icon { color: var(--danger); }
.sync-status strong,
.sync-status small { display: block; }
.sync-status small {
  display: block;
  color: var(--text-muted);
}

.data-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.data-actions article {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 9px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  background: var(--card-soft);
}

.data-actions article > span {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  color: var(--info);
  background: color-mix(in srgb, var(--info) 10%, var(--control-bg));
  font-weight: 800;
}

.data-actions strong,
.data-actions small { display: block; }
.data-actions small { margin-top: 3px; color: var(--text-muted); line-height: 1.35; }
.import-mode { max-width: 360px; }
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
    grid-template-columns: minmax(0, 1fr) minmax(150px, 0.6fr) minmax(180px, .8fr);
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
  .data-actions,
  .learning-preview {
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
