import { ref } from 'vue'

const notifications = ref([])
const timers = new Map()

export function useNotification() {
  const notify = (message, type = 'info', options = {}) => {
    const id = `${Date.now()}-${Math.random()}`
    const duration = Number(options.duration || 4200)
    notifications.value.push({
      id,
      message,
      type,
      duration,
      actionLabel: options.actionLabel || '',
      action: options.action || null,
    })
    if (notifications.value.length > 4) dismiss(notifications.value[0].id)
    timers.set(id, setTimeout(() => dismiss(id), duration))
    return id
  }

  const dismiss = (id) => {
    clearTimeout(timers.get(id))
    timers.delete(id)
    notifications.value = notifications.value.filter((item) => item.id !== id)
  }

  return {
    notifications,
    notify,
    dismiss,
  }
}
