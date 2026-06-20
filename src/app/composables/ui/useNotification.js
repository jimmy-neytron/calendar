import { ref } from 'vue'

const notifications = ref([])

export function useNotification() {
  const notify = (message, type = 'info', options = {}) => {
    const id = `${Date.now()}-${Math.random()}`
    notifications.value.push({
      id,
      message,
      type,
      actionLabel: options.actionLabel || '',
      action: options.action || null,
    })
    setTimeout(() => {
      notifications.value = notifications.value.filter((item) => item.id !== id)
    }, 2600)
  }

  return {
    notifications,
    notify,
    dismiss: (id) => {
      notifications.value = notifications.value.filter((item) => item.id !== id)
    },
  }
}
