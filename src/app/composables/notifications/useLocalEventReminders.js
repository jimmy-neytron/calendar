import { computed, watch } from 'vue'
import { calendarStore } from '../../stores/calendar.store.js'
import { notificationStore } from '../../stores/notification.store.js'
import { authStore } from '../../stores/auth.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'

const REMINDER_MINUTES = {
  '1h': 60,
  '1d': 1440,
}

export function useLocalEventReminders() {
  let timer = null
  let stopWatcher = null

  const reminderEvents = computed(() => calendarStore.sortedEvents.value
    .filter((event) => shouldTrackReminder(event)))

  function start() {
    if (stopWatcher) return
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    stopWatcher = watch(
      [
        reminderEvents,
        authStore.currentUserId,
        workspaceStore.activeWorkspaceId,
      ],
      () => refresh(),
      { immediate: true, deep: true }
    )
  }

  function stop() {
    window.clearTimeout(timer)
    timer = null
    window.removeEventListener('focus', refresh)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    stopWatcher?.()
    stopWatcher = null
  }

  function refresh() {
    window.clearTimeout(timer)
    timer = null

    const now = new Date()
    reminderEvents.value.forEach((event) => {
      if (isReminderDue(event, now)) notificationStore.notifyEventReminder(event)
    })

    const nextReminderAt = getNextReminderAt(now)
    if (!nextReminderAt) return

    const delay = Math.max(1_000, Math.min(nextReminderAt.getTime() - now.getTime(), 2_147_000_000))
    timer = window.setTimeout(refresh, delay)
  }

  function getNextReminderAt(now) {
    return reminderEvents.value
      .map((event) => getReminderAt(event))
      .filter((reminderAt) => reminderAt && reminderAt > now)
      .sort((first, second) => first - second)[0] || null
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') refresh()
  }

  return { start, stop, refresh }
}

function shouldTrackReminder(event) {
  const userId = authStore.currentUserId.value
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!userId || !workspaceId) return false
  if (!event || event.workspaceId !== workspaceId) return false
  if (event.allDay || !event.date || !event.startTime) return false
  if (!REMINDER_MINUTES[event.reminder]) return false
  if (event.completedAt) return false

  const memberIds = Array.isArray(event.memberIds) ? event.memberIds : []
  return !memberIds.length
    || memberIds.includes(userId)
    || event.responsibleId === userId
}

function isReminderDue(event, now) {
  const startsAt = getStartsAt(event)
  const reminderAt = getReminderAt(event)
  return Boolean(startsAt && reminderAt && reminderAt <= now && startsAt > now)
}

function getStartsAt(event) {
  const startsAt = new Date(`${event.date}T${event.startTime}`)
  return Number.isNaN(startsAt.getTime()) ? null : startsAt
}

function getReminderAt(event) {
  const startsAt = getStartsAt(event)
  const minutes = REMINDER_MINUTES[event.reminder]
  if (!startsAt || !minutes) return null
  return new Date(startsAt.getTime() - minutes * 60_000)
}
