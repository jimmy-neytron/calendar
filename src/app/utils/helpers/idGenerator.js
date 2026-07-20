/**
 * Генерирует уникальный идентификатор, безопасный для использования в браузере.
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Генерирует короткий идентификатор для отображения в интерфейсе.
 * @returns {string}
 */
export function generateShortId() {
  return Math.random().toString(36).slice(2, 8)
}
