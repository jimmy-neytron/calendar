<template>
  <RouterView v-if="isStandaloneRoute" v-slot="{ Component }">
    <transition name="page-shift" mode="out-in">
      <component :is="Component" :key="$route.name" />
    </transition>
  </RouterView>

  <div v-else class="default-layout">
    <AppHeader
      :current-user="currentUser"
      :active-workspace="activeWorkspace"
      :is-calendar-route="route.name === 'calendar'"
      :view-mode="calendarViewMode"
      @today="goCalendarToday"
      @toggle-calendar-view="toggleCalendarView"
    />

    <div v-if="workspaceStore.error.value" class="backend-error">
      <strong>Supabase не смог загрузить пространство</strong>
      <span>{{ workspaceStore.error.value }}</span>
    </div>

    <div class="default-layout__body">
      <AppSidebar />
      <AppContainer>
        <RouterView v-slot="{ Component }">
          <transition name="page-shift" mode="out-in">
            <component
              :is="Component"
              :key="$route.name"
              ref="activePageRef"
              :force-create-token="createToken"
              @view-mode-change="calendarViewMode = $event"
            />
          </transition>
        </RouterView>
      </AppContainer>
    </div>

    <button
      v-if="route.name === 'calendar'"
      class="quick-create"
      type="button"
      title="Новое событие (N)"
      @click="openEventDrawer"
    >
      <span>＋</span>
      <b>Событие</b>
    </button>

    <CommandPalette
      v-model="isCommandPaletteOpen"
      :commands="commands"
      :smart-suggestion="smartSuggestion"
      @run="runCommand"
      @query-change="paletteQuery = $event"
      @smart-create="createSmartEvent"
    />

    <AppOnboarding />
    <PwaPrompt />

    <div class="toast-stack">
      <transition-group name="toast-list">
        <AppToast
          v-for="notification in notifications"
          :key="notification.id"
          :notification="notification"
          @dismiss="dismiss"
          @action="runNotificationAction"
        />
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppContainer from '../../components/common/AppContainer.vue'
import AppHeader from '../../components/common/AppHeader.vue'
import AppSidebar from '../../components/common/AppSidebar.vue'
import CommandPalette from '../../components/common/CommandPalette.vue'
import AppToast from '../../components/common/AppToast.vue'
import AppOnboarding from '../../components/onboarding/AppOnboarding.vue'
import PwaPrompt from '../../components/common/PwaPrompt.vue'
import { useNotification } from '../../composables/ui/useNotification.js'
import { useAutoBackup } from '../../composables/storage/useAutoBackup.js'
import { authStore } from '../../stores/auth.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'
import { calendarStore } from '../../stores/calendar.store.js'
import { useCalendarPreferences } from '../../composables/preferences/useCalendarPreferences.js'
import { useBudgetSettings } from '../../composables/preferences/useBudgetSettings.js'
import { readSubscriptionFeature } from '../../composables/preferences/useSubscriptionSettings.js'
import { parseSmartEvent } from '../../services/smartEventParser.js'
import { calendarCollectionStore } from '../../stores/calendarCollection.store.js'
import { useOnboarding } from '../../composables/onboarding/useOnboarding.js'
import { useTimeTrackingSettings } from '../../composables/preferences/useTimeTrackingSettings.js'
import { useLocalEventReminders } from '../../composables/notifications/useLocalEventReminders.js'
import { useRealtimeNotifications } from '../../composables/notifications/useRealtimeNotifications.js'

