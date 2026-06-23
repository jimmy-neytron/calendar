<template>
  <main class="day-display">
    <header class="day-display__header">
      <div class="day-display__date">
        <span>{{ weekday }}</span>
        <h1>{{ fullDate }}</h1>
        <p>{{ workspaceName }}</p>
      </div>

      <time :datetime="currentTime">{{ currentTime }}</time>

      <div class="day-display__actions">
        <button
          type="button"
          :class="{ active: isActive }"
          :title="isActive ? 'Экран не будет гаснуть' : 'Не давать экрану погаснуть'"
          @click="toggleWakeLock"
        >
          <UiIcon :name="isActive ? 'check' : 'activity'" />
          {{ isActive ? 'Экран активен' : 'Не гасить экран' }}
        </button>
        <button type="button" @click="toggleFullscreen">
          <UiIcon name="grid" />
          {{ isFullscreen ? 'Свернуть' : 'На весь экран' }}
        </button>
        <RouterLink :to="{ name: 'calendar' }">
          <UiIcon name="close" />
          Выйти
        </RouterLink>
      </div>
    </header>

    <p v-if="wakeLockError" class="day-display__notice">{{ wakeLockError }}</p>

    <section class="day-display__summary">
      <article>
        <span>Событий сегодня</span>
        <strong>{{ todayEvents.length }}</strong>
        <small>{{ nextEventLabel }}</small>
      </article>
      <article>
        <span>Спорт</span>
        <strong>{{ sportProgress.done }}/{{ sportProgress.total }}</strong>
        <div><i :style="{ width: `${sportProgress.percent}%` }" /></div>
      </article>
      <article>
        <span>Свободный вечер</span>
        <strong>{{ lastEventEnd }}</strong>
        <small>{{ todayEvents.length ? 'после последнего события' : 'день пока свободен' }}</small>
      </article>
    </section>

    <div class="day-display__grid">
      <section class="day-display__panel day-display__schedule">
        <header>
          <div>
            <span>Расписание</span>
            <h2>Сегодня</h2>
          </div>
          <UiIcon name="calendar" />
        </header>

        <div v-if="todayEvents.length" class="day-display__events">
          <article
            v-for="event in todayEvents"
            :key="event.id"
            :class="{ completed: event.completedAt }"
          >
            <time>{{ event.allDay ? 'Весь день' : event.startTime || 'Без времени' }}</time>
            <span :style="{ background: getEventColor(event) }" />
            <div>
              <strong>{{ formatEventTitle(event) }}</strong>
              <small>
                {{ event.endTime && !event.allDay ? `до ${event.endTime}` : categoryLabel(event.category) }}
                <template v-if="event.linkedEntityType === 'budget-payment'"> · Бюджет</template>
              </small>
            </div>
          </article>
        </div>

        <div v-else class="day-display__empty">
          <UiIcon name="calendar" />
          <strong>На сегодня событий нет</strong>
          <span>Можно оставить день свободным или добавить планы в календаре.</span>
        </div>
      </section>

      <div class="day-display__side">
        <section class="day-display__panel day-display__sport">
          <header>
            <div>
              <span>Активность</span>
              <h2>Спорт на сегодня</h2>
            </div>
            <UiIcon name="sport" />
          </header>

          <div v-if="todayExercises.length" class="day-display__exercises">
            <button
              v-for="exercise in todayExercises"
              :key="exercise.id"
              type="button"
              :class="{ completed: isExerciseDone(exercise.id) }"
              @click="toggleExercise(exercise.id)"
            >
              <span><UiIcon name="check" /></span>
              <div>
                <strong>{{ exercise.title }}</strong>
                <small>{{ exercise.sets }} · {{ exercise.reps }}</small>
              </div>
            </button>
          </div>
          <p v-else class="day-display__compact-empty">Сегодня восстановление — упражнений нет.</p>
        </section>

        <section class="day-display__panel day-display__ideas">
          <header>
            <div>
              <span>На потом</span>
              <h2>Идеи и планы</h2>
            </div>
            <UiIcon name="sparkles" />
          </header>

          <ul v-if="unplannedIdeas.length">
            <li v-for="idea in unplannedIdeas" :key="idea.id">{{ idea.title }}</li>
          </ul>
          <p v-else class="day-display__compact-empty">Все идеи уже запланированы.</p>
        </section>
      </div>
    </div>

    <footer>
      <span>{{ isActive ? 'Экран останется включённым' : 'Нажми «Не гасить экран», чтобы оставить табло открытым' }}</span>
      <small>Данные обновляются автоматически</small>
    </footer>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import { useScreenWakeLock } from '../../composables/display/useScreenWakeLock.js'
