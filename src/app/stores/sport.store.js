import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { DateHelper } from '../utils/date/dateHelper.js'
import { authStore } from './auth.store.js'
import { workspaceStore } from './workspace.store.js'

const EXERCISES_KEY = `${APP_CONFIG.storageKey}:sport-exercises`
const COMPLETIONS_KEY = `${APP_CONFIG.storageKey}:sport-completions`

const defaultExercises = [
  createDefaultExercise('sp-mon-warmup', 1, 'Мобилизация + суставная разминка', '1 круг', '8 мин', 'Плавно, без рывков', 1),
  createDefaultExercise('sp-mon-squat', 1, 'Приседания', '3 подхода', '12 повторений', 'Колени смотрят по направлению носков', 2),
  createDefaultExercise('sp-mon-plank', 1, 'Планка', '3 подхода', '30 сек', 'Корпус ровный', 3),
  createDefaultExercise('sp-tue-walk', 2, 'Быстрая ходьба', '1 сессия', '25 мин', 'Темп: можно говорить, но уже с усилием', 1),
  createDefaultExercise('sp-tue-stretch', 2, 'Растяжка спины и ног', '1 круг', '10 мин', '', 2),
  createDefaultExercise('sp-wed-push', 3, 'Отжимания от пола/опоры', '3 подхода', '8–10 повторений', 'Выбери комфортную высоту опоры', 1),
  createDefaultExercise('sp-wed-row', 3, 'Тяга полотенца / резинки', '3 подхода', '12 повторений', 'Своди лопатки', 2),
  createDefaultExercise('sp-thu-core', 4, 'Пресс: dead bug', '3 подхода', '10 на сторону', 'Поясницу не отрывать', 1),
  createDefaultExercise('sp-thu-hips', 4, 'Ягодичный мост', '3 подхода', '15 повторений', '', 2),
  createDefaultExercise('sp-fri-fullbody', 5, 'Круговая тренировка', '4 круга', '12 мин', 'Присед + отжимание + планка + прыжки без перегруза', 1),
  createDefaultExercise('sp-sat-cardio', 6, 'Лёгкое кардио', '1 сессия', '30 мин', 'Велосипед, прогулка или эллипс', 1),
  createDefaultExercise('sp-sun-rest', 0, 'Восстановление', '1 сессия', '15 мин', 'Дыхание, прогулка, растяжка', 1),
]

const exerciseRepository = new SyncedCollectionRepository(EXERCISES_KEY, defaultExercises, 'sport_exercises')
const completionRepository = new SyncedCollectionRepository(COMPLETIONS_KEY, [], 'sport_completions')

const exercises = computed(() => exerciseRepository.items.value.filter((exercise) => exercise.workspaceId === workspaceStore.activeWorkspaceId.value))
const completions = computed(() => completionRepository.items.value.filter((completion) => completion.workspaceId === workspaceStore.activeWorkspaceId.value))

const weekProgram = computed(() => {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    exercises: exercises.value
      .filter((exercise) => exercise.weekday === weekday)
      .sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title)),
  }))
})

const todayKey = computed(() => DateHelper.toKey(new Date()))
const todayExercises = computed(() => getExercisesForDate(todayKey.value))
const todayProgress = computed(() => getDayProgress(todayKey.value))
const weekProgress = computed(() => getWeekProgress(new Date()))

function getExercisesForDate(dateKey) {
  const date = DateHelper.parseKey(dateKey)
  if (Number.isNaN(date.getTime())) return []
  return exercises.value
    .filter((exercise) => exercise.weekday === date.getDay())
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title))
}

function isExerciseDone(exerciseId, dateKey, userId = authStore.currentUserId.value) {
  return completions.value.some((completion) => (
    completion.exerciseId === exerciseId
    && completion.date === dateKey
    && completion.userId === userId
  ))
}

function toggleExercise(exerciseId, dateKey, userId = authStore.currentUserId.value) {
  if (!userId) return { ok: false, message: 'Сначала войди в аккаунт' }
  const existing = completionRepository.items.value.find((completion) => (
    completion.workspaceId === workspaceStore.activeWorkspace.value?.id
    && completion.exerciseId === exerciseId
    && completion.date === dateKey
    && completion.userId === userId
  ))

  if (existing) {
    completionRepository.delete(existing.id)
    return { ok: true, completed: false }
  }

  const completion = {
    id: generateId(),
    workspaceId: workspaceStore.activeWorkspace.value?.id,
    exerciseId,
    date: dateKey,
    userId,
    completedAt: new Date().toISOString(),
  }

  completionRepository.create(completion)
  return { ok: true, completed: true, completion }
}

