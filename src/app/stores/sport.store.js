import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { DateHelper } from '../utils/date/dateHelper.js'
import { authStore } from './auth.store.js'
import { workspaceStore } from './workspace.store.js'
import { useActivityLog } from '../composables/history/useActivityLog.js'

const EXERCISES_KEY = `${APP_CONFIG.storageKey}:sport-exercises`
const COMPLETIONS_KEY = `${APP_CONFIG.storageKey}:sport-completions`
const WORKOUTS_KEY = `${APP_CONFIG.storageKey}:sport-workouts`

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
const workoutRepository = new SyncedCollectionRepository(WORKOUTS_KEY, [], 'sport_workouts')
const { addActivity } = useActivityLog()

const exercises = computed(() => exerciseRepository.items.value.filter((exercise) => (
  exercise.workspaceId === workspaceStore.activeWorkspaceId.value
  && exercise.userId === authStore.currentUserId.value
)))
const completions = computed(() => completionRepository.items.value.filter((completion) => (
  completion.workspaceId === workspaceStore.activeWorkspaceId.value
  && completion.userId === authStore.currentUserId.value
)))
const customWorkouts = computed(() => workoutRepository.items.value.filter((workout) => (
  workout.workspaceId === workspaceStore.activeWorkspaceId.value
  && workout.userId === authStore.currentUserId.value
)))

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
    const exercise = exerciseRepository.findById(exerciseId)
    addActivity('sport:uncomplete', `снял(а) отметку с упражнения «${exercise?.title || 'Упражнение'}»`, {
      exerciseId,
      date: dateKey,
    })
    return { ok: true, completed: false }
  }

  const exercise = exerciseRepository.findById(exerciseId)
  const completion = {
    id: generateId(),
    workspaceId: workspaceStore.activeWorkspace.value?.id,
    exerciseId,
    date: dateKey,
    userId,
    completedAt: new Date().toISOString(),
    exerciseTitle: exercise?.title || '',
    exerciseSets: exercise?.sets || '',
    exerciseReps: exercise?.reps || '',
    exerciseMuscleGroups: exercise?.muscleGroups || [],
    workoutName: exercise?.workoutName || '',
    durationMinutes: exercise?.durationMinutes ?? null,
  }

  completionRepository.create(completion)
  addActivity('sport:complete', `выполнил(а) упражнение «${exercise?.title || 'Упражнение'}»`, {
    exerciseId,
    date: dateKey,
  })
  return { ok: true, completed: true, completion }
}

