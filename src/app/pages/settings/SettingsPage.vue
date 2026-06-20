<template>
  <section class="settings-page">
    <header class="settings-hero panel">
      <div class="settings-hero__content">
        <p>Настройки</p>
        <h1>Аккаунт, пространство и уведомления</h1>
        <span>Все важное собрано в одном месте: профиль, участники, приглашения, внешний вид и локальные данные.</span>
      </div>

      <div class="settings-hero__summary">
        <article>
          <small>Аккаунт</small>
          <strong>{{ currentUser?.name || 'Пользователь' }}</strong>
        </article>
        <article>
          <small>Пространство</small>
          <strong>{{ activeWorkspace?.name || 'Не выбрано' }}</strong>
        </article>
        <article>
          <small>Роль</small>
          <strong>{{ roleLabel(currentUserRole) }}</strong>
        </article>
      </div>
    </header>

    <div class="settings-layout">
      <aside class="settings-nav panel">
        <a href="#account">Аккаунт</a>
        <a href="#workspace">Пространство</a>
        <a href="#notifications">Уведомления</a>
        <a href="#view">Внешний вид</a>
        <a href="#invites">Приглашения</a>
        <a href="#data">Данные</a>
        <a href="#history">История</a>
      </aside>

      <div class="settings-stack">
        <section id="account" class="settings-card settings-card--profile">
          <div class="settings-card__title">
            <span>Аккаунт</span>
            <h2>Личный профиль</h2>
          </div>

          <div class="profile-block">
            <div class="profile-block__avatar" :style="{ '--profile-color': accountForm.color }">{{ accountForm.avatar || '?' }}</div>
            <div>
              <strong>{{ currentUser?.name || 'Пользователь' }}</strong>
              <small>{{ currentUser?.email }}</small>
              <small>ID: {{ currentUser?.id }}</small>
            </div>
          </div>

          <div class="settings-card__grid settings-card__grid--3">
            <UiInput v-model="accountForm.name" label="Имя" />
            <UiInput v-model="accountForm.avatar" label="Аватар" placeholder="1 буква" />
            <label class="settings-field">
              <span>Цвет</span>
              <input v-model="accountForm.color" type="color" />
            </label>
          </div>

          <div class="settings-card__actions">
            <UiButton @click="saveAccount">Сохранить профиль</UiButton>
            <UiButton variant="secondary" @click="logout">Выйти</UiButton>
          </div>
        </section>

        <section id="workspace" class="settings-card">
          <div class="settings-card__title settings-card__title--row">
            <div>
              <span>Пространство</span>
              <h2>{{ activeWorkspace?.name || 'Нет пространства' }}</h2>
            </div>
            <UiButton variant="secondary" icon="←" @click="router.push({ name: 'calendar' })">К календарю</UiButton>
          </div>

          <div class="workspace-grid">
            <label class="settings-field settings-field--large">
              <span>Активное пространство</span>
              <select :value="activeWorkspace?.id" @change="handleSwitchWorkspace($event.target.value)">
                <option v-for="workspace in currentUserSpaces" :key="workspace.id" :value="workspace.id">
                  {{ workspace.name }}
                </option>
              </select>
            </label>
            <UiInput v-model="workspaceForm.name" label="Название пространства" />
            <UiInput v-model="newWorkspaceName" label="Новое пространство" placeholder="Например: Работа" />
          </div>

          <div class="settings-card__actions">
            <UiButton @click="saveWorkspace">Переименовать</UiButton>
            <UiButton variant="secondary" @click="createWorkspace">Создать пространство</UiButton>
          </div>

          <div class="members-panel">
            <div class="members-panel__head">
              <span>Участники</span>
              <b>{{ activeWorkspaceMembers.length }}</b>
            </div>

            <article v-for="member in activeWorkspaceMembers" :key="member.id" class="member-row">
              <div class="member-row__avatar" :style="{ '--member-color': member.color }">{{ member.avatar }}</div>
              <div>
                <strong>{{ member.name }}</strong>
                <small>{{ member.email }}</small>
              </div>
              <select
                v-if="member.id !== activeWorkspace?.ownerId && canManageRoles"
                :value="member.role"
                @change="changeRole(member.id, $event.target.value)"
              >
                <option value="admin">Админ</option>
                <option value="member">Участник</option>
                <option value="viewer">Просмотр</option>
              </select>
              <em v-else>{{ member.id === activeWorkspace?.ownerId ? 'владелец' : roleLabel(member.role) }}</em>
              <button v-if="member.id !== activeWorkspace?.ownerId" type="button" @click="removeMember(member.id)">убрать</button>
            </article>
          </div>
        </section>

        <section id="notifications" class="settings-card settings-card--notifications">
          <div class="settings-card__title">
            <span>Уведомления</span>
            <h2>Что изменилось для тебя</h2>
          </div>
          <p class="settings-card__hint">
            Если другой участник создает или меняет событие, где ты указан, уведомление обновляется в одной карточке. Так список не превращается в шум.
          </p>
          <NotificationCenter />
        </section>

        <section id="view" class="settings-card">
          <div class="settings-card__title">
            <span>Удобство</span>
            <h2>Внешний вид календаря</h2>
          </div>

          <div class="settings-card__grid settings-card__grid--4">
            <label class="settings-field">
              <span>Вид по умолчанию</span>
              <select v-model="preferences.defaultMode" @change="savePreferences">
                <option value="month">Месяц</option>
                <option value="week">Неделя</option>
                <option value="day">День</option>
              </select>
            </label>
            <label class="settings-field">
              <span>Первый день</span>
              <select v-model.number="preferences.weekStartsOn" @change="savePreferences">
                <option :value="1">Понедельник</option>
                <option :value="0">Воскресенье</option>
              </select>
            </label>
            <label class="settings-field">
              <span>Плотность</span>
              <select v-model="preferences.density" @change="savePreferences">
                <option value="compact">Компактная</option>
                <option value="normal">Обычная</option>
              </select>
            </label>
            <label class="settings-field">
              <span>Тема</span>
              <select v-model="preferences.theme" @change="savePreferences">
                <option v-for="theme in themeOptions" :key="theme.value" :value="theme.value">
                  {{ theme.label }}
                </option>
              </select>
            </label>
          </div>

          <label class="settings-check">
            <input v-model="preferences.hidePastEvents" type="checkbox" @change="savePreferences" />
            <span>Скрывать прошедшие события</span>
          </label>
        </section>

        <section id="invites" class="settings-card">
          <div class="settings-card__title">
            <span>Приглашения</span>
            <h2>Доступ в пространство</h2>
          </div>

          <div class="invite-grid">
            <div class="invite-panel">
              <UiInput v-model="inviteEmail" label="Email для приглашения" placeholder="Можно оставить пустым" />
              <div class="settings-card__actions">
                <UiButton @click="createInvite">Создать код</UiButton>
                <UiButton variant="secondary" :disabled="!lastInviteCode" @click="copyLastInvite">Скопировать</UiButton>
              </div>
              <article v-if="lastInviteCode" class="invite-code">
                <span>Код приглашения</span>
                <strong>{{ lastInviteCode }}</strong>
              </article>
            </div>

            <div class="invite-panel">
              <UiInput v-model="joinCode" label="Войти по коду" placeholder="Например: A1B2C3" />
              <UiButton variant="secondary" @click="acceptInvite">Присоединиться</UiButton>
              <div v-if="activeWorkspaceInvites.length" class="invite-list">
                <span>Активные коды</span>
                <code v-for="invite in activeWorkspaceInvites" :key="invite.id">
                  {{ invite.code }}<template v-if="invite.invitedEmail"> · {{ invite.invitedEmail }}</template>
                </code>
              </div>
            </div>
          </div>
        </section>

        <section id="data" class="settings-card">
          <div class="settings-card__title">
            <span>Локальные данные</span>
            <h2>Резервная копия</h2>
          </div>

          <div class="data-grid">
            <article class="backup-status">
              <span>localStorage</span>
              <strong v-if="quota.supported">{{ quota.percentUsed }}% занято</strong>
              <strong v-else>квота недоступна</strong>
              <small v-if="quota.supported">{{ formatBytes(quota.usage) }} из {{ formatBytes(quota.quota) }}</small>
              <small :class="{ warning: isWarning }">
                {{ isWarning ? 'Хранилище почти заполнено — сделай экспорт JSON' : 'Данные сохраняются только на этом устройстве' }}
              </small>
            </article>

            <div class="backup-actions">
              <label class="settings-field">
                <span>Режим импорта</span>
                <select v-model="importMode">
                  <option value="replace">Заменить текущие данные</option>
                  <option value="merge">Объединить по id</option>
                </select>
              </label>
              <div class="settings-card__actions settings-card__actions--stack">
                <UiButton icon="⬇" @click="exportAll">Экспорт JSON</UiButton>
                <label class="upload-button">
                  <input type="file" accept="application/json" @change="handleImport" />
                  Импорт JSON
                </label>
                <UiButton variant="secondary" icon="☁" @click="handleManualBackup">Авто-бэкап</UiButton>
                <UiButton variant="secondary" icon="↺" @click="handleRestoreAutoBackup">Восстановить</UiButton>
                <UiButton variant="danger" icon="⌫" @click="clearAll">Сбросить</UiButton>
              </div>
            </div>
          </div>
        </section>

        <section id="history" class="settings-card">
          <div class="settings-card__title">
            <span>История</span>
            <h2>Последние действия</h2>
          </div>

          <div class="activity-list">
            <article v-for="entry in workspaceActivity.slice(0, 10)" :key="entry.id" class="activity-row">
              <strong>{{ entry.userName }}</strong>
              <span>{{ entry.text }}</span>
              <small>{{ formatActivityDate(entry.createdAt) }}</small>
            </article>
            <p v-if="!workspaceActivity.length" class="muted">История пока пустая.</p>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '../../components/ui/UiButton.vue'
