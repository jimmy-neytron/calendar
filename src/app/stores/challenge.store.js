import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { DateHelper } from '../utils/date/dateHelper.js'
import { useActivityLog } from '../composables/history/useActivityLog.js'
import { authStore } from './auth.store.js'
import { workspaceStore } from './workspace.store.js'
import { getChallengeProgress } from '../utils/challenges/challengeProgress.ts'

const repository = new SyncedCollectionRepository(`${APP_CONFIG.storageKey}:challenges`, [], 'challenges')
const { addActivity } = useActivityLog()

const challenges = computed(() => repository.items.value
  .filter((challenge) => challenge.workspaceId === workspaceStore.activeWorkspaceId.value && challenge.userId === authStore.currentUserId.value)
  .sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)) || b.updatedAt.localeCompare(a.updatedAt)))

function addChallenge(data) {
  const normalized = normalizeChallenge(data)
  if (!normalized.ok) return normalized
  const userId = authStore.currentUserId.value
  if (!userId) return { ok: false, message: 'Сначала войди в аккаунт' }
  const now = new Date().toISOString()
  const challenge = {
    id: generateId(), workspaceId: workspaceStore.activeWorkspace.value?.id, userId,
    ...normalized.challenge, completedDates: [], active: true, createdAt: now, updatedAt: now,
  }
  repository.create(challenge)
  addActivity('challenge:create', `начал(а) челлендж «${challenge.title}»`, { challengeId: challenge.id, targetDays: challenge.targetDays })
  return { ok: true, challenge }
}

function updateChallenge(id, data) {
  const target = findOwn(id)
  if (!target) return { ok: false, message: 'Челлендж не найден' }
  const normalized = normalizeChallenge(data)
  if (!normalized.ok) return normalized
  const challenge = {
    ...target,
    ...normalized.challenge,
    dailyValues: data.dailyValues && typeof data.dailyValues === 'object' ? data.dailyValues : (target.dailyValues || {}),
    updatedAt: new Date().toISOString(),
  }
  repository.update(id, challenge)
  return { ok: true, challenge }
}

function toggleDate(id, date = DateHelper.toKey(new Date())) {
  const target = findOwn(id)
  if (!target) return { ok: false, message: 'Челлендж не найден' }
  const completedDates = new Set(target.completedDates || [])
  const completed = !completedDates.has(date)
  completed ? completedDates.add(date) : completedDates.delete(date)
  const dailyValues = { ...(target.dailyValues || {}) }
  if (!completed) delete dailyValues[date]
  const challenge = { ...target, completedDates: [...completedDates].sort(), dailyValues, updatedAt: new Date().toISOString() }
  repository.update(id, challenge)
  addActivity(completed ? 'challenge:complete-day' : 'challenge:uncomplete-day', completed ? `выполнил(а) день челленджа «${target.title}»` : `снял(а) выполнение дня челленджа «${target.title}»`, { challengeId: id, date })
  return { ok: true, completed, challenge }
}

function recordResult(id, date, rawValue) {
  const target = findOwn(id)
  if (!target) return { ok: false, message: 'Цель не найдена' }
  const value = Math.max(0, Number(rawValue) || 0)
  if (!value) return { ok: false, message: 'Укажи результат больше нуля' }
  const dailyValues = { ...(target.dailyValues || {}), [date]: value }
  const completedDates = [...new Set([...(target.completedDates || []), date])].sort()
  const challenge = { ...target, dailyValues, completedDates, updatedAt: new Date().toISOString() }
  repository.update(id, challenge)
  addActivity('challenge:record', `записал(а) результат для цели «${target.title}»`, { challengeId: id, date, value, unit: target.unit })
  return { ok: true, challenge, progress: getChallengeProgress(challenge) }
}

function toggleActive(id) {
  const target = findOwn(id)
  if (!target) return { ok: false, message: 'Челлендж не найден' }
  const challenge = { ...target, active: !target.active, updatedAt: new Date().toISOString() }
  repository.update(id, challenge)
  return { ok: true, challenge }
}

async function deleteChallenge(id) {
  const target = findOwn(id)
  if (!target) return { ok: false, message: 'Челлендж не найден' }
  const result = await repository.deleteAndWait(id)
  if (!result.ok) return result
  addActivity('challenge:delete', `удалил(а) челлендж «${target.title}»`, { challengeId: id })
  return { ok: true }
}

function getStreak(challenge, today = new Date()) {
  const dates = new Set(challenge?.completedDates || [])
  let cursor = new Date(today)
  if (!dates.has(DateHelper.toKey(cursor))) cursor = DateHelper.addDays(cursor, -1)
  let streak = 0
  while (dates.has(DateHelper.toKey(cursor))) { streak += 1; cursor = DateHelper.addDays(cursor, -1) }
  return streak
}

function normalizeChallenge(data) {
  const title = String(data.title || '').trim()
  if (!title) return { ok: false, message: 'Укажи название челленджа' }
  const targetDays = Math.min(1000, Math.max(1, Math.round(Number(data.targetDays) || 1)))
  return { ok: true, challenge: {
    title, description: String(data.description || '').trim(), activity: String(data.activity || '').trim() || title,
    targetDays, startDate: data.startDate || DateHelper.toKey(new Date()), color: data.color || '#a78bfa',
    goalType: ['consistency', 'total', 'best'].includes(data.goalType) ? data.goalType : 'consistency',
    targetValue: Math.max(1, Number(data.targetValue) || targetDays),
    startValue: Math.max(0, Number(data.startValue) || 0),
    progressDirection: data.goalType === 'best' && data.progressDirection === 'decrease' ? 'decrease' : 'increase',
    unit: String(data.unit || (data.goalType === 'consistency' ? 'дней' : 'раз')).trim(),
    dailyValues: data.dailyValues && typeof data.dailyValues === 'object' ? data.dailyValues : {},
  } }
}

function findOwn(id) {
  const item = repository.findById(id)
  return item?.userId === authStore.currentUserId.value ? item : null
}

async function loadWorkspace(workspaceId) {
  return repository.loadWorkspace(workspaceId)
}

export const challengeStore = { challenges, addChallenge, updateChallenge, toggleDate, recordResult, toggleActive, deleteChallenge, getStreak, getProgress: getChallengeProgress, loadWorkspace }
