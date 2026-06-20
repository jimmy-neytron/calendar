import { EVENT_CATEGORIES } from '../constants/calendarConstants.js'

/**
 * Finds category metadata.
 * @param {string} value
 * @returns {{ value: string, label: string, color: string }}
 */
export function getCategoryMeta(value) {
  return EVENT_CATEGORIES.find((category) => category.value === value) || EVENT_CATEGORIES.at(-1)
}

/**
 * Gets member names for event.
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
 * Gets the first member color for the event.
 * @param {string[]} memberIds
 * @param {Array<{id: string, color: string}>} members
 * @returns {string}
 */
export function getEventAccent(memberIds, members) {
  const member = members.find((item) => memberIds?.includes(item.id))
  return member?.color || 'var(--accent)'
}
