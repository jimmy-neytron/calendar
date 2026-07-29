<template>
  <UiModal
    :model-value="modelValue"
    title="Запланировать курс"
    :eyebrow="`Шаг ${step} из 3`"
    width="820px"
    :close-on-overlay="!isSaving"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="course-wizard">
      <div class="course-wizard__progress" aria-hidden="true">
        <i v-for="number in 3" :key="number" :class="{ active: number <= step }" />
      </div>

      <section v-if="step === 1" class="course-wizard__step">
        <header class="course-wizard__catalog-head">
          <div>
            <h3>Выберите курс</h3>
            <p>Уроки будут добавлены в календарь по порядку.</p>
          </div>
          <span v-if="courses.length">{{ filteredCourses.length }} из {{ courses.length }}</span>
        </header>

        <UiInput
          v-if="courses.length"
          v-model="courseSearch"
          type="search"
          label="Поиск"
          placeholder="Название или описание курса"
          autocomplete="off"
        />

        <div class="course-picker">
          <button
            v-for="course in filteredCourses"
            :key="`${course.id}:${course.releaseId}`"
            type="button"
            :class="{ selected: selectedCourse?.id === course.id && selectedCourse?.releaseId === course.releaseId }"
            :aria-pressed="selectedCourse?.id === course.id && selectedCourse?.releaseId === course.releaseId"
            @click="selectedCourse = course"
          >
            <span class="course-picker__cover" :style="{ '--course-color': course.accentColor || '#60a5fa' }">
              <img v-if="isHttpUrl(course.coverUrl)" :src="course.coverUrl" alt="">
              <span v-else>
                <UiIcon name="play" />
                <small>COURSE</small>
              </span>
            </span>
            <span class="course-picker__copy">
              <small>Курс</small>
              <strong>{{ course.title }}</strong>
              <p v-if="course.description">{{ course.description }}</p>
              <span class="course-picker__meta">
                <i><UiIcon name="play" />{{ course.lessonCount }} уроков</i>
                <i><UiIcon name="calendar" />{{ course.durationWeeks || '—' }} нед.</i>
                <i v-if="course.lessonsPerWeek">{{ course.lessonsPerWeek }} в неделю</i>
              </span>
            </span>
            <span class="course-picker__check" aria-hidden="true">
              <UiIcon name="check" />
            </span>
          </button>
        </div>
        <div v-if="!courses.length" class="course-wizard__empty">
          <span><UiIcon name="play" /></span>
          <strong>Нет доступных курсов</strong>
          <p>Опубликуйте курс в Courses, затем обновите интеграцию.</p>
        </div>
        <div v-else-if="!filteredCourses.length" class="course-wizard__empty">
          <span><UiIcon name="search" /></span>
          <strong>Ничего не найдено</strong>
          <p>Попробуйте изменить поисковый запрос.</p>
          <UiButton variant="secondary" size="sm" @click="courseSearch = ''">Сбросить поиск</UiButton>
        </div>
      </section>

      <section v-else-if="step === 2" class="course-wizard__step">
        <header>
          <h3>Когда заниматься</h3>
          <p>{{ selectedCourse.title }} · {{ manifest?.lessons?.length || 0 }} уроков</p>
        </header>

        <div class="course-wizard__grid">
          <UiInput v-model="startDate" type="date" label="Начать с" required />
          <label class="course-field">
            <span>Календарь</span>
            <UiSelect v-model="calendarId">
              <option v-for="calendar in calendars" :key="calendar.id" :value="calendar.id">{{ calendar.name }}</option>
            </UiSelect>
          </label>
        </div>

        <div class="weekday-editor">
          <span>Дни и время</span>
          <div>
            <button
              v-for="day in weekdays"
              :key="day.value"
              type="button"
              :class="{ active: selectedWeekdays.includes(day.value) }"
              @click="toggleWeekday(day.value)"
            >
              {{ day.short }}
            </button>
          </div>
          <div v-for="day in selectedDayRows" :key="day.value" class="weekday-editor__row">
            <strong>{{ day.label }}</strong>
            <UiInput v-model="timeByDay[day.value]" type="time" />
          </div>
        </div>

        <label class="course-field">
          <span>Напомнить</span>
          <UiSelect v-model="reminder">
            <option value="none">Не напоминать</option>
            <option value="1h">За 1 час</option>
            <option value="1d">За день</option>
          </UiSelect>
        </label>
      </section>

      <section v-else class="course-wizard__step">
        <header>
          <h3>Проверьте план</h3>
          <p>{{ preview.length }} занятий · с {{ formatDate(preview[0]?.scheduledDate) }} по {{ formatDate(preview.at(-1)?.scheduledDate) }}</p>
        </header>
        <div class="course-preview">
          <article v-for="session in preview" :key="session.lessonId">
            <span>{{ session.lessonPosition }}</span>
            <div>
              <strong>{{ session.lessonTitle }}</strong>
              <small>{{ formatDate(session.scheduledDate) }} · {{ session.startTime }}–{{ session.endTime }}</small>
            </div>
          </article>
        </div>
      </section>

      <p v-if="errorMessage" class="course-wizard__error">{{ errorMessage }}</p>
      <footer>
        <UiButton v-if="step > 1" variant="secondary" :disabled="isSaving" @click="goBack">Назад</UiButton>
        <span />
        <UiButton
          v-if="step < 3"
          icon="right"
          :loading="isLoadingManifest"
          :disabled="!canContinue"
          @click="next"
        >
          Продолжить
        </UiButton>
        <UiButton v-else icon="calendar" :loading="isSaving" @click="save">Добавить в календарь</UiButton>
      </footer>
    </div>
  </UiModal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import UiButton from '../../../../components/ui/UiButton.vue'