import UiInput from '../../components/ui/UiInput.vue'
import NotificationCenter from '../../components/notifications/NotificationCenter.vue'
import { authStore } from '../../stores/auth.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'
import { useAppBackup } from '../../composables/data/useAppBackup.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { useStorageQuota } from '../../composables/storage/useStorageQuota.js'
import { useAutoBackup } from '../../composables/storage/useAutoBackup.js'
import { useCalendarPreferences } from '../../composables/preferences/useCalendarPreferences.js'
import { useActivityLog } from '../../composables/history/useActivityLog.js'

const router = useRouter()
const { notify } = useNotification()
const { exportAll, importAll, clearAll } = useAppBackup()
const { quota, isWarning, formatBytes, refreshQuota } = useStorageQuota()
const { createAutoBackup, restoreAutoBackup } = useAutoBackup()
const { preferences, updatePreferences, themeOptions } = useCalendarPreferences()
const { workspaceActivity } = useActivityLog()

const currentUser = authStore.currentUser
const activeWorkspace = workspaceStore.activeWorkspace
const currentUserSpaces = workspaceStore.currentUserSpaces
const activeWorkspaceMembers = workspaceStore.activeWorkspaceMembers
const activeWorkspaceInvites = workspaceStore.activeWorkspaceInvites
const currentUserRole = computed(() => workspaceStore.getCurrentUserRole())
const canManageRoles = computed(() => currentUserRole.value === 'owner')

