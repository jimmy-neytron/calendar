<template>
  <section class="workspace-page">
    <header class="workspace-page__hero panel">
      <div>
        <span>Совместная работа</span>
        <h1>{{ activeWorkspace?.name || 'Пространство' }}</h1>
        <p>Участники, роли, приглашения и история изменений собраны отдельно от персональных настроек.</p>
      </div>
      <div class="workspace-page__stats">
        <article><strong>{{ activeWorkspaceMembers.length }}</strong><span>участников</span></article>
        <article><strong>{{ activeWorkspaceInvites.length }}</strong><span>приглашений</span></article>
        <article><strong>{{ roleLabel(currentUserRole) }}</strong><span>ваша роль</span></article>
      </div>
    </header>

    <div class="workspace-page__grid">
      <SettingsSectionCard
        icon="◇"
        eyebrow="Пространство"
        title="Основные параметры"
        description="Переключай пространства, меняй название текущего или создавай новое."
        tone="accent"
      >
        <div class="workspace-fields">
          <label class="workspace-field">
            <span>Активное пространство</span>
            <UiSelect :model-value="activeWorkspace?.id" @update:model-value="switchWorkspace">
              <option v-for="workspace in currentUserSpaces" :key="workspace.id" :value="workspace.id">
                {{ workspace.name }}
              </option>
            </UiSelect>
          </label>
          <UiInput v-model="workspaceName" label="Название текущего" />
          <UiInput v-model="newWorkspaceName" label="Новое пространство" placeholder="Например: Работа" />
        </div>
        <template #actions>
          <UiButton @click="saveWorkspace">Сохранить название</UiButton>
          <UiButton variant="secondary" @click="createWorkspace">Создать пространство</UiButton>
        </template>
      </SettingsSectionCard>

      <SettingsSectionCard
        icon="◎"
        eyebrow="Команда"
        title="Участники и роли"
        description="Роли определяют доступ к управлению общим пространством."
        tone="success"
      >
        <div class="member-list">
          <article v-for="member in activeWorkspaceMembers" :key="member.id" class="member-card">
            <div class="member-card__avatar" :style="{ '--member-color': member.color }">{{ member.avatar }}</div>
            <div>
              <strong>{{ member.name }}</strong>
              <span>{{ member.email }}</span>
            </div>
            <UiSelect
              v-if="member.id !== activeWorkspace?.ownerId && canManageRoles"
              :model-value="member.role"
              compact
              @update:model-value="changeRole(member.id, $event)"
            >
              <option value="admin">Админ</option>
              <option value="member">Участник</option>
              <option value="viewer">Просмотр</option>
            </UiSelect>
            <span v-else class="member-card__role">{{ roleLabel(member.role) }}</span>
            <button
              v-if="member.id !== activeWorkspace?.ownerId"
              type="button"
              @click="removeMember(member.id)"
            >
              Убрать
            </button>
          </article>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        icon="◈"
        eyebrow="Календари"
        title="Цветные слои"
        description="Разделяй семейные, личные, рабочие и спортивные события."
        tone="warning"
      >
        <div class="calendar-list">
          <article v-for="calendar in calendars" :key="calendar.id">
            <button
              type="button"
              class="calendar-list__visibility"
              :class="{ muted: !calendar.visible }"
              :style="{ '--calendar-color': calendar.color }"
              @click="calendarCollectionStore.toggleCollection(calendar.id)"
            />
            <input
              :value="calendar.name"
              @change="calendarCollectionStore.updateCollection(calendar.id, { name: $event.target.value })"
            />
            <input
              :value="calendar.color"
              type="color"
              @input="calendarCollectionStore.updateCollection(calendar.id, { color: $event.target.value })"
            />
            <button type="button" @click="removeCalendar(calendar.id)">Удалить</button>
          </article>
        </div>
        <div class="calendar-create">
          <UiInput v-model="newCalendarName" label="Новый календарь" placeholder="Например: Учёба" />
          <input v-model="newCalendarColor" type="color" aria-label="Цвет календаря" />
          <UiButton variant="secondary" @click="createCalendar">Добавить</UiButton>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        icon="+"
        eyebrow="Доступ"
        title="Приглашения"
        description="Создай код для участника или подключись к другому пространству."
      >
        <div class="invite-grid">
          <div class="invite-card">
            <UiInput v-model="inviteEmail" label="Email приглашённого" placeholder="Можно оставить пустым" />
            <UiButton @click="createInvite">Создать код</UiButton>
            <div v-if="lastInviteCode" class="invite-code">
              <span>Код приглашения</span>
              <strong>{{ lastInviteCode }}</strong>
              <button type="button" @click="copyInvite">Копировать</button>
            </div>
          </div>
          <div class="invite-card">
            <UiInput v-model="joinCode" label="Код приглашения" placeholder="Например: A1B2C3" />
            <UiButton variant="secondary" @click="acceptInvite">Присоединиться</UiButton>
            <div v-if="activeWorkspaceInvites.length" class="active-invites">
              <span>Активные коды</span>
              <code v-for="invite in activeWorkspaceInvites" :key="invite.id">{{ invite.code }}</code>
            </div>
          </div>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        icon="↺"
        eyebrow="Активность"
        title="Последние изменения"
        description="Короткая история действий в текущем пространстве."
      >
        <div class="activity-list">
          <article v-for="entry in recentActivity" :key="entry.id">
            <span class="activity-list__dot" />
            <div>
              <strong>{{ entry.userName }}</strong>
              <p>{{ entry.text }}</p>
            </div>
            <small>{{ formatActivityDate(entry.createdAt) }}</small>
          </article>
          <p v-if="!recentActivity.length" class="workspace-page__empty">История пока пуста.</p>
        </div>
      </SettingsSectionCard>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import SettingsSectionCard from '../../components/settings/SettingsSectionCard.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiInput from '../../components/ui/UiInput.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import { workspaceStore } from '../../stores/workspace.store.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { useActivityLog } from '../../composables/history/useActivityLog.js'
