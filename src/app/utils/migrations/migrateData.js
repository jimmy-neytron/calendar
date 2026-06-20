import { APP_CONFIG } from '../../config/app.config.js'

const STORAGE_PREFIX = `${APP_CONFIG.storageKey}:`

export const migrations = [
  {
    version: '1.2.0',
    up: (payload) => {
      if (!payload?.data) return payload
      const eventsKey = `${STORAGE_PREFIX}events`
      payload.data[eventsKey] = (payload.data[eventsKey] || []).map((event) => ({
        repeat: 'none',
        repeatUntil: '',
        repeatEndType: 'never',
        repeatCount: 0,
        repeatInterval: 1,
        repeatUnit: 'week',
        repeatWeekdays: [],
        importance: 'normal',
        reminder: 'none',
        ...event,
      }))
      const workspaceKey = `${STORAGE_PREFIX}workspaces`
      payload.data[workspaceKey] = (payload.data[workspaceKey] || []).map((workspace) => ({
        ...workspace,
        roles: workspace.roles || Object.fromEntries((workspace.memberIds || []).map((id) => [id, id === workspace.ownerId ? 'owner' : 'member'])),
      }))
      return payload
    },
  },
]

export function migrateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload
  return migrations.reduce((currentPayload, migration) => migration.up(currentPayload), payload)
}
