import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { useLocalStorage } from '../composables/storage/useLocalStorage.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { authStore } from './auth.store.js'
import { workspaceStore } from './workspace.store.js'

const STORAGE_KEY = `${APP_CONFIG.storageKey}:notifications`
const CLEARED_AT_KEY = `${APP_CONFIG.storageKey}:notifications-cleared-at`
const DISMISSED_DEDUPE_KEY = `${APP_CONFIG.storageKey}:notifications-dismissed-dedupe-keys`
const MAX_USER_NOTIFICATIONS = 60
const NOTIFICATION_TTL_DAYS = 30
const ALLOWED_NOTIFICATION_TYPES = new Set(['event_reminder', 'event_comment'])
const { state: clearedAtByScope } = useLocalStorage(CLEARED_AT_KEY, {})
const { state: dismissedDedupeKeys } = useLocalStorage(DISMISSED_DEDUPE_KEY, {})

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

  const clearedAt = clearedAtByScope.value[notificationScope(userId, workspaceId)] || ''
  return notifications.value
    .filter((notification) => (
      notification.userId === userId
      && notification.workspaceId === workspaceId
      && isAllowedNotification(notification)
      && (!clearedAt || notification.updatedAt > clearedAt)
    ))
    .sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt))
})

const unreadCount = computed(() => currentUserNotifications.value.filter((notification) => !notification.readAt).length)
const unreadImportantCount = computed(() => currentUserNotifications.value.filter((notification) => !notification.readAt && notification.severity !== 'info').length)

function notifyEventChange(action, event, previousEvent = null) {
  return null
}

function notifyEventReminder(event) {
  const userId = authStore.currentUserId.value
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!userId || !workspaceId || !event?.id || !event?.date) return null

  const eventId = String(event.parentId || event.id).split('::')[0]
  const eventDate = event.date
  const eventTime = event.startTime || ''
  const reminder = event.reminder || 'none'
  const dedupeKey = `${workspaceId}:${userId}:event-reminder:${eventId}:${eventDate}:${eventTime}:${reminder}`
  if (isDedupeKeyDismissed(dedupeKey)) return null
  const existing = notifications.value.find((notification) => notification.dedupeKey === dedupeKey)
  if (existing) return existing

  const now = new Date().toISOString()
  const payload = {
    id: generateId(),
    dedupeKey,
    userId,
    workspaceId,
    eventId,
    eventDate,
    eventTime,
    eventTitle: event.title,
    title: 'Скоро событие',
    message: getEventReminderMessage(event),
    type: 'event_reminder',
    action: 'reminder',
    severity: getSeverity('update', event),
    readAt: null,
    createdAt: now,
    updatedAt: now,
    updateCount: 1,
  }
  repository.create(payload)
  cleanupStoredNotifications(workspaceId)
  trimUserNotifications(userId, workspaceId)
  return payload
}