import UiIcon from '../../../../components/ui/UiIcon.vue'
import UiInput from '../../../../components/ui/UiInput.vue'
import UiModal from '../../../../components/ui/UiModal.vue'
import UiSelect from '../../../../components/ui/UiSelect.vue'
import { coursesIntegrationApi } from '../api/coursesIntegration.api.js'
import { buildCourseSchedule, createCoursePlanKey } from '../services/courseSchedule.service.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  workspaceId: { type: String, required: true },
  integrationId: { type: String, required: true },
  courses: { type: Array, default: () => [] },
  calendars: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'created'])

const weekdays = [
  { value: 1, short: 'Пн', label: 'Понедельник' },
  { value: 2, short: 'Вт', label: 'Вторник' },
  { value: 3, short: 'Ср', label: 'Среда' },
  { value: 4, short: 'Чт', label: 'Четверг' },
  { value: 5, short: 'Пт', label: 'Пятница' },
  { value: 6, short: 'Сб', label: 'Суббота' },
  { value: 7, short: 'Вс', label: 'Воскресенье' },
]

const step = ref(1)
const courseSearch = ref('')
const selectedCourse = ref(null)
const manifest = ref(null)
const startDate = ref(new Date().toISOString().slice(0, 10))
const calendarId = ref('')
const reminder = ref('1h')
const selectedWeekdays = ref([2, 4])
const timeByDay = reactive({ 1: '19:00', 2: '19:00', 3: '19:00', 4: '19:00', 5: '19:00', 6: '11:00', 7: '11:00' })
const preview = ref([])
const errorMessage = ref('')
const isLoadingManifest = ref(false)
const isSaving = ref(false)

const selectedDayRows = computed(() => weekdays.filter((day) => selectedWeekdays.value.includes(day.value)))
const filteredCourses = computed(() => {
  const query = courseSearch.value.trim().toLocaleLowerCase('ru-RU')
  if (!query) return props.courses
  return props.courses.filter((course) => (
    [course.title, course.description]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('ru-RU')
      .includes(query)
  ))
})
const canContinue = computed(() => {
  if (step.value === 1) return Boolean(selectedCourse.value)
  return Boolean(startDate.value && calendarId.value && selectedWeekdays.value.length)
})
const schedule = computed(() => ({
  startDate: startDate.value,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow',
  calendarId: calendarId.value,
  responsibleId: '',
  memberIds: [],
  reminder: reminder.value,
  excludedDates: [],
  weekdayTimes: selectedDayRows.value.map((day) => ({
    weekday: day.value,
    startTime: timeByDay[day.value],
  })),
}))

watch(() => props.modelValue, (open) => {
  if (!open) return
  step.value = 1
  selectedCourse.value = null
  courseSearch.value = ''
  manifest.value = null
  preview.value = []
  errorMessage.value = ''
  restoreSchedulePreferences()
})

function toggleWeekday(value) {
  selectedWeekdays.value = selectedWeekdays.value.includes(value)
    ? selectedWeekdays.value.filter((day) => day !== value)
    : [...selectedWeekdays.value, value]
}

function goBack() {
  errorMessage.value = ''
  step.value = Math.max(1, step.value - 1)
}

