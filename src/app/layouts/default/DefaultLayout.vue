<template>
  <RouterView v-if="isAuthRoute" v-slot="{ Component }">
    <transition name="fade" mode="out-in">
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

    <div class="default-layout__body">
      <AppSidebar />
      <AppContainer>
        <RouterView v-slot="{ Component }">
          <component
            :is="Component"
            :key="$route.name"
            ref="activePageRef"
            :force-create-token="createToken"
            @view-mode-change="calendarViewMode = $event"
          />
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
      @run="runCommand"
    />

    <div class="toast-stack">
      <transition-group name="list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="toast"
          :class="`toast--${notification.type}`"
        >
          {{ notification.message }}
          <button
            v-if="notification.action"
            type="button"
            @click="runNotificationAction(notification)"
          >
            {{ notification.actionLabel || 'Отменить' }}
          </button>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppContainer from '../../components/common/AppContainer.vue'
import AppHeader from '../../components/common/AppHeader.vue'
import AppSidebar from '../../components/common/AppSidebar.vue'
import CommandPalette from '../../components/common/CommandPalette.vue'
import { useNotification } from '../../composables/ui/useNotification.js'
import { useAutoBackup } from '../../composables/storage/useAutoBackup.js'
import { authStore } from '../../stores/auth.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'
import { calendarStore } from '../../stores/calendar.store.js'
import { useCalendarPreferences } from '../../composables/preferences/useCalendarPreferences.js'
import { useLocalReminders } from '../../composables/notifications/useLocalReminders.js'

const route = useRoute()
const router = useRouter()
const activePageRef = ref(null)
const createToken = ref(0)
const calendarViewMode = ref('month')
const isCommandPaletteOpen = ref(false)
const { notifications, dismiss } = useNotification()
const { runDailyAutoBackup } = useAutoBackup()
const { start: startLocalReminders, stop: stopLocalReminders } = useLocalReminders()
useCalendarPreferences()
const currentUser = authStore.currentUser
const activeWorkspace = workspaceStore.activeWorkspace
const isAuthRoute = computed(() => route.name === 'login')
const commands = computed(() => [
  { id: 'new-event', label: 'Новое событие', description: 'Открыть быстрое создание', icon: '＋', shortcut: 'N', action: openEventDrawer },
  { id: 'today', label: 'Перейти к сегодня', description: 'Вернуть календарь к текущей дате', icon: '◎', shortcut: 'T', action: goCalendarToday },
  { id: 'month', label: 'Режим месяца', description: 'Показать сетку месяца', icon: '▦', shortcut: 'M', action: () => setCalendarMode('month') },
  { id: 'week', label: 'Режим недели', description: 'Показать неделю', icon: '▤', shortcut: 'W', action: () => setCalendarMode('week') },
  { id: 'day', label: 'Режим дня', description: 'Показать расписание дня', icon: '◫', shortcut: 'D', action: () => setCalendarMode('day') },
  { id: 'analytics', label: 'Открыть аналитику', description: 'Нагрузка и категории', icon: '▥', action: () => router.push({ name: 'analytics' }) },
  { id: 'workspace', label: 'Открыть команду', description: 'Участники и приглашения', icon: '◇', action: () => router.push({ name: 'workspace' }) },
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

onMounted(() => {
  runDailyAutoBackup()
  startLocalReminders()
  document.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
  stopLocalReminders()
})
</script>

<style scoped>
.default-layout {
  min-height: 100vh;
}

.default-layout__body {
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
}

.toast-stack {
  position: fixed;
  right: 14px;
  bottom: 14px;
  z-index: 70;
  display: grid;
  gap: 8px;
}

.toast {
  min-width: 220px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 10px 12px;
  background: var(--toast-bg);
  box-shadow: var(--shadow-md);
  color: var(--text-primary);
}

.toast--success { border-color: rgba(34, 197, 94, 0.35); }
.toast--danger { border-color: rgba(239, 68, 68, 0.35); }
.toast--info { border-color: var(--accent-border); }
.toast--warning { border-color: rgba(234, 179, 8, 0.35); }

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

.toast button {
  margin-left: 12px;
  border: 0;
  color: var(--text-primary);
  background: transparent;
  font-weight: 850;
  text-decoration: underline;
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
}
</style>