const route = useRoute()
const router = useRouter()
const activePageRef = ref(null)
const createToken = ref(0)
const calendarViewMode = ref('month')
const isCommandPaletteOpen = ref(false)
const paletteQuery = ref('')
const { notifications, dismiss, notify } = useNotification()
const { start: startOnboarding } = useOnboarding()
const { isEnabled: budgetEnabled } = useBudgetSettings()
const { isEnabled: timeTrackingEnabled } = useTimeTrackingSettings()
const { runDailyAutoBackup } = useAutoBackup()
const {
  start: startLocalEventReminders,
  stop: stopLocalEventReminders,
} = useLocalEventReminders()
const {
  start: startRealtimeNotifications,
  stop: stopRealtimeNotifications,
} = useRealtimeNotifications()
useCalendarPreferences()
const currentUser = authStore.currentUser
const activeWorkspace = workspaceStore.activeWorkspace
const isAuthRoute = computed(() => route.name === 'login')
const isStandaloneRoute = computed(() => isAuthRoute.value || route.meta.standalone)
let onboardingTimer = null
const smartSuggestion = computed(() => parseSmartEvent(paletteQuery.value, {
  members: workspaceStore.activeWorkspaceMembers.value,
  calendars: calendarCollectionStore.activeCollections.value,
}))
const commands = computed(() => [
  { id: 'new-event', label: 'Новое событие', description: 'Открыть быстрое создание', icon: '＋', shortcut: 'N', action: openEventDrawer },
  { id: 'today', label: 'Перейти к сегодня', description: 'Вернуть календарь к текущей дате', icon: '◎', shortcut: 'T', action: goCalendarToday },
  { id: 'month', label: 'Режим месяца', description: 'Показать сетку месяца', icon: '▦', shortcut: 'M', action: () => setCalendarMode('month') },
  { id: 'week', label: 'Режим недели', description: 'Показать неделю', icon: '▤', shortcut: 'W', action: () => setCalendarMode('week') },
  { id: 'day', label: 'Режим дня', description: 'Показать расписание дня', icon: '◫', shortcut: 'D', action: () => setCalendarMode('day') },
  { id: 'analytics', label: 'Открыть аналитику', description: 'Нагрузка и категории', icon: '▥', action: () => router.push({ name: 'analytics' }) },
  { id: 'ideas', label: 'Открыть идеи', description: 'Копилка планов на свободное время', icon: '✦', action: () => router.push({ name: 'ideas' }) },
  ...(budgetEnabled.value ? [{ id: 'budget', label: 'Открыть бюджет', description: 'Доход и план расходов', icon: '₽', action: () => router.push({ name: 'budget' }) }] : []),
  ...(timeTrackingEnabled.value && readSubscriptionFeature('timeTracking') ? [{ id: 'time-tracking', label: 'Открыть учёт времени', description: 'Проекты и часы', icon: '◷', action: () => router.push({ name: 'time-tracking' }) }] : []),
  ...(readSubscriptionFeature('movies') ? [{ id: 'movies', label: 'Открыть фильмы', description: 'Поиск и список «Хочу посмотреть»', icon: '▶', action: () => router.push({ name: 'movies' }) }] : []),
  { id: 'birthdays', label: 'Открыть дни рождения', description: 'Возраст, подарки и напоминания', icon: '♡', action: () => router.push({ name: 'birthdays' }) },
  ...(readSubscriptionFeature('sport') ? [{ id: 'sport', label: 'Открыть спорт', description: 'Программа и прогресс', icon: 'sport', action: () => router.push({ name: 'sport' }) }] : []),
  { id: 'workspace', label: 'Открыть команду', description: 'Участники и приглашения', icon: '◇', action: () => router.push({ name: 'workspace' }) },
  { id: 'subscriptions', label: 'Открыть подписки', description: 'Тарифы Free, Plus и Pro', icon: '★', action: () => router.push({ name: 'subscriptions' }) },
  { id: 'settings', label: 'Открыть настройки', description: 'Профиль, вид и данные', icon: '⚙', action: () => router.push({ name: 'settings' }) },
  ...calendarStore.sortedEvents.value.slice(0, 12).map((event) => ({
    id: `event-${event.id}`,
    label: event.title,
    description: `${event.date}${event.startTime ? ` · ${event.startTime}` : ''}`,
    icon: '•',
    action: () => openEventById(event.id),
  })),
])

const goToCalendar = async (query = {}) => {
  await router.push({ name: 'calendar', query })
  await nextTick()
}

const goCalendarToday = async () => {
  await goToCalendar({ today: Date.now().toString() })
  activePageRef.value?.goToday?.()
}

const openEventDrawer = async () => {
  if (route.name !== 'calendar') await goToCalendar()
  createToken.value += 1
}

const setCalendarMode = async (mode) => {
  if (route.name !== 'calendar') await goToCalendar()
  await nextTick()
  activePageRef.value?.setViewMode?.(mode)
}

const openEventById = async (eventId) => {
  if (route.name !== 'calendar') await goToCalendar()
  await nextTick()
  activePageRef.value?.editEventById?.(eventId)
}

const toggleCalendarView = async () => {
  if (route.name !== 'calendar') await goToCalendar()
  await nextTick()
  activePageRef.value?.toggleDayMonthView?.()
}

function runCommand(command) {
  command.action?.()
}

async function createSmartEvent(eventData) {
  if (!eventData) return
  const { preview, ...data } = eventData
  const result = calendarStore.addEvent(data)
  if (!result.ok) {
    notify(Object.values(result.errors || {})[0] || 'Не удалось создать событие', 'danger')
    return
  }
  notify(`Событие «${data.title}» создано`, 'success')
  if (route.name !== 'calendar') await router.push({ name: 'calendar' })
}

function runNotificationAction(notification) {
  notification.action?.()
  dismiss(notification.id)
}