async function next() {
  errorMessage.value = ''
  if (!canContinue.value) return
  if (step.value === 1) {
    isLoadingManifest.value = true
    try {
      manifest.value = await coursesIntegrationApi.getManifest(
        props.workspaceId,
        selectedCourse.value.id,
        selectedCourse.value.releaseId,
      )
      if (!manifest.value?.lessons?.length) throw new Error('В выбранном курсе нет доступных уроков')
      step.value = 2
    } catch (error) {
      errorMessage.value = error.message || 'Не удалось загрузить программу курса'
    } finally {
      isLoadingManifest.value = false
    }
    return
  }
  try {
    preview.value = buildCourseSchedule({
      lessons: manifest.value.lessons,
      startDate: startDate.value,
      weekdayTimes: schedule.value.weekdayTimes,
    })
    step.value = 3
  } catch (error) {
    errorMessage.value = error.message
  }
}

async function save() {
  if (!preview.value.length || isSaving.value) return
  isSaving.value = true
  errorMessage.value = ''
  try {
    const result = await coursesIntegrationApi.createPlan({
      workspaceId: props.workspaceId,
      integrationId: props.integrationId,
      course: {
        id: selectedCourse.value.id,
        releaseId: selectedCourse.value.releaseId,
        title: selectedCourse.value.title,
        coverUrl: selectedCourse.value.coverUrl || '',
        accentColor: selectedCourse.value.accentColor || '#60a5fa',
      },
      schedule: schedule.value,
      sessions: preview.value,
      idempotencyKey: createCoursePlanKey(selectedCourse.value.id),
    })
    saveSchedulePreferences()
    emit('created', result)
    emit('update:modelValue', false)
  } catch (error) {
    errorMessage.value = error.message || 'Не удалось создать план'
  } finally {
    isSaving.value = false
  }
}

function preferencesKey() {
  return `calendar:courses-schedule:${props.workspaceId}`
}

function restoreSchedulePreferences() {
  const fallbackCalendarId = props.calendars[0]?.id || ''
  try {
    const saved = JSON.parse(localStorage.getItem(preferencesKey()) || 'null')
    calendarId.value = props.calendars.some((calendar) => calendar.id === saved?.calendarId)
      ? saved.calendarId
      : fallbackCalendarId
    reminder.value = ['none', '1h', '1d'].includes(saved?.reminder) ? saved.reminder : '1h'
    const savedWeekdays = Array.isArray(saved?.selectedWeekdays)
      ? saved.selectedWeekdays.filter((day) => weekdays.some((item) => item.value === day))
      : []
    selectedWeekdays.value = savedWeekdays.length ? savedWeekdays : [2, 4]
    Object.entries(saved?.timeByDay || {}).forEach(([day, value]) => {
      if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) timeByDay[day] = value
    })
  } catch {
    calendarId.value = fallbackCalendarId
    reminder.value = '1h'
    selectedWeekdays.value = [2, 4]
  }
}

