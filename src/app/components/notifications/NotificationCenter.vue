<template>
  <section class="notification-center">
    <header class="notification-center__head">
      <div>
        <span>Уведомления</span>
        <strong>{{ notifications.length ? `${unreadCount} непрочит.` : 'Пока пусто' }}</strong>
      </div>
      <div class="notification-center__actions">
        <button type="button" :disabled="!unreadCount" @click="notificationStore.markAllAsRead()">Прочитано</button>
        <button type="button" :disabled="!notifications.length" @click="notificationStore.clearCurrentWorkspaceNotifications()">Очистить</button>
      </div>
    </header>

    <div class="notification-center__list">
      <article
        v-for="notification in notifications"
        :key="notification.id"
        class="notification-item"
        :class="[
          `notification-item--${notification.severity}`,
          { 'notification-item--unread': !notification.readAt }
        ]"
        @click="notificationStore.markAsRead(notification.id)"
      >
        <div class="notification-item__dot" />
        <div class="notification-item__body">
          <div class="notification-item__top">
            <strong>{{ notification.title }}</strong>
            <small>{{ formatNotificationDate(notification.updatedAt) }}</small>
          </div>
          <p>{{ notification.message }}</p>
          <footer>
            <span v-if="notification.updateCount > 1">обновлено {{ notification.updateCount }} раза</span>
            <span v-if="notification.eventDate">{{ formatEventDate(notification.eventDate) }}</span>
          </footer>
        </div>
          <UiIconButton icon="close" label="Удалить уведомление" size="sm" @click.stop="notificationStore.removeNotification(notification.id)" />
      </article>

      <div v-if="!notifications.length" class="notification-empty">
        <span>🔕</span>
        <strong>Нет новых уведомлений</strong>
        <p>Когда кто-то создаст или изменит событие, где ты участник, здесь появится короткая сводка.</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import UiIconButton from '../ui/UiIconButton.vue'
import { computed } from 'vue'
import { notificationStore } from '../../stores/notification.store.js'

const notifications = computed(() => notificationStore.currentUserNotifications.value)
const unreadCount = computed(() => notificationStore.unreadCount.value)

function formatNotificationDate(value) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatEventDate(dateKey) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${dateKey}T12:00:00`))
}
</script>

<style scoped>
.notification-center {
  display: grid;
  gap: 10px;
}

.notification-center__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.notification-center__head span {
  display: block;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.notification-center__head strong {
  font-size: 14px;
}

.notification-center__actions {
  display: flex;
  gap: 6px;
}

.notification-center__actions button,
.notification-item > button {
  min-height: 28px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 0 9px;
  color: var(--text-secondary);
  background: var(--control-bg);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.notification-center__actions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.notification-center__list {
  display: grid;
  gap: 7px;
  max-height: 420px;
  overflow: auto;
  padding-right: 2px;
}

.notification-item {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: start;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 9px;
  background: var(--card-soft);
  cursor: pointer;
  transition: border-color 0.18s var(--ease-out), background 0.18s var(--ease-out), transform 0.18s var(--ease-out);
}

.notification-item:hover {
  border-color: var(--border-strong);
  background: var(--control-bg-hover);
  transform: translateY(-1px);
}

.notification-item--unread {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.notification-item__dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--info);
}

.notification-item--warning .notification-item__dot { background: var(--warning); }
.notification-item--danger .notification-item__dot { background: var(--danger); }

.notification-item__body {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.notification-item__top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.notification-item__top strong {
  font-size: 12px;
}

.notification-item__top small,
.notification-item p,
.notification-item footer {
  color: var(--text-muted);
}

.notification-item p {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
}

.notification-item footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 10px;
  font-weight: 700;
}

.notification-item > button {
  width: 26px;
  padding: 0;
  border-radius: 50%;
}

.notification-empty {
  display: grid;
  place-items: center;
  gap: 6px;
  min-height: 170px;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-lg);
  padding: 18px;
  color: var(--text-muted);
  text-align: center;
  background: var(--card-soft);
}

.notification-empty span {
  font-size: 24px;
}

.notification-empty p {
  max-width: 360px;
  margin: 0;
  font-size: 12px;
}
</style>