function handleGlobalKeydown(event) {
  const target = event.target
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    isCommandPaletteOpen.value = !isCommandPaletteOpen.value
    return
  }

  if (event.key === '/' && !isTyping) {
    event.preventDefault()
    isCommandPaletteOpen.value = true
    return
  }

  if (isTyping || event.ctrlKey || event.metaKey || event.altKey) return
  const key = event.key.toLowerCase()
  if (key === 'n') openEventDrawer()
  if (key === 't') goCalendarToday()
  if (key === 'm') setCalendarMode('month')
  if (key === 'w') setCalendarMode('week')
  if (key === 'd') setCalendarMode('day')
}

function handleBackendSyncError(event) {
  notify(`Ошибка синхронизации: ${event.detail?.message || 'проверь подключение к Supabase'}`, 'danger')
}

function handleBackendSyncComplete() {
  notify('Офлайн-изменения синхронизированы', 'success')
}

onMounted(() => {
  runDailyAutoBackup()
  document.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('backend-sync-error', handleBackendSyncError)
  window.addEventListener('backend-sync-complete', handleBackendSyncComplete)
})

watch([currentUser, isAuthRoute], async ([user, authRoute]) => {
  window.clearTimeout(onboardingTimer)
  if (!user || authRoute) {
    stopLocalEventReminders()
    await stopRealtimeNotifications()
    return
  }
  startLocalEventReminders()
  await startRealtimeNotifications()
  onboardingTimer = window.setTimeout(() => startOnboarding(), 650)
}, { immediate: true })

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('backend-sync-error', handleBackendSyncError)
  window.removeEventListener('backend-sync-complete', handleBackendSyncComplete)
  stopLocalEventReminders()
  stopRealtimeNotifications()
  window.clearTimeout(onboardingTimer)
})
</script>

<style scoped>
.default-layout {
  min-height: 100vh;
}

:global(.page-shift-enter-active) {
  animation: pageShiftIn 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  will-change: transform, opacity;
}

:global(.page-shift-leave-active) {
  animation: pageShiftOut 0.06s cubic-bezier(0.4, 0, 1, 1) both;
  transform-origin: center 18%;
  will-change: transform, opacity;
}

@keyframes pageShiftIn {
  from {
    opacity: 0;
    transform: translate3d(0, 18px, 0) scale(0.995);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes pageShiftOut {
  from {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    opacity: 0;
    transform: translate3d(0, -4px, 0) scale(0.985);
  }
}

.default-layout__body {
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
}

.backend-error {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 14px 0;
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: var(--radius-lg);
  padding: 10px 12px;
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 7%, var(--card-solid));
}

.backend-error span {
  color: var(--text-secondary);
  font-size: 11px;
}

.toast-stack {
  position: fixed;
  right: 14px;
  bottom: 14px;
  z-index: 70;
  display: grid;
  gap: 9px;
  pointer-events: none;
}

.toast-stack :deep(.app-toast) {
  pointer-events: auto;
}

:global(.toast-list-enter-active) {
  animation: toastEnter .44s cubic-bezier(.22, 1, .36, 1) both;
}

:global(.toast-list-leave-active) {
  position: absolute;
  right: 0;
  animation: toastLeave .3s cubic-bezier(.4, 0, 1, 1) both;
}

:global(.toast-list-move) {
  transition: transform .34s var(--ease-out);
}

@keyframes toastEnter {
  0% { opacity: 0; transform: translate3d(34px, 12px, 0) scale(.86); filter: blur(5px); }
  62% { opacity: 1; transform: translate3d(-4px, 0, 0) scale(1.015); filter: blur(0); }
  100% { opacity: 1; transform: none; }
}

@keyframes toastLeave {
  0% { opacity: 1; transform: scale(1); max-height: 150px; }
  55% { opacity: 0; transform: translateX(32px) scale(.92); max-height: 150px; }
  100% { opacity: 0; transform: translateX(45px) scale(.82); max-height: 0; margin: -5px 0; }
}

.quick-create {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 42px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  padding: 0 15px 0 11px;
  color: var(--text-inverse);
  background: var(--accent);
  box-shadow: var(--shadow-md);
  font-weight: 800;
  transition: transform 0.18s var(--ease-out), box-shadow 0.18s var(--ease-out);
}

.quick-create:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.quick-create span { font-size: 20px; }

@media (max-width: 860px) {
  .default-layout__body {
    display: block;
    padding-bottom: 76px;
  }

  .quick-create {
    right: 12px;
    bottom: 78px;
  }

  .quick-create b {
    display: none;
  }

  .toast-stack {
    right: 10px;
    bottom: 82px;
  }
}

@media (prefers-reduced-motion: reduce) {
  :global(.page-shift-enter-active),
  :global(.page-shift-leave-active) {
    animation-duration: 0.01ms;
  }

  :global(.toast-list-enter-active),
  :global(.toast-list-leave-active) {
    animation-duration: .01ms;
  }
}
</style>
