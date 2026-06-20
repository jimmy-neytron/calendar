import { APP_CONFIG } from '../../config/app.config.js'
import { defaultEvents } from '../../utils/seed/sampleData.js'

const STORAGE_PREFIX = `${APP_CONFIG.storageKey}:`
const BACKUP_KEY = `${APP_CONFIG.storageKey}:auto-backup`
const BACKUP_DATE_KEY = `${APP_CONFIG.storageKey}:auto-backup-date`
const DAY_MS = 24 * 60 * 60 * 1000

const DEFAULT_DATA = {
  [`${STORAGE_PREFIX}accounts`]: [
    { id: 'u-anna', name: 'Аня', email: 'anya@example.com', avatar: 'А', color: '#ffffff' },
    { id: 'u-ilya', name: 'Илья', email: 'ilya@example.com', avatar: 'И', color: '#a1a1a1' },
    { id: 'u-miya', name: 'Мия', email: 'miya@example.com', avatar: 'М', color: '#f472b6' },
  ],
  [`${STORAGE_PREFIX}workspaces`]: [
    { id: 'space-family', name: 'Семья', ownerId: 'u-anna', memberIds: ['u-anna', 'u-ilya', 'u-miya'] },
  ],
  [`${STORAGE_PREFIX}workspace-invites`]: [],
  [`${STORAGE_PREFIX}active-workspace`]: 'space-family',
  [`${STORAGE_PREFIX}events`]: defaultEvents.map((event) => ({ ...event, workspaceId: 'space-family' })),
}

export function useAutoBackup() {
  const createAutoBackup = () => {
    const data = { ...DEFAULT_DATA }

    Object.keys(localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX) && key !== BACKUP_KEY && key !== BACKUP_DATE_KEY)
      .forEach((key) => {
        data[key] = JSON.parse(localStorage.getItem(key))
      })

    const payload = {
      version: APP_CONFIG.version,
      type: 'workspace-calendar-backup',
      auto: true,
      exportedAt: new Date().toISOString(),
      data,
    }

    localStorage.setItem(BACKUP_KEY, JSON.stringify(payload))
    localStorage.setItem(BACKUP_DATE_KEY, payload.exportedAt)
    return payload
  }

  const getAutoBackupDate = () => localStorage.getItem(BACKUP_DATE_KEY)

  const runDailyAutoBackup = () => {
    const lastBackupDate = getAutoBackupDate()
    const shouldBackup = !lastBackupDate || Date.now() - new Date(lastBackupDate).getTime() > DAY_MS
    if (shouldBackup) createAutoBackup()
  }

  const restoreAutoBackup = () => {
    const rawBackup = localStorage.getItem(BACKUP_KEY)
    if (!rawBackup) return false
    const backup = JSON.parse(rawBackup)
    Object.entries(backup.data || {}).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)))
    return true
  }

  return {
    createAutoBackup,
    getAutoBackupDate,
    runDailyAutoBackup,
    restoreAutoBackup,
  }
}