function saveSchedulePreferences() {
  localStorage.setItem(preferencesKey(), JSON.stringify({
    calendarId: calendarId.value,
    reminder: reminder.value,
    selectedWeekdays: selectedWeekdays.value,
    timeByDay: { ...timeByDay },
  }))
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ''))
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`))
}
</script>

<style scoped>
.course-wizard{display:grid;gap:18px}.course-wizard__progress{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.course-wizard__progress i{height:3px;border-radius:9px;background:var(--border-color)}.course-wizard__progress i.active{background:var(--accent)}.course-wizard__step{display:grid;align-content:start;gap:16px;min-height:350px}.course-wizard__step header h3{margin:0 0 4px;font-size:20px}.course-wizard__step header p{margin:0;color:var(--text-secondary)}.course-wizard__catalog-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.course-wizard__catalog-head>span{flex:0 0 auto;border:1px solid var(--border-color);border-radius:99px;padding:5px 9px;color:var(--text-muted);background:var(--control-bg);font-size:10px}.course-picker{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;gap:10px}.course-picker>button{position:relative;display:grid;grid-template-columns:78px minmax(0,1fr) 28px;align-items:center;gap:12px;min-height:108px;overflow:hidden;border:1px solid var(--border-color);border-radius:16px;padding:10px;color:var(--text-primary);background:linear-gradient(145deg,color-mix(in srgb,var(--course-color,#8b5cf6) 5%,var(--card-bg)),var(--card-bg));text-align:left;transition:.18s var(--ease-out)}.course-picker>button:hover{border-color:var(--border-strong);transform:translateY(-1px);box-shadow:var(--shadow-sm)}.course-picker>button.selected{border-color:color-mix(in srgb,var(--accent) 72%,var(--border-color));background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 10%,var(--card-bg)),var(--card-bg));box-shadow:0 0 0 3px var(--accent-soft)}.course-picker__cover{display:grid;place-items:center;width:78px;height:84px;overflow:hidden;border-radius:13px;color:white;background:linear-gradient(145deg,var(--course-color),color-mix(in srgb,var(--course-color) 42%,#111827));box-shadow:inset 0 1px 0 rgba(255,255,255,.14)}.course-picker__cover img{width:100%;height:100%;object-fit:cover}.course-picker__cover>span{display:grid;justify-items:center;gap:8px}.course-picker__cover>span svg{font-size:20px}.course-picker__cover>span small{font-size:7px;font-weight:850;letter-spacing:.14em;opacity:.75}.course-picker__copy{min-width:0}.course-picker__copy>small{display:block;margin:0 0 3px;color:var(--accent-light);font-size:8px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}.course-picker__copy>strong{display:-webkit-box;overflow:hidden;font-size:13px;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:2}.course-picker__copy>p{display:-webkit-box;overflow:hidden;margin:5px 0 0;color:var(--text-muted);font-size:10px;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:2}.course-picker__meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.course-picker__meta i{display:flex;align-items:center;gap:3px;border-radius:99px;padding:3px 6px;color:var(--text-secondary);background:var(--control-bg);font-size:8px;font-style:normal;white-space:nowrap}.course-picker__meta svg{font-size:9px}.course-picker__check{display:grid;place-items:center;width:26px;height:26px;border:1px solid var(--border-strong);border-radius:8px;color:transparent;background:var(--control-bg);box-shadow:inset 0 1px 0 color-mix(in srgb,white 5%,transparent);transition:.16s var(--ease-out)}.course-picker__check svg{font-size:15px;opacity:0;transform:scale(.65);transition:.16s var(--ease-out)}.selected .course-picker__check{border-color:var(--accent);color:var(--text-inverse);background:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}.selected .course-picker__check svg{opacity:1;transform:scale(1)}.course-wizard__grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.course-field{display:grid;gap:6px}.course-field>span,.weekday-editor>span{font-size:11px;font-weight:750;color:var(--text-secondary)}.weekday-editor{display:grid;gap:10px;border:1px solid var(--border-color);border-radius:14px;padding:14px;background:var(--card-bg)}.weekday-editor>div:first-of-type{display:flex;flex-wrap:wrap;gap:7px}.weekday-editor>div:first-of-type button{width:38px;height:34px;border:1px solid var(--border-color);border-radius:9px;color:var(--text-secondary);background:var(--control-bg)}.weekday-editor>div:first-of-type button.active{border-color:var(--accent-border);color:var(--accent-light);background:var(--accent-soft)}.weekday-editor__row{display:grid;grid-template-columns:minmax(130px,1fr) 140px;align-items:center;gap:10px}.course-preview{display:grid;gap:7px;max-height:390px;overflow:auto}.course-preview article{display:grid;grid-template-columns:34px 1fr;align-items:center;gap:10px;border:1px solid var(--border-color);border-radius:11px;padding:9px 11px;background:var(--card-bg)}.course-preview article>span{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;color:var(--accent-light);background:var(--accent-soft);font-weight:800}.course-preview strong,.course-preview small{display:block}.course-preview small{margin-top:3px;color:var(--text-muted)}.course-wizard__empty{display:grid;justify-items:center;align-content:center;gap:7px;min-height:210px;border:1px dashed var(--border-color);border-radius:16px;padding:24px;color:var(--text-muted);text-align:center}.course-wizard__empty>span{display:grid;place-items:center;width:46px;height:46px;border-radius:14px;color:var(--accent-light);background:var(--accent-soft);font-size:20px}.course-wizard__empty strong{color:var(--text-primary)}.course-wizard__empty p{margin:0}.course-wizard__error{margin:0;border-radius:10px;padding:10px 12px;color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,transparent)}.course-wizard footer{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;border-top:1px solid var(--border-color);padding-top:14px}@media(max-width:700px){.course-wizard__grid{grid-template-columns:1fr}.weekday-editor__row{grid-template-columns:1fr 120px}.course-picker{grid-template-columns:1fr}.course-wizard__catalog-head{align-items:flex-start}}
</style>