const accountForm = reactive({ name: '', avatar: '', color: '#ffffff' })
const workspaceForm = reactive({ name: '' })
const newWorkspaceName = ref('')
const inviteEmail = ref('')
const joinCode = ref('')
const lastInviteCode = ref('')
const importMode = ref('replace')

watch(currentUser, (user) => {
  accountForm.name = user?.name || ''
  accountForm.avatar = user?.avatar || ''
  accountForm.color = user?.color || '#ffffff'
}, { immediate: true })

watch(activeWorkspace, (workspace) => {
  workspaceForm.name = workspace?.name || ''
}, { immediate: true })

function saveAccount() {
  authStore.updateCurrentUser({
    name: accountForm.name,
    avatar: accountForm.avatar,
    color: accountForm.color,
  })
  notify('Аккаунт обновлён', 'success')
}

function logout() {
  authStore.logout()
  router.push({ name: 'login' })
}

function handleSwitchWorkspace(workspaceId) {
  if (!workspaceStore.switchWorkspace(workspaceId)) return
  notify('Пространство переключено', 'success')
}

function saveWorkspace() {
  if (!activeWorkspace.value) return
  workspaceStore.updateWorkspace(activeWorkspace.value.id, { name: workspaceForm.name })
  notify('Пространство обновлено', 'success')
}

