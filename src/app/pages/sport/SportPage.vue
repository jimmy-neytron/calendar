<template>
  <section class="sport-page">
    <UiPageHeader title="Тренировки" eyebrow="Моя активность" description="Собери свою неделю один раз — план будет повторяться, пока ты его не изменишь.">
      <template v-if="activeSection === 'plan'" #actions>
        <UiButton variant="secondary" @click="applyBalancedWeek">Сбалансировать неделю</UiButton>
        <UiButton @click="isLibraryOpen = true">Выбрать тренировку</UiButton>
      </template>
    </UiPageHeader>

    <nav class="sport-navigation" aria-label="Разделы тренировок">
      <button v-for="item in SPORT_SECTIONS" :key="item.id" type="button" :class="{ active: activeSection === item.id }" :aria-pressed="activeSection === item.id" @click="activeSection = item.id">
        <UiIcon :name="item.icon" />
        <span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span>
      </button>
    </nav>

    <template v-if="activeSection === 'plan'">
    <section class="sport-dashboard">
      <article class="sport-dashboard__primary">
        <div class="sport-score__ring" :style="{ '--progress': `${weekProgress.percent * 3.6}deg` }"><span>{{ weekProgress.percent }}%</span></div>
        <div class="sport-dashboard__copy">
          <small>Эта неделя</small>
          <h2>{{ weekProgress.done }} из {{ weekProgress.total }} упражнений</h2>
          <p>{{ weekMotivation }}</p>
          <i><b :style="{ width: `${weekProgress.percent}%` }"></b></i>
        </div>
        <UiButton size="sm" variant="secondary" @click="activeSection = 'catalog'">Найти упражнение</UiButton>
      </article>
      <article class="sport-dashboard__metric">
        <span><UiIcon name="target" /></span>
        <div><small>Сегодня</small><strong>{{ todayProgress.done }}/{{ todayProgress.total }}</strong><p>{{ todayProgress.total ? 'выполнено по плану' : 'день восстановления' }}</p></div>
      </article>
      <article class="sport-dashboard__metric">
        <span><UiIcon name="calendar" /></span>
        <div><small>Ритм</small><strong>{{ activeDayCount }} дней</strong><p>{{ weeklyWorkoutCount }} тренировок в неделю</p></div>
      </article>
    </section>

    <section class="week-plan">
      <div class="section-title">
        <div><small>Постоянный шаблон</small><h2>Твоя неделя</h2></div>
        <UiButton size="sm" variant="secondary" icon="plus" @click="openWorkoutCreator">Своя тренировка</UiButton>
      </div>

      <div class="week-strip">
        <button v-for="day in weekDays" :key="day.key" type="button" :class="{ active: day.key === selectedDateKey, today: day.isToday }" @click="selectedDateKey = day.key">
          <header><span>{{ day.short }}</span><b>{{ day.dayNumber }}</b></header>
          <div v-if="day.workouts.length" class="week-strip__session">
            <i :style="{ background: day.workouts[0].color }"></i>
            <strong>{{ day.workouts[0].name }}</strong>
            <small>{{ day.progress.done }}/{{ day.progress.total }}</small>
          </div>
          <div v-else class="week-strip__rest"><UiIcon name="activity" /><span>Отдых</span></div>
        </button>
      </div>
    </section>

    <section class="day-section">
      <div class="section-title">
        <div><small>Выбранный день</small><h2>{{ selectedDayTitle }}</h2></div>
        <div class="section-title__actions">
          <UiButton size="sm" variant="secondary" @click="isLibraryOpen = true">Из библиотеки</UiButton>
          <UiButton size="sm" icon="plus" @click="openWorkoutCreator">Своя тренировка</UiButton>
        </div>
      </div>

      <div v-if="selectedWorkouts.length" class="workout-stack">
        <article v-for="workout in selectedWorkouts" :key="workout.id" class="workout-card" :style="{ '--workout-color': workout.color }">
          <header class="workout-card__head">
            <span class="workout-card__icon"><UiIcon name="sport" /></span>
            <div><small>{{ workout.focus.join(' · ') || 'Личная программа' }}</small><h3>{{ workout.name }}</h3></div>
            <div class="workout-card__progress"><strong>{{ workout.done }}/{{ workout.exercises.length }}</strong><span>{{ workout.duration }} мин</span></div>
            <div class="workout-card__actions">
              <UiIconButton icon="edit" label="Редактировать тренировку" size="sm" @click="openWorkoutEditor(workout)" />
              <UiIconButton icon="trash" label="Удалить всю тренировку" size="sm" variant="danger" @click="removeWorkout(workout)" />
            </div>
          </header>
          <div class="workout-card__bar"><i :style="{ width: `${workout.percent}%` }"></i></div>
          <div class="workout-card__exercises">
            <article v-for="exercise in workout.exercises" :key="exercise.id" :class="{ done: isDone(exercise.id) }">
              <button class="exercise-check" type="button" @click="toggleDone(exercise.id)"><UiIcon v-if="isDone(exercise.id)" name="check" /></button>
              <button class="exercise-info" type="button" @click="openExercise(exercise)">
                <strong>{{ exercise.title }}</strong>
                <span>{{ exercise.sets }} · {{ exercise.reps }}</span>
              </button>
              <div class="exercise-muscles"><span v-for="group in (exercise.muscleGroups || []).slice(0, 2)" :key="group">{{ group }}</span></div>
              <UiIconButton icon="edit" label="Изменить упражнение" size="sm" @click="openExercise(exercise)" />
            </article>
          </div>
        </article>
      </div>

      <div v-else class="day-empty">
        <span><UiIcon name="activity" /></span>
        <strong>День восстановления</strong>
        <p>Оставь его свободным или выбери тренировку из библиотеки.</p>
        <UiButton size="sm" @click="isLibraryOpen = true">Открыть библиотеку</UiButton>
      </div>
    </section>

    <WorkoutRadioWidget />
    </template>

    <ExerciseCatalog v-else-if="activeSection === 'catalog'" :initial-weekday="selectedWeekday" @add="addApiExercise" />
    <SportProgressPanel v-else />

    <WorkoutLibraryModal
      v-model="isLibraryOpen"
      :initial-weekday="selectedWeekday"
      :custom-workouts="sportStore.customWorkouts.value"
      @add="addWorkout"
      @create-custom="createWorkoutFromLibrary"
      @delete-custom="removeWorkoutTemplate"
    />
    <ExerciseDetailsModal v-model="isExerciseOpen" :exercise="activeExercise" @save="saveExercise" />
    <WorkoutEditorModal v-model="isWorkoutEditorOpen" :workout="activeWorkout" :initial-weekday="selectedWeekday" @save="saveWorkout" />
    <UiConfirmModal
      v-model="confirmation.isOpen"
      :title="confirmation.title"
      :message="confirmation.message"
      :confirm-label="confirmation.confirmLabel"
      :variant="confirmation.variant"
      @confirm="confirmPendingAction"
    />
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiConfirmModal from '../../components/ui/UiConfirmModal.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import UiIconButton from '../../components/ui/UiIconButton.vue'
import UiPageHeader from '../../components/ui/UiPageHeader.vue'
import ExerciseDetailsModal from '../../components/sport/ExerciseDetailsModal.vue'
import WorkoutLibraryModal from '../../components/sport/WorkoutLibraryModal.vue'
import WorkoutEditorModal from '../../components/sport/WorkoutEditorModal.vue'
import WorkoutRadioWidget from '../../components/sport/WorkoutRadioWidget.vue'
import ExerciseCatalog from '../../modules/sport/components/ExerciseCatalog.vue'
import SportProgressPanel from '../../modules/sport/components/SportProgressPanel.vue'
import { sportStore } from '../../stores/sport.store.js'
import { buildBalancedWeek } from '../../config/sportWorkoutLibrary.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { DateHelper } from '../../utils/date/dateHelper.js'
import { WEEKDAY_OPTIONS } from '../../utils/constants/calendarConstants.js'

