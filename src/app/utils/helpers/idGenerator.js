/**
 * Generates a browser-safe unique identifier.
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Generates a short display-friendly id.
 * @returns {string}
 */
export function generateShortId() {
  return Math.random().toString(36).slice(2, 8)
}