import { calendarCollectionStore } from '../../stores/calendarCollection.store.js'

const { notify } = useNotification()
const { workspaceActivity } = useActivityLog()
const activeWorkspace = workspaceStore.activeWorkspace
const currentUserSpaces = workspaceStore.currentUserSpaces
const activeWorkspaceMembers = workspaceStore.activeWorkspaceMembers
const activeWorkspaceInvites = workspaceStore.activeWorkspaceInvites
const currentUserRole = computed(() => workspaceStore.getCurrentUserRole())
const canManageRoles = computed(() => currentUserRole.value === 'owner')
const recentActivity = computed(() => workspaceActivity.value.slice(0, 12))
calendarCollectionStore.ensureWorkspaceCollections()
const calendars = calendarCollectionStore.activeCollections

const workspaceName = ref('')
const newWorkspaceName = ref('')
const inviteEmail = ref('')
const joinCode = ref('')
const lastInviteCode = ref('')
const newCalendarName = ref('')
const newCalendarColor = ref('#60a5fa')

watch(activeWorkspace, (workspace) => {
  workspaceName.value = workspace?.name || ''
  calendarCollectionStore.ensureWorkspaceCollections()
}, { immediate: true })

function switchWorkspace(workspaceId) {
  if (workspaceStore.switchWorkspace(workspaceId)) notify('Пространство переключено', 'success')
}

function saveWorkspace() {
  if (!activeWorkspace.value) return
  workspaceStore.updateWorkspace(activeWorkspace.value.id, { name: workspaceName.value })
  notify('Название обновлено', 'success')
}

function createWorkspace() {
  const result = workspaceStore.createWorkspace(newWorkspaceName.value)
  if (!result.ok) return notify(result.message, 'danger')
  newWorkspaceName.value = ''
  notify('Пространство создано', 'success')
}

function changeRole(userId, role) {
  if (!activeWorkspace.value) return
  const updated = workspaceStore.updateMemberRole(activeWorkspace.value.id, userId, role)
  notify(updated ? 'Роль обновлена' : 'Не удалось изменить роль', updated ? 'success' : 'danger')
}

function removeMember(userId) {
  if (!activeWorkspace.value) return
  workspaceStore.removeMember(activeWorkspace.value.id, userId)
  notify('Участник удалён', 'success')
}

function createInvite() {
  if (!activeWorkspace.value) return
  const result = workspaceStore.createInvite(activeWorkspace.value.id, inviteEmail.value)
  if (!result.ok) return notify(result.message, 'danger')
  lastInviteCode.value = result.invite.code
  inviteEmail.value = ''
}

async function copyInvite() {
  await navigator.clipboard?.writeText(lastInviteCode.value)
  notify('Код скопирован', 'success')
}

function acceptInvite() {
  const result = workspaceStore.acceptInvite(joinCode.value)
  if (!result.ok) return notify(result.message, 'danger')
  joinCode.value = ''
  notify('Вы присоединились к пространству', 'success')
}

function createCalendar() {
  const calendar = calendarCollectionStore.addCollection(newCalendarName.value, newCalendarColor.value)
  if (!calendar) return notify('Укажи название календаря', 'warning')
  newCalendarName.value = ''
  notify('Календарь добавлен', 'success')
}