const { notify } = useNotification()
const SPORT_SECTIONS = [
  { id: 'plan', label: 'План', description: 'Неделя и тренировки', icon: 'calendar' },
  { id: 'catalog', label: 'Упражнения', description: 'Открытая база wger', icon: 'sport' },
  { id: 'progress', label: 'Прогресс', description: 'Регулярность и баланс', icon: 'chart' },
]
const activeSection = ref('plan')
const selectedDateKey = ref(DateHelper.toKey(new Date()))
const isLibraryOpen = ref(false)
const isExerciseOpen = ref(false)
const isWorkoutEditorOpen = ref(false)
const activeExercise = ref(null)
const activeWorkout = ref(null)
const confirmation = reactive({
  isOpen: false,
  title: '',
  message: '',
  confirmLabel: 'Подтвердить',
  variant: 'danger',
  action: null,
})
const weekProgress = sportStore.weekProgress
const todayProgress = sportStore.todayProgress
const selectedExercises = computed(() => sportStore.getExercisesForDate(selectedDateKey.value))
const selectedWeekday = computed(() => DateHelper.parseKey(selectedDateKey.value).getDay())
const selectedDayTitle = computed(() => new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(DateHelper.parseKey(selectedDateKey.value)))
const selectedWorkouts = computed(() => groupWorkouts(selectedExercises.value, selectedWeekday.value, selectedDateKey.value))
const activeDayCount = computed(() => sportStore.weekProgram.value.filter((day) => day.exercises.length).length)
const weeklyWorkoutCount = computed(() => sportStore.weekProgram.value.reduce((sum, day) => sum + groupWorkouts(day.exercises, day.weekday).length, 0))
const weekMotivation = computed(() => {
  if (!weekProgress.value.total) return 'Добавь первую тренировку или выбери упражнение из справочника.'
  if (weekProgress.value.percent === 100) return 'Неделя закрыта. Отличная регулярность.'
  if (weekProgress.value.percent >= 50) return 'Больше половины готово — продолжай в том же ритме.'
  return 'Начни с одного упражнения: небольшая тренировка тоже считается.'
})
const weekDays = computed(() => {
  const start = getMonday(DateHelper.parseKey(selectedDateKey.value))
  return WEEKDAY_OPTIONS.map((meta, index) => {
    const date = DateHelper.addDays(start, index)
    const key = DateHelper.toKey(date)
    const exercises = sportStore.getExercisesForDate(key)
    return { ...meta, key, dayNumber: date.getDate(), isToday: DateHelper.isToday(date), progress: sportStore.getDayProgress(key), workouts: groupWorkouts(exercises, date.getDay(), key) }
  })
})

