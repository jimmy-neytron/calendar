import { ref } from 'vue'

const notifications = ref([])
const timers = new Map()

export function useNotification() {
  const notify = (message, type = 'info', options = {}) => {
    const id = `${Date.now()}-${Math.random()}`
    const duration = Number(options.duration || 4200)
    notifications.value.push({
      id,
      message: typeof message === 'string' && message.trim() ? message : ({
        danger: 'Не удалось выполнить действие. Попробуй ещё раз.',
        warning: 'Проверь введённые данные и повтори действие.',
        success: 'Действие выполнено.',
        info: 'Действие завершено.',
      })[type] || 'Действие завершено.',
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

  /**
   * Сообщает о результате операции. Тип успешного действия задаётся явно:
   * success — создание/сохранение, info — удаление/снятие отметки.
   * @param {{ ok?: boolean, message?: string, reason?: string }} result
   * @param {string} successMessage
   * @param {{ successType?: 'success' | 'info', errorType?: 'danger' | 'warning', errorMessage?: string }} options
   */
  const notifyResult = (result, successMessage, options = {}) => notify(
    result.ok ? successMessage : result.message || options.errorMessage || 'Не удалось выполнить действие. Попробуй ещё раз.',
    result.ok ? options.successType || 'success' : options.errorType || (result.reason === 'validation' ? 'warning' : 'danger'),
  )

  return {
    notifications,
    notify,
    notifyResult,
    dismiss,
  }
}