function addExercise(data) {
  const title = String(data.title || '').trim()
  if (!title) return { ok: false, message: 'Укажи упражнение' }
  const userId = authStore.currentUserId.value
  if (!userId) return { ok: false, message: 'Сначала войди в аккаунт' }

  const exercise = {
    id: generateId(),
    workspaceId: workspaceStore.activeWorkspace.value?.id,
    userId,
    weekday: Number(data.weekday ?? new Date().getDay()),
    title,
    sets: String(data.sets || '').trim() || '1 подход',
    reps: String(data.reps || '').trim() || '10 повторений',
    note: String(data.note || '').trim(),
    muscleGroups: normalizeStringList(data.muscleGroups),
    exerciseType: normalizeText(data.exerciseType),
    difficulty: normalizeText(data.difficulty),
    equipment: normalizeText(data.equipment),
    durationMinutes: normalizeOptionalInteger(data.durationMinutes, 1, 300),
    restSeconds: normalizeOptionalInteger(data.restSeconds, 0, 3600),
    tempo: normalizeText(data.tempo),
    instructions: normalizeText(data.instructions),
    commonMistakes: normalizeText(data.commonMistakes),
    easierVariant: normalizeText(data.easierVariant),
    harderVariant: normalizeText(data.harderVariant),
    workoutId: normalizeText(data.workoutId),
    workoutName: normalizeText(data.workoutName),
    workoutFocus: normalizeStringList(data.workoutFocus),
    workoutColor: normalizeText(data.workoutColor),
    order: Number(data.order || Date.now()),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  exerciseRepository.create(exercise)
  if (!data.__skipActivity) {
    addActivity('sport:create', `добавил(а) упражнение «${exercise.title}»`, {
      exerciseId: exercise.id,
      weekday: exercise.weekday,
    })
  }
  return { ok: true, exercise }
}

function updateExercise(id, updates, options = {}) {
  const target = exerciseRepository.findById(id)
  if (!target || target.userId !== authStore.currentUserId.value) return { ok: false, message: 'Упражнение не найдено' }
  const next = {
    ...target,
    ...updates,
    title: updates.title?.trim?.() || target.title,
    weekday: Number(updates.weekday ?? target.weekday),
    sets: updates.sets === undefined ? target.sets : normalizeText(updates.sets),
    reps: updates.reps === undefined ? target.reps : normalizeText(updates.reps),
    note: updates.note === undefined ? target.note : normalizeText(updates.note),
    muscleGroups: updates.muscleGroups === undefined ? (target.muscleGroups || []) : normalizeStringList(updates.muscleGroups),
    exerciseType: updates.exerciseType === undefined ? (target.exerciseType || '') : normalizeText(updates.exerciseType),
    difficulty: updates.difficulty === undefined ? (target.difficulty || '') : normalizeText(updates.difficulty),
    equipment: updates.equipment === undefined ? (target.equipment || '') : normalizeText(updates.equipment),
    durationMinutes: updates.durationMinutes === undefined ? (target.durationMinutes ?? null) : normalizeOptionalInteger(updates.durationMinutes, 1, 300),
    restSeconds: updates.restSeconds === undefined ? (target.restSeconds ?? null) : normalizeOptionalInteger(updates.restSeconds, 0, 3600),
    tempo: updates.tempo === undefined ? (target.tempo || '') : normalizeText(updates.tempo),
    instructions: updates.instructions === undefined ? (target.instructions || '') : normalizeText(updates.instructions),
    commonMistakes: updates.commonMistakes === undefined ? (target.commonMistakes || '') : normalizeText(updates.commonMistakes),
    easierVariant: updates.easierVariant === undefined ? (target.easierVariant || '') : normalizeText(updates.easierVariant),
    harderVariant: updates.harderVariant === undefined ? (target.harderVariant || '') : normalizeText(updates.harderVariant),
    workoutId: updates.workoutId === undefined ? (target.workoutId || '') : normalizeText(updates.workoutId),
    workoutName: updates.workoutName === undefined ? (target.workoutName || '') : normalizeText(updates.workoutName),
    workoutFocus: updates.workoutFocus === undefined ? (target.workoutFocus || []) : normalizeStringList(updates.workoutFocus),
    workoutColor: updates.workoutColor === undefined ? (target.workoutColor || '') : normalizeText(updates.workoutColor),
    updatedAt: new Date().toISOString(),
  }
  exerciseRepository.update(id, next)
  if (!options.skipActivity) {
    addActivity('sport:update', `обновил(а) упражнение «${next.title}»`, {
      exerciseId: id,
      weekday: next.weekday,
    })
  }
  return { ok: true, exercise: next }
}

function deleteExercise(id, options = {}) {
  const target = exerciseRepository.findById(id)
  if (!target || target.userId !== authStore.currentUserId.value) return false
  completionRepository.items.value
    .filter((completion) => (
      completion.exerciseId === id
      && completion.userId === authStore.currentUserId.value
    ))
    .forEach((completion) => completionRepository.update(completion.id, {
      ...completion,
      exerciseId: null,
      exerciseTitle: completion.exerciseTitle || target.title || '',
      exerciseSets: completion.exerciseSets || target.sets || '',
      exerciseReps: completion.exerciseReps || target.reps || '',
      exerciseMuscleGroups: completion.exerciseMuscleGroups?.length ? completion.exerciseMuscleGroups : (target.muscleGroups || []),
      workoutName: completion.workoutName || target.workoutName || '',
      durationMinutes: completion.durationMinutes ?? target.durationMinutes ?? null,
    }))
  exerciseRepository.delete(id)
  if (!options.skipActivity) {
    addActivity('sport:delete', `удалил(а) упражнение «${target.title}»`, { exerciseId: id })
  }
  return true
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
      __skipActivity: true,
    })

    if (result.ok) {
      created.push(result.exercise)
    } else {
      errors.push(`Строка ${index + 1}: ${result.message}`)
    }
  })

  if (created.length) addActivity('sport:import', `импортировал(а) ${created.length} упражнений`, {
    exerciseIds: created.map((exercise) => exercise.id),
  })

  return {
    ok: created.length > 0,
    created,
    errors,
    message: created.length ? `Добавлено упражнений: ${created.length}` : (errors[0] || 'Не удалось добавить упражнения'),
  }
}