function addExercise(data) {
  const title = String(data.title || '').trim()
  if (!title) return { ok: false, message: 'Укажи упражнение' }

  const exercise = {
    id: generateId(),
    workspaceId: workspaceStore.activeWorkspace.value?.id,
    weekday: Number(data.weekday ?? new Date().getDay()),
    title,
    sets: String(data.sets || '').trim() || '1 подход',
    reps: String(data.reps || '').trim() || '10 повторений',
    note: String(data.note || '').trim(),
    order: Number(data.order || Date.now()),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  exerciseRepository.create(exercise)
  return { ok: true, exercise }
}

function updateExercise(id, updates) {
  const target = exerciseRepository.findById(id)
  if (!target) return { ok: false, message: 'Упражнение не найдено' }
  const next = {
    ...target,
    ...updates,
    title: updates.title?.trim?.() || target.title,
    weekday: Number(updates.weekday ?? target.weekday),
    updatedAt: new Date().toISOString(),
  }
  exerciseRepository.update(id, next)
  return { ok: true, exercise: next }
}

function deleteExercise(id) {
  exerciseRepository.delete(id)
  completionRepository.items.value = completionRepository.items.value.filter((completion) => completion.exerciseId !== id)
}

function getDayProgress(dateKey) {
  const dayExercises = getExercisesForDate(dateKey)
  const done = dayExercises.filter((exercise) => isExerciseDone(exercise.id, dateKey)).length
  return {
    total: dayExercises.length,
    done,
    percent: dayExercises.length ? Math.round((done / dayExercises.length) * 100) : 0,
  }
}

function getWeekProgress(date = new Date()) {
  const start = DateHelper.addDays(date, -date.getDay())
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = DateHelper.addDays(start, index)
    const key = DateHelper.toKey(day)
    return {
      key,
      weekday: day.getDay(),
      ...getDayProgress(key),
    }
  })
  const total = days.reduce((sum, day) => sum + day.total, 0)
  const done = days.reduce((sum, day) => sum + day.done, 0)
  return {
    days,
    total,
    done,
    percent: total ? Math.round((done / total) * 100) : 0,
  }
}

function addExercisesBulk(rawItems) {
  const parsed = normalizeExercisePayload(rawItems)
  if (!parsed.ok) return parsed

  const created = []
  const errors = []

  parsed.items.forEach((item, index) => {
    const result = addExercise({
      ...item,
      weekday: normalizeWeekday(item.weekday ?? item.day ?? item.weekDay),
      order: item.order || Date.now() + index,
    })

    if (result.ok) {
      created.push(result.exercise)
    } else {
      errors.push(`Строка ${index + 1}: ${result.message}`)
    }
  })

  return {
    ok: created.length > 0,
    created,
    errors,
    message: created.length ? `Добавлено упражнений: ${created.length}` : (errors[0] || 'Не удалось добавить упражнения'),
  }
}

function importExercisesFromJson(jsonText) {
  try {
    return addExercisesBulk(JSON.parse(jsonText))
  } catch (error) {
    return { ok: false, message: 'JSON не удалось прочитать. Проверь формат.' }
  }
}

function normalizeExercisePayload(payload) {
  const items = Array.isArray(payload) ? payload : payload?.exercises
  if (!Array.isArray(items)) {
    return { ok: false, message: 'JSON должен быть массивом упражнений или объектом { "exercises": [...] }' }
  }

  if (!items.length) {
    return { ok: false, message: 'В JSON нет упражнений' }
  }

  return { ok: true, items }
}

function normalizeWeekday(value) {
  if (value === undefined || value === null || value === '') return new Date().getDay()
  if (typeof value === 'number' && value >= 0 && value <= 6) return value

  const normalized = String(value).trim().toLowerCase()
  const map = {
    '0': 0,
    '7': 0,
    'вс': 0,
    'воскресенье': 0,
    sunday: 0,
    sun: 0,
    '1': 1,
    'пн': 1,
    'понедельник': 1,
    monday: 1,
    mon: 1,
    '2': 2,
    'вт': 2,
    'вторник': 2,
    tuesday: 2,
    tue: 2,
    '3': 3,
    'ср': 3,
    'среда': 3,
    wednesday: 3,
    wed: 3,
    '4': 4,
    'чт': 4,
    'четверг': 4,
    thursday: 4,
    thu: 4,
    '5': 5,
    'пт': 5,
    'пятница': 5,
    friday: 5,
    fri: 5,
    '6': 6,
    'сб': 6,
    'суббота': 6,
    saturday: 6,
    sat: 6,
  }

  return map[normalized] ?? new Date().getDay()
}

function createDefaultExercise(id, weekday, title, sets, reps, note, order) {
  return {
    id,
    workspaceId: 'space-family',
    weekday,
    title,
    sets,
    reps,
    note,
    order,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export const sportStore = {
  exercises,
  completions,
  weekProgram,
  todayKey,
  todayExercises,
  todayProgress,
  weekProgress,
  getExercisesForDate,
  getDayProgress,
  getWeekProgress,
  isExerciseDone,
  toggleExercise,
  addExercise,
  updateExercise,
  deleteExercise,
  addExercisesBulk,
  importExercisesFromJson,
  loadWorkspace: (workspaceId) => Promise.all([
    exerciseRepository.loadWorkspace(workspaceId),
    completionRepository.loadWorkspace(workspaceId),
  ]),
}

export { defaultExercises }
