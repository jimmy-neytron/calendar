import { ref } from 'vue'

const notifications = ref([])

export function useNotification() {
  const notify = (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    notifications.value.push({ id, message, type })
    setTimeout(() => {
      notifications.value = notifications.value.filter((item) => item.id !== id)
    }, 2600)
  }

  return {
    notifications,
    notify,
  }
}