function addWorkout(workout, weekdays) {
  const workoutId = `${normalizeText(workout.id) || generateId()}-${generateId()}`
  const scheduledDays = normalizeWorkoutWeekdays({ weekdays })
  return addExercisesBulk(scheduledDays.flatMap((weekday) => (
    (workout.exercises || []).map((exercise, index) => ({
      ...exercise,
      weekday,
      workoutId,
      workoutName: workout.title,
      workoutFocus: workout.focus,
      workoutColor: workout.color,
      order: Date.now() + index,
    }))
  )))
}

function createWorkout(data) {
  const normalized = normalizeWorkout(data)
  if (!normalized.ok) return normalized
  const userId = authStore.currentUserId.value
  if (!userId) return { ok: false, message: 'Сначала войди в аккаунт' }

  const templateId = generateId()
  const workoutId = `${templateId}-${generateId()}`
  const now = new Date().toISOString()
  const template = {
    id: templateId,
    workspaceId: workspaceStore.activeWorkspace.value?.id,
    userId,
    title: normalized.workout.name,
    subtitle: 'Моя тренировка',
    focus: normalized.workout.focus,
    color: normalized.workout.color,
    exercises: normalized.workout.exercises.map(({ id, ...exercise }) => exercise),
    createdAt: now,
    updatedAt: now,
  }
  workoutRepository.create(template)
  const created = normalized.workout.weekdays.flatMap((weekday) => (
    normalized.workout.exercises.map((exercise, index) => addExercise({
      ...exercise,
      weekday,
      workoutId,
      workoutName: normalized.workout.name,
      workoutFocus: normalized.workout.focus,
      workoutColor: normalized.workout.color,
      order: Date.now() + index,
      __skipActivity: true,
    })).filter((result) => result.ok).map((result) => result.exercise)
  ))

  const expectedCount = normalized.workout.exercises.length * normalized.workout.weekdays.length
  if (created.length !== expectedCount) {
    created.forEach((exercise) => deleteExercise(exercise.id, { skipActivity: true }))
    workoutRepository.delete(templateId)
    return { ok: false, message: 'Не удалось создать все упражнения тренировки' }
  }

  addActivity('sport:create-workout', `создал(а) тренировку «${normalized.workout.name}»`, {
    workoutId,
    weekdays: normalized.workout.weekdays,
    exerciseIds: created.map((exercise) => exercise.id),
  })
  return { ok: true, workoutId, template, exercises: created }
}

function deleteWorkoutTemplate(id) {
  const target = workoutRepository.findById(id)
  if (!target || target.userId !== authStore.currentUserId.value) return { ok: false, message: 'Шаблон тренировки не найден' }
  workoutRepository.delete(id)
  addActivity('sport:delete-workout-template', `удалил(а) шаблон тренировки «${target.title}»`, { workoutTemplateId: id })
  return { ok: true }
}

function updateWorkout(workoutId, data) {
  const normalized = normalizeWorkout(data)
  if (!normalized.ok) return normalized

  const current = getWorkoutExercises(workoutId, data.originalWeekday ?? normalized.workout.weekdays[0])
  if (!current.length) return { ok: false, message: 'Тренировка не найдена' }

  const savedIds = new Set()
  const saved = []

  normalized.workout.weekdays.forEach((weekday) => {
    const currentForDay = current
      .filter((exercise) => exercise.weekday === weekday)
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    normalized.workout.exercises.forEach((exercise, index) => {
      const { id: sourceExerciseId, ...exerciseDetails } = exercise
      const common = {
        ...exerciseDetails,
        weekday,
        workoutId,
        workoutName: normalized.workout.name,
        workoutFocus: normalized.workout.focus,
        workoutColor: normalized.workout.color,
        order: Date.now() + index,
      }
      const existing = currentForDay.find((item) => item.id === sourceExerciseId) || currentForDay[index]
      if (existing) {
        const result = updateExercise(existing.id, common, { skipActivity: true })
        if (result.ok) {
          savedIds.add(existing.id)
          saved.push(result.exercise)
        }
        return
      }
      const result = addExercise({ ...common, __skipActivity: true })
      if (result.ok) saved.push(result.exercise)
    })
  })

  current.filter((exercise) => !savedIds.has(exercise.id)).forEach((exercise) => {
    deleteExercise(exercise.id, { skipActivity: true })
  })
  addActivity('sport:update-workout', `обновил(а) тренировку «${normalized.workout.name}»`, {
    workoutId,
    weekdays: normalized.workout.weekdays,
    exerciseIds: saved.map((exercise) => exercise.id),
  })
  return { ok: true, workoutId, exercises: saved }
}