import { calendarStore } from '../../stores/calendar.store.js'
import { calendarCollectionStore } from '../../stores/calendarCollection.store.js'
import { ideaStore } from '../../stores/idea.store.js'
import { sportStore } from '../../stores/sport.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'
import { formatEventTitle, getCategoryMeta, getEventAccent } from '../../utils/formatters/calendarFormatter.js'

const now = ref(new Date())
const isFullscreen = ref(Boolean(document.fullscreenElement))
const { error: wakeLockError, isActive, enable, disable } = useScreenWakeLock()
const todayEvents = computed(() => calendarStore.todayEvents.value)
const todayExercises = sportStore.todayExercises
const sportProgress = sportStore.todayProgress
const workspaceName = computed(() => workspaceStore.activeWorkspace.value?.name || 'Моё пространство')
const unplannedIdeas = computed(() => ideaStore.ideas.value
  .filter((idea) => !idea.plannedEventId)
  .slice(0, 4))
const weekday = computed(() => new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(now.value))
const fullDate = computed(() => new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(now.value))
const currentTime = computed(() => new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
}).format(now.value))
const nextEvent = computed(() => {
  const time = currentTime.value
  return todayEvents.value.find((event) => event.allDay || !event.startTime || event.endTime >= time) || null
})
const nextEventLabel = computed(() => nextEvent.value
  ? `${nextEvent.value.startTime || 'сегодня'} · ${formatEventTitle(nextEvent.value)}`
  : 'больше событий нет')
const lastEventEnd = computed(() => {
  const timed = todayEvents.value.filter((event) => event.endTime).sort((a, b) => b.endTime.localeCompare(a.endTime))
  return timed[0]?.endTime || 'Свободно'
})

let clockTimer = null

function isExerciseDone(exerciseId) {
  return sportStore.isExerciseDone(exerciseId, sportStore.todayKey.value)
}

function toggleExercise(exerciseId) {
  sportStore.toggleExercise(exerciseId, sportStore.todayKey.value)
}

function categoryLabel(category) {
  return getCategoryMeta(category).label
}

function getEventColor(event) {
  return calendarCollectionStore.getCollection(event.calendarId)?.color
    || getEventAccent(event.memberIds, workspaceStore.activeWorkspaceMembers.value)
}

async function toggleWakeLock() {
  if (isActive.value) await disable()
  else await enable()
}

async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen()
  else await document.documentElement.requestFullscreen()
}

function updateFullscreenState() {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

onMounted(() => {
  clockTimer = window.setInterval(() => {
    now.value = new Date()
  }, 30_000)
  document.addEventListener('fullscreenchange', updateFullscreenState)
  enable()
})

onBeforeUnmount(() => {
  window.clearInterval(clockTimer)
  document.removeEventListener('fullscreenchange', updateFullscreenState)
})
</script>

<style scoped>
.day-display {
  height: 100dvh;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: clamp(8px, 1.3vw, 14px);
  padding: clamp(12px, 2vw, 22px);
  background:
    radial-gradient(circle at 10% 0%, color-mix(in srgb, var(--accent) 13%, transparent), transparent 34%),
    radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--success) 10%, transparent), transparent 32%),
    var(--bg-primary);
}

.day-display__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 20px;
}

.day-display__date > span,
.day-display__panel header span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .13em;
  text-transform: uppercase;
}

.day-display__date h1 {
  margin: 2px 0;
  font-size: clamp(21px, 3vw, 34px);
  text-transform: capitalize;
}

.day-display__date p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 11px;
}

.day-display__header > time {
  font-size: clamp(42px, 7vw, 76px);
  font-weight: 800;
  line-height: .9;
  letter-spacing: -.065em;
}

.day-display__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.day-display__actions button,
.day-display__actions a {
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 0 11px;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--control-bg);
  text-decoration: none;
}

.day-display__actions button.active {
  border-color: color-mix(in srgb, var(--success) 35%, var(--border-color));
  color: var(--success);
  background: color-mix(in srgb, var(--success) 9%, var(--control-bg));
}