function createWorkspace() {
  const result = workspaceStore.createWorkspace(newWorkspaceName.value)
  if (!result.ok) {
    notify(result.message, 'danger')
    return
  }
  newWorkspaceName.value = ''
  notify('Пространство создано', 'success')
}

function createInvite() {
  if (!activeWorkspace.value) return
  const result = workspaceStore.createInvite(activeWorkspace.value.id, inviteEmail.value)
  if (!result.ok) {
    notify(result.message, 'danger')
    return
  }
  lastInviteCode.value = result.invite.code
  inviteEmail.value = ''
  notify('Код приглашения создан', 'success')
}

async function copyLastInvite() {
  if (!lastInviteCode.value) return
  await navigator.clipboard?.writeText(lastInviteCode.value)
  notify('Код скопирован', 'success')
}

function acceptInvite() {
  const result = workspaceStore.acceptInvite(joinCode.value)
  if (!result.ok) {
    notify(result.message, 'danger')
    return
  }
  joinCode.value = ''
  notify('Ты присоединился к пространству', 'success')
}

function removeMember(userId) {
  if (!activeWorkspace.value) return
  workspaceStore.removeMember(activeWorkspace.value.id, userId)
  notify('Участник удалён из пространства', 'success')
}

function changeRole(userId, role) {
  if (!activeWorkspace.value) return
  const ok = workspaceStore.updateMemberRole(activeWorkspace.value.id, userId, role)
  notify(ok ? 'Роль обновлена' : 'Не удалось изменить роль', ok ? 'success' : 'danger')
}

function savePreferences() {
  updatePreferences(preferences.value)
  notify('Настройки вида сохранены', 'success')
}

const handleImport = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    await importAll(file, importMode.value)
    notify('Данные импортированы', 'success')
  } catch (error) {
    notify(error.message || 'Не удалось импортировать резервную копию', 'danger')
  } finally {
    event.target.value = ''
  }
}

const handleManualBackup = () => {
  createAutoBackup()
  notify('Локальный авто-бэкап обновлён', 'success')
}

const handleRestoreAutoBackup = () => {
  const restored = restoreAutoBackup()
  if (!restored) {
    notify('Авто-бэкап пока не найден', 'warning')
    return
  }

  notify('Авто-бэкап восстановлен', 'success')
  window.location.reload()
}

function roleLabel(role) {
  return {
    owner: 'Владелец',
    admin: 'Админ',
    member: 'Участник',
    viewer: 'Просмотр',
  }[role] || 'Участник'
}

function formatActivityDate(value) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

onMounted(() => {
  refreshQuota()
})
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 14px;
  padding: 14px;
  animation: fadeSlideUp 0.42s var(--ease-out);
}

.settings-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: end;
  padding: 18px;
  overflow: hidden;
}

.settings-hero__content {
  display: grid;
  gap: 5px;
}

.settings-hero__content p,
.settings-card__title span,
.settings-field span,
.members-panel__head span,
.invite-code span,
.invite-list > span,
.backup-status span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.settings-hero h1,
.settings-card__title h2 {
  margin: 0;
}

.settings-hero h1 {
  max-width: 720px;
  font-size: clamp(25px, 4vw, 42px);
}

.settings-hero__content > span,
.settings-card__hint {
  max-width: 680px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.settings-hero__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(96px, 1fr));
  gap: 8px;
}

.settings-hero__summary article {
  display: grid;
  gap: 4px;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px;
  background: var(--card-soft);
}

.settings-hero__summary small {
  color: var(--text-muted);
  font-size: 10px;
}