function groupWorkouts(items, weekday, dateKey = '') {
  const groups = new Map()
  items.forEach((item) => {
    const id = item.workoutId || `personal-${weekday}`
    if (!groups.has(id)) groups.set(id, { id, weekday, name: item.workoutName || 'Моя тренировка', focus: item.workoutFocus || [], color: item.workoutColor || '#6ee7b7', exercises: [] })
    groups.get(id).exercises.push(item)
  })
  return [...groups.values()].map((workout) => {
    const done = dateKey ? workout.exercises.filter((item) => sportStore.isExerciseDone(item.id, dateKey)).length : 0
    return { ...workout, done, percent: workout.exercises.length ? Math.round(done / workout.exercises.length * 100) : 0, duration: workout.exercises.reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0) }
  })
}

function getMonday(date) { return DateHelper.addDays(date, date.getDay() === 0 ? -6 : 1 - date.getDay()) }
function isDone(id) { return sportStore.isExerciseDone(id, selectedDateKey.value) }
function openWorkoutCreator() { activeWorkout.value = null; isWorkoutEditorOpen.value = true }
function createWorkoutFromLibrary() { isLibraryOpen.value = false; openWorkoutCreator() }
function openWorkoutEditor(workout) {
  const weekdays = [...new Set(sportStore.exercises.value
    .filter((exercise) => exercise.workoutId === workout.id || (!exercise.workoutId && workout.id === `personal-${workout.weekday}` && exercise.weekday === workout.weekday))
    .map((exercise) => exercise.weekday))]
  activeWorkout.value = { ...workout, weekdays }
  isWorkoutEditorOpen.value = true
}
function openExercise(item) { activeExercise.value = item; isExerciseOpen.value = true }
function toggleDone(id) { const result = sportStore.toggleExercise(id, selectedDateKey.value); if (!result.ok) notify(result.message, 'danger') }
function removeWorkout(workout) {
  requestConfirmation({
    title: 'Удалить тренировку?',
    message: `Тренировка «${workout.name}» будет удалена из всех выбранных дней вместе с упражнениями и отметками выполнения.`,
    confirmLabel: 'Удалить тренировку',
    variant: 'danger',
  }, () => {
    const result = sportStore.deleteWorkout(workout.id, workout.weekday)
    notify(result.ok ? `Тренировка «${workout.name}» удалена` : result.message, result.ok ? 'info' : 'danger')
  })
}
function removeWorkoutTemplate(workout) {
  requestConfirmation({
    title: 'Удалить из библиотеки?',
    message: `Шаблон «${workout.title}» будет удалён из библиотеки. Уже добавленные в расписание тренировки останутся.`,
    confirmLabel: 'Удалить шаблон',
    variant: 'danger',
  }, () => {
    const result = sportStore.deleteWorkoutTemplate(workout.id)
    notify(result.ok ? `Шаблон «${workout.title}» удалён` : result.message, result.ok ? 'info' : 'danger')
  })
}
function saveExercise({ id, updates }) { const result = sportStore.updateExercise(id, updates); if (result.ok) { isExerciseOpen.value = false; notify('Упражнение обновлено', 'success') } else notify(result.message, 'danger') }
function addWorkout({ workout, weekdays }) { const result = sportStore.addWorkout(workout, weekdays); if (result.ok) { isLibraryOpen.value = false; notify(`Тренировка «${workout.title}» добавлена в расписание`, 'success') } else notify(result.message, 'danger') }
function addApiExercise({ exercise, weekday }) {
  const result = sportStore.addExercise({
    weekday,
    title: exercise.title,
    sets: '3 подхода',
    reps: '8 повторений',
    muscleGroups: exercise.muscles.length ? exercise.muscles : [exercise.category],
    exerciseType: exercise.category,
    difficulty: 'Начальная',
    equipment: exercise.equipment.join(', '),
    durationMinutes: 8,
    restSeconds: 60,
    tempo: 'Подконтрольно',
    instructions: exercise.description,
    note: `Источник: wger · ${exercise.licenseName}`,
  })
  if (result.ok) {
    activeSection.value = 'plan'
    notify(`«${exercise.title}» добавлено в расписание`, 'success')
  } else notify(result.message, 'danger')
}
function saveWorkout(data) {
  const result = data.id ? sportStore.updateWorkout(data.id, data) : sportStore.createWorkout(data)
  if (result.ok) {
    isWorkoutEditorOpen.value = false
    activeWorkout.value = null
    notify(data.id ? 'Тренировка обновлена' : 'Тренировка создана', 'success')
  } else notify(result.message, 'danger')
}
function applyBalancedWeek() {
  requestConfirmation({
    title: 'Заменить недельную программу?',
    message: 'Текущие тренировки, упражнения и отметки выполнения будут удалены и заменены сбалансированной неделей.',
    confirmLabel: 'Заменить программу',
    variant: 'primary',
  }, () => {
    const result = sportStore.replaceWeeklyProgram(buildBalancedWeek())
    notify(result.ok ? 'Сбалансированная неделя готова' : result.message, result.ok ? 'success' : 'danger')
  })
}