.day-display__notice {
  margin: 0;
  border: 1px solid color-mix(in srgb, var(--warning) 30%, var(--border-color));
  border-radius: var(--radius-md);
  padding: 9px 12px;
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 7%, transparent);
}

.day-display__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.day-display__summary article {
  display: grid;
  gap: 4px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 9px 12px;
  background: color-mix(in srgb, var(--panel-bg) 88%, transparent);
}

.day-display__summary span,
.day-display__summary small {
  color: var(--text-muted);
  font-size: 9px;
}

.day-display__summary strong {
  font-size: clamp(18px, 2.2vw, 25px);
  line-height: 1;
}

.day-display__summary article > div {
  height: 6px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--field-bg);
}

.day-display__summary i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--success);
}

.day-display__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, .65fr);
  gap: 10px;
  min-height: 0;
}

.day-display__side {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 10px;
  min-height: 0;
}

.day-display__panel {
  min-height: 0;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: clamp(11px, 1.4vw, 16px);
  background: color-mix(in srgb, var(--panel-bg) 92%, transparent);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.day-display__panel > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 9px;
}

.day-display__panel header h2 {
  margin: 2px 0 0;
  font-size: clamp(15px, 1.6vw, 20px);
}

.day-display__panel > header > :deep(svg) {
  color: var(--accent);
  font-size: 19px;
}

.day-display__events {
  display: grid;
  gap: 6px;
  max-height: 100%;
  overflow-y: auto;
}

.day-display__events article {
  display: grid;
  grid-template-columns: 62px 3px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 48px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 7px 9px;
  background: var(--control-bg);
}

.day-display__events article.completed {
  opacity: .55;
}

.day-display__events article > time {
  font-size: 12px;
  font-weight: 800;
}

.day-display__events article > span {
  width: 3px;
  height: 28px;
  border-radius: var(--radius-pill);
}

.day-display__events strong,
.day-display__events small {
  display: block;
}

.day-display__events strong {
  font-size: clamp(12px, 1.3vw, 15px);
}

.day-display__events small {
  margin-top: 1px;
  color: var(--text-muted);
  font-size: 9px;
}

.day-display__exercises {
  display: grid;
  gap: 5px;
  max-height: 100%;
  overflow-y: auto;
}

.day-display__exercises button {
  display: grid;
  grid-template-columns: 29px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 44px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 6px 8px;
  color: var(--text-primary);
  background: var(--control-bg);
  text-align: left;
}

.day-display__exercises button > span {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  color: transparent;
}

.day-display__exercises button.completed {
  opacity: .65;
}

.day-display__exercises button.completed > span {
  border-color: var(--success);
  color: var(--text-inverse);
  background: var(--success);
}

.day-display__exercises strong,
.day-display__exercises small {
  display: block;
}

.day-display__exercises strong {
  font-size: 11px;
}

.day-display__exercises small {
  margin-top: 1px;
  color: var(--text-muted);
  font-size: 8px;
}

.day-display__ideas ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.day-display__ideas li {
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 7px 9px;
  background: var(--control-bg);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-display__empty {
  min-height: 150px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  color: var(--text-muted);
  text-align: center;
}

.day-display__empty :deep(svg) {
  font-size: 34px;
}

.day-display__compact-empty {
  margin: 0;
  color: var(--text-muted);
}

.day-display > footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-muted);
  font-size: 9px;
}

@media (max-width: 1024px) {
  .day-display__header {
    grid-template-columns: 1fr auto;
  }

  .day-display__header > time {
    grid-column: 2;
    grid-row: 1;
  }

  .day-display__actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  .day-display__grid {
    grid-template-columns: minmax(0, 1.15fr) minmax(290px, .85fr);
  }

  .day-display {
    gap: 8px;
    padding: 10px 12px;
  }

  .day-display__header {
    gap: 8px 14px;
  }

  .day-display__actions {
    gap: 5px;
  }

  .day-display__summary {
    gap: 6px;
  }
}

@media (max-width: 760px), (orientation: portrait) and (max-width: 900px) {
  .day-display {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }

  .day-display__header,
  .day-display__grid {
    grid-template-columns: 1fr;
  }

  .day-display__header > time {
    grid-column: auto;
    grid-row: auto;
    justify-self: start;
  }

  .day-display__summary {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .day-display * {
    scroll-behavior: auto;
  }
}
</style>