.settings-hero__summary strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-layout {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.settings-nav {
  position: sticky;
  top: calc(var(--header-height) + 14px);
  display: grid;
  gap: 5px;
  padding: 8px;
}

.settings-nav a {
  border-radius: var(--radius-md);
  padding: 8px 10px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 12px;
  font-weight: 750;
  transition: background 0.18s var(--ease-out), color 0.18s var(--ease-out);
}

.settings-nav a:hover {
  color: var(--text-primary);
  background: var(--control-bg-hover);
}

.settings-stack {
  display: grid;
  gap: 12px;
}

.settings-card {
  display: grid;
  align-content: start;
  gap: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 14px;
  background: var(--card-solid);
  box-shadow: var(--shadow-sm);
}

.settings-card--profile {
  grid-template-columns: 260px minmax(0, 1fr);
  align-items: center;
}

.settings-card--profile .settings-card__title,
.settings-card--profile .profile-block {
  grid-column: 1;
}

.settings-card--profile .settings-card__grid,
.settings-card--profile .settings-card__actions {
  grid-column: 2;
}

.settings-card__title {
  display: grid;
  gap: 4px;
}

.settings-card__title--row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.profile-block {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-block__avatar,
.member-row__avatar {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  color: var(--avatar-text);
  background: var(--profile-color, var(--member-color, var(--accent)));
  font-weight: 900;
}

.profile-block small,
.member-row small,
.backup-status small {
  display: block;
  color: var(--text-muted);
}

.settings-card__grid,
.workspace-grid,
.invite-grid,
.data-grid {
  display: grid;
  gap: 10px;
}

.settings-card__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.settings-card__grid--3 {
  grid-template-columns: 1.4fr 0.8fr 0.6fr;
}

.settings-card__grid--4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.workspace-grid {
  grid-template-columns: 1.2fr 1fr 1fr;
}

.invite-grid,
.data-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.settings-field,
.settings-check {
  display: grid;
  gap: 5px;
}

.settings-field input[type='color'] {
  width: 100%;
  height: 34px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 3px;
  background: var(--card-soft);
}

.settings-field select,
.member-row select {
  width: 100%;
  min-height: 34px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0 10px;
  color: var(--text-primary);
  background: var(--card-soft);
  outline: none;
}

.settings-check {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-weight: 700;
}

.settings-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.settings-card__actions--stack {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.members-panel,
.invite-panel,
.backup-actions,
.activity-list {
  display: grid;
  gap: 8px;
}

.members-panel__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.members-panel__head b {
  display: grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  background: var(--control-bg);
  font-size: 11px;
}

.member-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(102px, auto) auto;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px;
  background: var(--card-soft);
}

.member-row button {
  border: 0;
  color: var(--danger);
  background: transparent;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.member-row em {
  color: var(--text-muted);
  font-size: 11px;
  font-style: normal;
}

.invite-code,
.backup-status,
.activity-row {
  display: grid;
  gap: 4px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px;
  background: var(--card-soft);
}

.invite-code strong {
  font-size: 22px;
  letter-spacing: 0.12em;
}

.invite-list {
  display: grid;
  gap: 5px;
}

.invite-list code {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  color: var(--text-secondary);
  background: var(--bg-primary);
}

.activity-row span,
.activity-row small {
  color: var(--text-muted);
}

.backup-status small.warning {
  color: var(--warning);
}

.upload-button {
  display: grid;
  place-items: center;
  min-height: 34px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  color: var(--text-primary);
  background: var(--control-bg);
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
}

.upload-button input {
  display: none;
}

@media (max-width: 1180px) {
  .settings-hero,
  .settings-layout,
  .settings-card--profile {
    grid-template-columns: 1fr;
  }

  .settings-card--profile .settings-card__title,
  .settings-card--profile .profile-block,
  .settings-card--profile .settings-card__grid,
  .settings-card--profile .settings-card__actions {
    grid-column: auto;
  }

  .settings-nav {
    position: static;
    display: flex;
    flex-wrap: wrap;
  }
}

@media (max-width: 860px) {
  .settings-hero__summary,
  .settings-card__grid,
  .settings-card__grid--3,
  .settings-card__grid--4,
  .workspace-grid,
  .invite-grid,
  .data-grid,
  .settings-card__actions--stack {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .settings-page {
    padding: 10px;
  }

  .settings-hero,
  .settings-card {
    padding: 12px;
  }

  .settings-card__title--row,
  .member-row {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