function deleteWorkout(workoutId, weekday) {
  const targets = getWorkoutExercises(workoutId, weekday)
  if (!targets.length) return { ok: false, message: 'Тренировка не найдена' }
  const workoutName = targets[0].workoutName || 'Моя тренировка'
  targets.forEach((exercise) => deleteExercise(exercise.id, { skipActivity: true }))
  addActivity('sport:delete-workout', `удалил(а) тренировку «${workoutName}»`, {
    workoutId,
    weekday,
    exerciseIds: targets.map((exercise) => exercise.id),
  })
  return { ok: true, deleted: targets.length }
}

function getWorkoutExercises(workoutId, weekday) {
  return exercises.value.filter((exercise) => (
    exercise.workoutId === workoutId
    || (!exercise.workoutId && workoutId === `personal-${weekday}` && exercise.weekday === weekday)
  ))
}

function normalizeWorkout(data) {
  const name = normalizeText(data.name || data.title)
  if (!name) return { ok: false, message: 'Укажи название тренировки' }
  const rawExercises = Array.isArray(data.exercises) ? data.exercises : []
  const workoutExercises = rawExercises.map((exercise) => ({
    ...exercise,
    title: normalizeText(exercise.title),
    sets: normalizeText(exercise.sets) || '1 подход',
    reps: normalizeText(exercise.reps) || '10 повторений',
    note: normalizeText(exercise.note),
    muscleGroups: normalizeStringList(exercise.muscleGroups),
    durationMinutes: normalizeOptionalInteger(exercise.durationMinutes, 1, 300),
  })).filter((exercise) => exercise.title)
  if (!workoutExercises.length) return { ok: false, message: 'Добавь хотя бы одно упражнение' }
  if (workoutExercises.length !== rawExercises.length) return { ok: false, message: 'Укажи название каждого упражнения' }
  const weekdays = normalizeWorkoutWeekdays(data)
  if (!weekdays.length) return { ok: false, message: 'Выбери хотя бы один день недели' }

  return {
    ok: true,
    workout: {
      name,
      weekdays,
      focus: normalizeStringList(data.focus),
      color: normalizeText(data.color) || '#6ee7b7',
      exercises: workoutExercises,
    },
  }
}

function normalizeWorkoutWeekdays(data) {
  const values = Array.isArray(data.weekdays)
    ? data.weekdays
    : [data.weekdays ?? data.weekday]
  return [...new Set(values
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map((value) => normalizeWeekday(value)))]
}

function replaceWeeklyProgram(rawItems) {
  const parsed = normalizeExercisePayload(rawItems)
  if (!parsed.ok) return parsed

  const currentIds = exercises.value.map((exercise) => exercise.id)
  currentIds.forEach((id) => deleteExercise(id, { skipActivity: true }))
  const result = addExercisesBulk(parsed.items)

  if (result.ok) {
    addActivity('sport:replace-program', `обновил(а) недельную программу: ${result.created.length} упражнений`, {
      exerciseIds: result.created.map((exercise) => exercise.id),
    })
  }

  return result
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

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeStringList(value) {
  const items = Array.isArray(value) ? value : String(value ?? '').split(',')
  return [...new Set(items.map((item) => normalizeText(item)).filter(Boolean))]
}

function normalizeOptionalInteger(value, min, max) {
  if (value === undefined || value === null || value === '') return null
  const number = Math.round(Number(value))
  if (!Number.isFinite(number)) return null
  return Math.min(max, Math.max(min, number))
}

function createDefaultExercise(id, weekday, title, sets, reps, note, order) {
  return {
    id,
    workspaceId: 'space-family',
    userId: 'u-anna',
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
  customWorkouts,
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
  addWorkout,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  deleteWorkoutTemplate,
  replaceWeeklyProgram,
  importExercisesFromJson,
  loadWorkspace: (workspaceId) => Promise.all([
    exerciseRepository.loadWorkspace(workspaceId),
    completionRepository.loadWorkspace(workspaceId),
    workoutRepository.loadWorkspace(workspaceId),
  ]),
}

export { defaultExercises }