function notifyEventComment(event, comment) {
  const actor = authStore.currentUser.value
  const actorId = comment?.userId || actor?.id
  if (!actorId || !event?.workspaceId || !comment?.id) return

  const recipients = resolveRecipients(event, actorId)
  if (!recipients.length) return

  const now = new Date().toISOString()
  const eventId = String(event.parentId || event.id).split('::')[0]
  const actorName = comment.userName || actor?.name || 'Пользователь'
  const message = String(comment.text || '').trim()

  recipients.forEach((userId) => {
    const dedupeKey = `${event.workspaceId}:${userId}:event-comment:${eventId}:${comment.id}`
    const existing = notifications.value.find((notification) => notification.dedupeKey === dedupeKey)
    if (existing) return

    repository.create({
      id: generateId(),
      dedupeKey,
      userId,
      workspaceId: event.workspaceId,
      actorId,
      actorName,
      eventId,
      eventDate: event.date,
      eventTitle: event.title,
      commentId: comment.id,
      title: `Новое сообщение в «${event.title || 'событии'}»`,
      message: `${actorName}: ${message}`,
      type: 'event_comment',
      action: 'comment',
      severity: 'info',
      readAt: null,
      createdAt: now,
      updatedAt: now,
      updateCount: 1,
    })
    cleanupStoredNotifications(event.workspaceId)
    trimUserNotifications(userId, event.workspaceId)
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

function getEventReminderMessage(event) {
  const title = event.title || 'Без названия'
  const date = formatDate(event.date)
  const time = event.allDay ? 'весь день' : event.startTime || 'без времени'
  const location = event.location ? ` · ${event.location}` : ''
  return `«${title}» — ${date}, ${time}${location}.`
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
    .filter((notification) => notification.userId === userId && notification.workspaceId === workspaceId && isAllowedNotification(notification))
    .forEach((notification) => repository.update(notification.id, { readAt: notification.readAt || now }))
}

function removeNotification(id) {
  dismissNotification(id)
}

function dismissNotification(id) {
  const notification = repository.findById(id)
  if (notification?.dedupeKey) rememberDismissedDedupeKey(notification.dedupeKey)
  repository.delete(id)
}

function clearCurrentWorkspaceNotifications() {
  const userId = authStore.currentUserId.value
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!userId || !workspaceId) return
  const now = new Date().toISOString()
  const currentNotifications = notifications.value
    .filter((notification) => notification.userId === userId && notification.workspaceId === workspaceId)

  currentNotifications.forEach((notification) => {
    if (notification.dedupeKey) rememberDismissedDedupeKey(notification.dedupeKey)
  })
  clearedAtByScope.value = {
    ...clearedAtByScope.value,
    [notificationScope(userId, workspaceId)]: now,
  }
  currentNotifications.forEach((notification) => repository.delete(notification.id))
}

function rememberDismissedDedupeKey(dedupeKey) {
  if (!dedupeKey) return
  const now = new Date().toISOString()
  dismissedDedupeKeys.value = trimDismissedDedupeKeys({
    ...dismissedDedupeKeys.value,
    [dedupeKey]: now,
  })
}

function isDedupeKeyDismissed(dedupeKey) {
  return Boolean(dedupeKey && dismissedDedupeKeys.value[dedupeKey])
}

function trimDismissedDedupeKeys(items) {
  const entries = Object.entries(items || {})
    .sort((first, second) => new Date(second[1]) - new Date(first[1]))
    .slice(0, 500)
  return Object.fromEntries(entries)
}

function trimUserNotifications(userId, workspaceId) {
  const userNotifications = notifications.value
    .filter((notification) => notification.userId === userId && notification.workspaceId === workspaceId && isAllowedNotification(notification))
    .sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt))

  userNotifications
    .slice(MAX_USER_NOTIFICATIONS)
    .forEach((notification) => repository.delete(notification.id))
}

function ingestRemoteRow(row) {
  if (!row?.id) return null
  const notification = repository.fromRow(row)
  if (!isAllowedNotification(notification) || isExpiredNotification(notification)) {
    repository.delete(notification.id)
    return null
  }
  repository.mergeById([notification])
  return notification
}

async function loadWorkspace(workspaceId) {
  const result = await repository.loadWorkspace(workspaceId)
  cleanupStoredNotifications(workspaceId)
  return result
}

function cleanupStoredNotifications(workspaceId = workspaceStore.activeWorkspaceId.value) {
  if (!workspaceId) return
  notifications.value
    .filter((notification) => notification.workspaceId === workspaceId)
    .filter((notification) => !isAllowedNotification(notification) || isExpiredNotification(notification))
    .forEach((notification) => {
      if (notification.dedupeKey) rememberDismissedDedupeKey(notification.dedupeKey)
      repository.delete(notification.id)
    })
}

function isAllowedNotification(notification) {
  return ALLOWED_NOTIFICATION_TYPES.has(notification?.type)
}

function isExpiredNotification(notification) {
  const sourceDate = notification?.updatedAt || notification?.createdAt
  if (!sourceDate) return false
  const time = new Date(sourceDate).getTime()
  if (Number.isNaN(time)) return false
  return Date.now() - time > NOTIFICATION_TTL_DAYS * 24 * 60 * 60 * 1000
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

function notificationScope(userId, workspaceId) {
  return `${userId}:${workspaceId}`
}

export const notificationStore = {
  notifications,
  currentUserNotifications,
  unreadCount,
  unreadImportantCount,
  notifyEventChange,
  notifyEventReminder,
  notifyEventComment,
  markAsRead,
  markAllAsRead,
  removeNotification,
  dismissNotification,
  clearCurrentWorkspaceNotifications,
  ingestRemoteRow,
  loadWorkspace,
}