function removeCalendar(id) {
  const removed = calendarCollectionStore.removeCollection(id)
  notify(removed ? 'Календарь удалён' : 'Нельзя удалить последний календарь', removed ? 'success' : 'warning')
}

function roleLabel(role) {
  return { owner: 'Владелец', admin: 'Админ', member: 'Участник', viewer: 'Просмотр' }[role] || 'Участник'
}

function formatActivityDate(value) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
</script>

<style scoped>
.workspace-page {
  display: grid;
  gap: 14px;
  padding: 14px;
}

.workspace-page__hero {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 18px;
  padding: 20px;
}

.workspace-page__hero > div:first-child > span,
.workspace-field > span,
.invite-code span,
.active-invites > span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.11em;
}

.workspace-page__hero h1 {
  margin: 3px 0 6px;
}

.workspace-page__hero p {
  max-width: 680px;
  margin: 0;
  color: var(--text-secondary);
}

.workspace-page__stats {
  display: flex;
  gap: 8px;
}

.workspace-page__stats article {
  display: grid;
  min-width: 96px;
  border: 1px solid var(--border-color);
  border-radius: 11px;
  padding: 9px;
  background: var(--card-soft);
}

.workspace-page__stats span {
  color: var(--text-muted);
  font-size: 9px;
}

.workspace-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  align-items: start;
}

.workspace-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.workspace-field {
  display: grid;
  gap: 6px;
}

.member-list,
.activity-list {
  display: grid;
  gap: 7px;
}

.member-card {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) minmax(110px, auto) auto;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--border-color);
  border-radius: 11px;
  padding: 8px;
  background: var(--card-soft);
}

.member-card__avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: var(--avatar-text);
  background: var(--member-color);
  font-weight: 900;
}

.member-card strong,
.member-card span {
  display: block;
}

.member-card > div:nth-child(2) span,
.member-card__role {
  color: var(--text-muted);
  font-size: 10px;
}

.member-card > button,
.invite-code button {
  border: 0;
  color: var(--danger);
  background: transparent;
  font-size: 10px;
  font-weight: 800;
}

.invite-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.calendar-list {
  display: grid;
  gap: 7px;
}

.calendar-list article {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 40px auto;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 7px;
  background: var(--card-soft);
}

.calendar-list__visibility {
  width: 24px;
  height: 24px;
  border: 6px solid color-mix(in srgb, var(--calendar-color) 20%, transparent);
  border-radius: 50%;
  background: var(--calendar-color);
}

.calendar-list__visibility.muted {
  opacity: 0.28;
}

.calendar-list input:not([type='color']) {
  min-width: 0;
  border: 0;
  color: var(--text-primary);
  background: transparent;
  outline: 0;
}

.calendar-list input[type='color'],
.calendar-create input[type='color'] {
  width: 38px;
  height: 34px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 3px;
  background: var(--control-bg);
}

.calendar-list article > button:last-child {
  border: 0;
  color: var(--danger);
  background: transparent;
  font-size: 10px;
  font-weight: 800;
}

.calendar-create {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: end;
  gap: 8px;
}

.invite-card {
  display: grid;
  align-content: start;
  gap: 9px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 11px;
  background: var(--card-soft);
}

.invite-code,
.active-invites {
  display: grid;
  gap: 5px;
}

.invite-code strong {
  font-size: 22px;
  letter-spacing: 0.14em;
}

.invite-code button {
  justify-self: start;
  padding: 0;
  color: var(--text-secondary);
}

.active-invites code {
  border: 1px solid var(--border-color);
  border-radius: 7px;
  padding: 6px 8px;
  background: var(--bg-primary);
}

.activity-list article {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: start;
  border-bottom: 1px solid var(--border-color);
  padding: 8px 2px;
}

.activity-list__dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--info);
}

.activity-list p,
.activity-list small {
  margin: 0;
  color: var(--text-muted);
}

.workspace-page__empty {
  border: 1px dashed var(--border-color);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
}

@media (max-width: 1080px) {
  .workspace-page__grid,
  .workspace-fields {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .workspace-page {
    padding: 10px;
  }

  .workspace-page__hero,
  .workspace-page__stats {
    display: grid;
  }

  .workspace-page__hero {
    padding: 14px;
  }

  .workspace-page__stats {
    grid-template-columns: repeat(3, 1fr);
  }

  .workspace-page__stats article {
    min-width: 0;
  }

  .invite-grid,
  .member-card,
  .calendar-list article,
  .calendar-create {
    grid-template-columns: 1fr;
  }
}
</style>
