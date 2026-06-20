import { APP_CONFIG } from '../../config/app.config.js'
import { DateHelper } from '../date/dateHelper.js'
import { validateEvent, validateMember } from './calendarValidator.js'

const STORAGE_PREFIX = `${APP_CONFIG.storageKey}:`
const VALID_BACKUP_TYPES = new Set(['workspace-calendar-backup', 'skylight-calendar-clone-backup'])

export function validateBackupPayload(payload) {
  const errors = []

  if (!payload || typeof payload !== 'object') errors.push('Файл не похож на резервную копию')
  if (!VALID_BACKUP_TYPES.has(payload?.type)) errors.push('Неверный тип резервной копии')
  if (!payload?.data || typeof payload.data !== 'object') errors.push('В файле нет блока data')

  if (!errors.length) {
    errors.push(...validateCalendarData(payload.data))
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function validateCalendarData(data) {
  const errors = []
  const events = data[`${STORAGE_PREFIX}events`] || []
  const accounts = data[`${STORAGE_PREFIX}accounts`] || []
  const workspaces = data[`${STORAGE_PREFIX}workspaces`] || []
  const invites = data[`${STORAGE_PREFIX}workspace-invites`] || []
  const sportExercises = data[`${STORAGE_PREFIX}sport-exercises`] || []
  const sportCompletions = data[`${STORAGE_PREFIX}sport-completions`] || []

  if (!Array.isArray(events)) errors.push('События должны быть массивом')
  if (!Array.isArray(accounts)) errors.push('Аккаунты должны быть массивом')
  if (!Array.isArray(workspaces)) errors.push('Пространства должны быть массивом')
  if (!Array.isArray(invites)) errors.push('Приглашения должны быть массивом')
  if (!Array.isArray(sportExercises)) errors.push('Спорт-программа должна быть массивом')
  if (!Array.isArray(sportCompletions)) errors.push('Спорт-отметки должны быть массивом')

  if (errors.length) return errors

  events.forEach((event, index) => {
    const validation = validateEvent(event)
    if (!event.id) errors.push(`Событие ${index + 1}: нет id`)
    if (!DateHelper.isValidKey(event.date)) errors.push(`Событие ${index + 1}: некорректная дата`)
    Object.values(validation.errors).forEach((message) => errors.push(`Событие ${index + 1}: ${message}`))
  })

  accounts.forEach((account, index) => {
    const validation = validateMember(account)
    if (!account.id) errors.push(`Аккаунт ${index + 1}: нет id`)
    if (!account.email) errors.push(`Аккаунт ${index + 1}: нет email`)
    Object.values(validation.errors).forEach((message) => errors.push(`Аккаунт ${index + 1}: ${message}`))
  })

  workspaces.forEach((workspace, index) => {
    if (!workspace.id) errors.push(`Пространство ${index + 1}: нет id`)
    if (!workspace.name?.trim()) errors.push(`Пространство ${index + 1}: нет названия`)
    if (!Array.isArray(workspace.memberIds)) errors.push(`Пространство ${index + 1}: memberIds должен быть массивом`)
  })

  invites.forEach((invite, index) => {
    if (!invite.id) errors.push(`Приглашение ${index + 1}: нет id`)
    if (!invite.code) errors.push(`Приглашение ${index + 1}: нет кода`)
    if (!invite.workspaceId) errors.push(`Приглашение ${index + 1}: нет workspaceId`)
  })

  sportExercises.forEach((exercise, index) => {
    if (!exercise.id) errors.push(`Упражнение ${index + 1}: нет id`)
    if (!exercise.title?.trim?.()) errors.push(`Упражнение ${index + 1}: нет названия`)
    if (!Number.isInteger(Number(exercise.weekday)) || Number(exercise.weekday) < 0 || Number(exercise.weekday) > 6) {
      errors.push(`Упражнение ${index + 1}: некорректный день недели`)
    }
  })

  sportCompletions.forEach((completion, index) => {
    if (!completion.id) errors.push(`Спорт-отметка ${index + 1}: нет id`)
    if (!completion.exerciseId) errors.push(`Спорт-отметка ${index + 1}: нет exerciseId`)
    if (!DateHelper.isValidKey(completion.date)) errors.push(`Спорт-отметка ${index + 1}: некорректная дата`)
  })

  return errors
}