function requestConfirmation(options, action) {
  Object.assign(confirmation, options, { isOpen: true, action })
}

function confirmPendingAction() {
  const action = confirmation.action
  confirmation.isOpen = false
  confirmation.action = null
  action?.()
}
</script>

<style scoped>
.sport-page {
  width: 100%;
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 2px;
}
.sport-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.sport-header p, .section-title small { margin: 0 0 3px; color: var(--accent); font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.sport-header h1, .section-title h2 { margin: 0; }
.sport-header > div > span { color: var(--text-secondary); font-size: 12px; }
.sport-header__actions { display: flex; gap: 8px; }
.sport-navigation { width: fit-content; display: flex; gap: 3px; border: 1px solid var(--border-color); border-radius: 15px; padding: 4px; background: var(--control-bg); }
.sport-navigation button { display: grid; grid-template-columns: 26px 1fr; align-items: center; gap: 7px; border: 0; border-radius: 11px; padding: 7px 12px 7px 8px; color: var(--text-secondary); background: transparent; text-align: left; }
.sport-navigation button > svg { width: 26px; height: 26px; border-radius: 8px; padding: 6px; color: var(--text-muted); }
.sport-navigation button > span { min-width: 0; display: grid; gap: 2px; }
.sport-navigation button strong { font-size: 11px; }
.sport-navigation button small { overflow: hidden; color: var(--text-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.sport-navigation button.active { color: var(--text-primary); background: var(--card-solid); box-shadow: var(--shadow-sm); }
.sport-navigation button.active > svg { color: var(--accent); background: var(--accent-soft); }
.section-title__actions { display: flex; gap: 7px; }
.sport-dashboard { display: grid; grid-template-columns: minmax(380px, 1.6fr) repeat(2, minmax(170px, .7fr)); gap: 9px; }
.sport-dashboard > article, .week-plan, .day-section { border: 1px solid var(--border-color); border-radius: var(--radius-xl); background: var(--card-solid); box-shadow: var(--shadow-sm); }
.sport-dashboard__primary { min-width: 0; display: grid; grid-template-columns: 70px 1fr auto; align-items: center; gap: 13px; padding: 15px; background: linear-gradient(135deg, var(--accent-soft), var(--card-solid) 68%) !important; }
.sport-score__ring { width: 70px; height: 70px; display: grid; flex: 0 0 auto; place-items: center; border-radius: 50%; background: conic-gradient(var(--accent) var(--progress), var(--control-bg) 0); position: relative; }
.sport-score__ring::after { position: absolute; inset: 6px; border-radius: inherit; background: var(--card-solid); content: ''; }
.sport-score__ring span { z-index: 1; font-size: 14px; font-weight: 900; }
.sport-dashboard__copy { min-width: 0; display: grid; gap: 3px; }
.sport-dashboard__copy small, .sport-dashboard__metric small { color: var(--accent); font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.sport-dashboard__copy h2 { margin: 0; font-size: 16px; }
.sport-dashboard__copy p, .sport-dashboard__metric p { margin: 0; color: var(--text-secondary); font-size: 9px; line-height: 1.45; }
.sport-dashboard__copy > i { height: 5px; margin-top: 5px; overflow: hidden; border-radius: 8px; background: var(--control-bg); }
.sport-dashboard__copy > i b { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
.sport-dashboard__metric { display: grid; grid-template-columns: 40px 1fr; align-items: center; gap: 10px; padding: 13px; }
.sport-dashboard__metric > span { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; color: var(--accent); background: var(--accent-soft); }
.sport-dashboard__metric > div { min-width: 0; display: grid; gap: 2px; }
.sport-dashboard__metric strong { font-size: 18px; line-height: 1; }
.week-plan, .day-section { display: grid; gap: 11px; padding: 13px; }
.section-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-title h2 { font-size: 17px; text-transform: capitalize; }
.week-strip { display: grid; grid-template-columns: repeat(7, minmax(105px, 1fr)); gap: 7px; overflow-x: auto; }
.week-strip > button { min-height: 105px; display: grid; align-content: space-between; gap: 10px; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 9px; color: var(--text-primary); background: var(--card-soft); text-align: left; }
.week-strip > button.active { border-color: var(--accent-border); background: var(--accent-soft); }
.week-strip > button.today header b { color: var(--accent); }
.week-strip header { display: flex; justify-content: space-between; align-items: center; }
.week-strip header span { color: var(--text-muted); font-size: 10px; font-weight: 800; text-transform: uppercase; }
.week-strip header b { font-size: 16px; }
.week-strip__session { display: grid; grid-template-columns: 5px 1fr; gap: 3px 6px; min-width: 0; }
.week-strip__session i { grid-row: 1 / 3; width: 4px; border-radius: 5px; }
.week-strip__session strong { overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.week-strip__session small { color: var(--text-muted); font-size: 9px; }
.week-strip__rest { display: flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: 10px; }
.workout-stack { display: grid; gap: 10px; }
.workout-card { overflow: hidden; border: 1px solid var(--border-color); border-radius: var(--radius-lg); background: var(--card-soft); }
.workout-card__head { display: grid; grid-template-columns: 40px 1fr auto auto; align-items: center; gap: 10px; padding: 12px; }
.workout-card__actions { display: flex !important; gap: 5px !important; }
.workout-card__icon { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; color: var(--workout-color); background: color-mix(in srgb, var(--workout-color) 12%, transparent); }
.workout-card__head div { display: grid; gap: 2px; }
.workout-card__head small { color: var(--workout-color); font-size: 9px; font-weight: 800; text-transform: uppercase; }
.workout-card__head h3 { margin: 0; font-size: 15px; }
.workout-card__progress { justify-items: end; }
.workout-card__progress span { color: var(--text-muted); font-size: 10px; }
.workout-card__bar { height: 3px; background: var(--control-bg); }
.workout-card__bar i { display: block; height: 100%; background: var(--workout-color); }
.workout-card__exercises { display: grid; }
.workout-card__exercises > article { display: grid; grid-template-columns: 30px minmax(180px, 1fr) minmax(100px, auto) 28px; align-items: center; gap: 8px; border-top: 1px solid var(--border-color); padding: 8px 11px; }
.workout-card__exercises > article.done { opacity: .55; }
.exercise-check { width: 28px; height: 28px; display: grid; place-items: center; border: 1px solid var(--border-color); border-radius: 9px; color: var(--success); background: var(--control-bg); }
.exercise-info { display: grid; gap: 2px; border: 0; padding: 0; color: inherit; background: transparent; text-align: left; }
.exercise-info strong { font-size: 12px; }.exercise-info span { color: var(--text-muted); font-size: 10px; }
.exercise-muscles { display: flex; justify-content: flex-end; gap: 4px; }
.exercise-muscles span { border-radius: var(--radius-pill); padding: 3px 6px; color: var(--text-secondary); background: var(--control-bg); font-size: 9px; }
.day-empty { display: grid; justify-items: center; gap: 6px; border: 1px dashed var(--border-strong); border-radius: var(--radius-lg); padding: 28px; text-align: center; }
.day-empty > span { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 13px; color: var(--accent); background: var(--accent-soft); }
.day-empty p { margin: 0 0 5px; color: var(--text-secondary); font-size: 11px; }
@media (max-width: 1050px) { .sport-dashboard { grid-template-columns: 1fr 1fr; }.sport-dashboard__primary { grid-column: 1 / -1; } }
@media (max-width: 650px) { .sport-page { padding: 0; }.sport-header, .sport-header__actions { display: grid; }.sport-navigation { width: 100%; }.sport-navigation button { min-width: 0; flex: 1; grid-template-columns: 1fr; justify-items: center; padding: 7px; text-align: center; }.sport-navigation button > span { justify-items: center; }.sport-navigation button small { display: none; }.sport-dashboard { grid-template-columns: 1fr; }.sport-dashboard__primary { grid-column: auto; grid-template-columns: 58px 1fr; }.sport-dashboard__primary > :last-child { grid-column: 1 / -1; }.sport-score__ring { width: 58px; height: 58px; }.section-title { align-items: end; }.section-title__actions { display: grid; }.workout-card__head { grid-template-columns: 40px 1fr auto; }.workout-card__progress { display: none !important; }.workout-card__actions { grid-column: 2 / -1; justify-content: flex-end; }.workout-card__exercises > article { grid-template-columns: 30px 1fr 28px; }.exercise-muscles { display: none; } }
</style>
