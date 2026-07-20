import { EVENT_CATEGORIES } from '../constants/calendarConstants.js'

/**
 * Находит метаданные категории.
 * @param {string} value
 * @returns {{ value: string, label: string, color: string }}
 */
export function getCategoryMeta(value) {
  return EVENT_CATEGORIES.find((category) => category.value === value) || EVENT_CATEGORIES.at(-1)
}

/**
 * Возвращает имена участников события.
 * @param {string[]} memberIds
 * @param {Array<{id: string, name: string}>} members
 * @returns {string}
 */
export function formatEventMembers(memberIds, members) {
  if (!memberIds?.length) return 'Вся семья'
  return memberIds
    .map((id) => members.find((member) => member.id === id)?.name)
    .filter(Boolean)
    .join(', ')
}

/**
 * Возвращает цвет первого участника события.
 * @param {string[]} memberIds
 * @param {Array<{id: string, color: string}>} members
 * @returns {string}
 */
export function getEventAccent(memberIds, members) {
  const member = members.find((item) => memberIds?.includes(item.id))
  return member?.color || 'var(--accent)'
}

/**
 * Возвращает очищенный заголовок события. В старых бюджетных событиях использовался префикс валюты.
 * @param {{ title?: string, linkedEntityType?: string }} event
 * @returns {string}
 */
export function formatEventTitle(event) {
  const title = String(event?.title || '').trim()
  return event?.linkedEntityType === 'budget-payment'
    ? title.replace(/^₽\s*/, '')
    : title
}
