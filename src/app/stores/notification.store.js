import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { authStore } from './auth.store.js'
import { workspaceStore } from './workspace.store.js'

const STORAGE_KEY = `${APP_CONFIG.storageKey}:notifications`
const MAX_USER_NOTIFICATIONS = 60

const repository = new SyncedCollectionRepository(STORAGE_KEY, [], 'notifications', {
  toRow: (item) => {
    const {
      id, workspaceId, userId, readAt, createdAt, updatedAt, ...payload
    } = item
    return {
      id,
      workspace_id: workspaceId,
      user_id: userId,
      payload,
      read_at: readAt,
      created_at: createdAt,
      updated_at: updatedAt,
    }
  },
  fromRow: (row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    ...(row.payload || {}),
    readAt: row.read_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }),
})
const notifications = repository.items

const currentUserNotifications = computed(() => {
  const userId = authStore.currentUserId.value
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!userId || !workspaceId) return []

  return notifications.value
    .filter((notification) => notification.userId === userId && notification.workspaceId === workspaceId)
    .sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt))
})

const unreadCount = computed(() => currentUserNotifications.value.filter((notification) => !notification.readAt).length)
const unreadImportantCount = computed(() => currentUserNotifications.value.filter((notification) => !notification.readAt && notification.severity !== 'info').length)

function notifyEventChange(action, event, previousEvent = null) {
  const actor = authStore.currentUser.value
  if (!actor || !event?.workspaceId) return

  const recipients = resolveRecipients(event, actor.id)
  if (!recipients.length) return

  const now = new Date().toISOString()
  const title = getEventNotificationTitle(action, event)
  const message = getEventNotificationMessage(action, event, previousEvent, actor)
  const severity = getSeverity(action, event)

  recipients.forEach((userId) => {
    const dedupeKey = `${event.workspaceId}:${userId}:event:${event.id}`
    const existing = notifications.value.find((notification) => notification.dedupeKey === dedupeKey)
    const payload = {
      id: existing?.id || generateId(),
      dedupeKey,
      userId,
      workspaceId: event.workspaceId,
      actorId: actor.id,
      actorName: actor.name,
      eventId: event.id,
      eventDate: event.date,
      eventTitle: event.title,
      title,
      message,
      type: 'event',
      action,
      severity,
      readAt: null,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      updateCount: existing ? Number(existing.updateCount || 1) + 1 : 1,
    }
    if (existing) repository.update(existing.id, payload)
    else repository.create(payload)
  })
}

function resolveRecipients(event, actorId) {
  const workspaceMembers = workspaceStore.activeWorkspaceMembers.value.map((member) => member.id)
  const rawRecipients = Array.isArray(event.memberIds) && event.memberIds.length
    ? event.memberIds
    : workspaceMembers

  return [...new Set(rawRecipients)]
    .filter((userId) => userId && userId !== actorId && workspaceMembers.includes(userId))
}

function getEventNotificationTitle(action, event) {
  if (action === 'create') return 'Новое событие для тебя'
  if (action === 'move') return 'Событие перенесли'
  if (action === 'delete') return 'Событие удалили'
  return 'Событие обновили'
}

function getEventNotificationMessage(action, event, previousEvent, actor) {
  const eventName = `«${event.title || previousEvent?.title || 'Без названия'}»`
  if (action === 'create') return `${actor.name} добавил(а) событие ${eventName} на ${formatDate(event.date)}${formatTimeRange(event)}.`
  if (action === 'delete') return `${actor.name} удалил(а) событие ${eventName}.`
  if (action === 'move') return `${actor.name} перенёс(ла) ${eventName} на ${formatDate(event.date)}${formatTimeRange(event)}.`

  const diff = describeEventDiff(previousEvent, event)
  return `${actor.name} изменил(а) ${eventName}${diff ? `: ${diff}` : '.'}`
}

function describeEventDiff(previousEvent, event) {
  if (!previousEvent) return ''

  const changes = []
  if (previousEvent.title !== event.title) changes.push('название')
  if (previousEvent.date !== event.date) changes.push(`дату на ${formatDate(event.date)}`)
  if (previousEvent.startTime !== event.startTime || previousEvent.endTime !== event.endTime) changes.push(`время${formatTimeRange(event)}`)
  if (previousEvent.location !== event.location && event.location) changes.push(`место: ${event.location}`)
  if (previousEvent.importance !== event.importance) changes.push(`важность: ${importanceLabel(event.importance)}`)
  if (previousEvent.notes !== event.notes) changes.push('заметки')

  if (!changes.length) return 'обновлены детали.'
  return `${changes.slice(0, 3).join(', ')}${changes.length > 3 ? ' и ещё' : ''}.`
}

function getSeverity(action, event) {
  if (action === 'delete') return 'warning'
  if (event.importance === 'urgent') return 'danger'
  if (event.importance === 'important') return 'warning'
  return 'info'
}

function markAsRead(id) {
  const now = new Date().toISOString()
  const notification = repository.findById(id)
  if (notification) repository.update(id, { readAt: notification.readAt || now })
}

function markAllAsRead() {
  const userId = authStore.currentUserId.value
  const workspaceId = workspaceStore.activeWorkspaceId.value
  const now = new Date().toISOString()
  notifications.value
    .filter((notification) => notification.userId === userId && notification.workspaceId === workspaceId)
    .forEach((notification) => repository.update(notification.id, { readAt: notification.readAt || now }))
}

function removeNotification(id) {
  repository.delete(id)
}

function clearCurrentWorkspaceNotifications() {
  const userId = authStore.currentUserId.value
  const workspaceId = workspaceStore.activeWorkspaceId.value
  notifications.value
    .filter((notification) => notification.userId === userId && notification.workspaceId === workspaceId)
    .forEach((notification) => repository.delete(notification.id))
}

function formatDate(dateKey) {
  if (!dateKey) return 'день без даты'
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${dateKey}T12:00:00`))
}

function formatTimeRange(event) {
  if (event.allDay) return ', весь день'
  if (!event.startTime) return ''
  return ` в ${event.startTime}${event.endTime ? `–${event.endTime}` : ''}`
}

function importanceLabel(value) {
  return {
    normal: 'обычная',
    important: 'важная',
    urgent: 'срочная',
  }[value] || 'обычная'
}

export const notificationStore = {
  notifications,
  currentUserNotifications,
  unreadCount,
  unreadImportantCount,
  notifyEventChange,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearCurrentWorkspaceNotifications,
  loadWorkspace: (workspaceId) => repository.loadWorkspace(workspaceId),
}
