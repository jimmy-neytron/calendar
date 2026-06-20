import { APP_CONFIG } from '../../config/app.config.js'
import { validateBackupPayload } from '../../utils/validators/dataValidator.js'
import { migrateBackupPayload } from '../../utils/migrations/migrateData.js'
import { defaultEvents } from '../../utils/seed/sampleData.js'
import { defaultExercises } from '../../stores/sport.store.js'

const STORAGE_PREFIX = `${APP_CONFIG.storageKey}:`
const AUTO_BACKUP_KEYS = new Set([
  `${APP_CONFIG.storageKey}:auto-backup`,
  `${APP_CONFIG.storageKey}:auto-backup-date`,
])

const DEFAULT_DATA = {
  [`${STORAGE_PREFIX}accounts`]: [
    { id: 'u-anna', name: 'Аня', email: 'anya@example.com', avatar: 'А', color: '#ffffff' },
    { id: 'u-ilya', name: 'Илья', email: 'ilya@example.com', avatar: 'И', color: '#a1a1a1' },
    { id: 'u-miya', name: 'Мия', email: 'miya@example.com', avatar: 'М', color: '#f472b6' },
  ],
  [`${STORAGE_PREFIX}workspaces`]: [
    { id: 'space-family', name: 'Семья', ownerId: 'u-anna', memberIds: ['u-anna', 'u-ilya', 'u-miya'], roles: { 'u-anna': 'owner', 'u-ilya': 'admin', 'u-miya': 'member' } },
  ],
  [`${STORAGE_PREFIX}workspace-invites`]: [],
  [`${STORAGE_PREFIX}active-workspace`]: 'space-family',
  [`${STORAGE_PREFIX}events`]: defaultEvents.map((event) => ({ ...event, workspaceId: 'space-family', importance: event.importance || 'normal', reminder: event.reminder || 'none' })),
  [`${STORAGE_PREFIX}preferences`]: { defaultMode: 'month', weekStartsOn: 1, density: 'compact', theme: 'black', hidePastEvents: false },
  [`${STORAGE_PREFIX}activity`]: [],
  [`${STORAGE_PREFIX}notifications`]: [],
  [`${STORAGE_PREFIX}sport-exercises`]: defaultExercises,
  [`${STORAGE_PREFIX}sport-completions`]: [],
}

export function useAppBackup() {
  const collectData = () => {
    const data = { ...DEFAULT_DATA }

    Object.keys(localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX) && !AUTO_BACKUP_KEYS.has(key))
      .forEach((key) => {
        data[key] = JSON.parse(localStorage.getItem(key))
      })

    return data
  }

  const exportAll = () => {
    const payload = {
      version: APP_CONFIG.version,
      type: 'workspace-calendar-backup',
      exportedAt: new Date().toISOString(),
      data: collectData(),
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workspace-calendar-backup-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importAll = async (file, mode = 'replace') => {
    const text = await file.text()
    let payload

    try {
      payload = JSON.parse(text)
    } catch (error) {
      throw new Error('Файл не является корректным JSON')
    }

    payload = migrateBackupPayload(payload)
    const validation = validateBackupPayload(payload)
    if (!validation.valid) {
      throw new Error(validation.errors.slice(0, 5).join('; '))
    }

    if (mode === 'replace') {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(STORAGE_PREFIX) && !AUTO_BACKUP_KEYS.has(key))
        .forEach((key) => localStorage.removeItem(key))
    }

    Object.entries(payload.data).forEach(([key, value]) => {
      const currentValue = JSON.parse(localStorage.getItem(key) || 'null')
      const nextValue = mode === 'merge' ? mergeValue(currentValue, value) : value
      localStorage.setItem(key, JSON.stringify(nextValue))
    })

    window.location.reload()
  }

  const clearAll = () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX) && !AUTO_BACKUP_KEYS.has(key))
      .forEach((key) => localStorage.removeItem(key))

    window.location.reload()
  }

  return {
    exportAll,
    importAll,
    clearAll,
    collectData,
  }
}

function mergeValue(currentValue, importedValue) {
  if (!Array.isArray(currentValue) || !Array.isArray(importedValue)) return importedValue

  const map = new Map(currentValue.map((item) => [item.id, item]))
  importedValue.forEach((item) => {
    if (!item?.id) return
    map.set(item.id, { ...map.get(item.id), ...item })
  })

  return [...map.values()]
}
