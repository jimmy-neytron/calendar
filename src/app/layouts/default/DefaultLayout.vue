<template>
  <RouterView v-if="isAuthRoute" v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" :key="$route.fullPath" />
    </transition>
  </RouterView>

  <div v-else class="default-layout">
    <AppHeader
      :current-user="currentUser"
      :active-workspace="activeWorkspace"
      :workspaces="currentUserSpaces"
      @create-event="openEventModal"
      @today="goCalendarToday"
      @day-mode="enableCalendarDayMode"
      @switch-workspace="switchWorkspace"
      @open-settings="router.push({ name: 'settings' })"
          />

    <div class="default-layout__body">
      <AppSidebar />
      <AppContainer>
        <RouterView v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component
              :is="Component"
              :key="$route.fullPath"
              ref="activePageRef"
              :force-create-token="createToken"
            />
          </transition>
        </RouterView>
      </AppContainer>
    </div>

    <div class="toast-stack">
      <transition-group name="list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="toast"
          :class="`toast--${notification.type}`"
        >
          {{ notification.message }}
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppContainer from '../../components/common/AppContainer.vue'
import AppHeader from '../../components/common/AppHeader.vue'
import AppSidebar from '../../components/common/AppSidebar.vue'
import { useNotification } from '../../composables/ui/useNotification.js'
import { useAutoBackup } from '../../composables/storage/useAutoBackup.js'
import { authStore } from '../../stores/auth.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'
import { useCalendarPreferences } from '../../composables/preferences/useCalendarPreferences.js'

const route = useRoute()
const router = useRouter()
const activePageRef = ref(null)
const createToken = ref(0)
const { notifications, notify } = useNotification()
const { runDailyAutoBackup } = useAutoBackup()
useCalendarPreferences()
const currentUser = authStore.currentUser
const activeWorkspace = workspaceStore.activeWorkspace
const currentUserSpaces = workspaceStore.currentUserSpaces
const isAuthRoute = computed(() => route.name === 'login')

const goToCalendar = async (query = {}) => {
  await router.push({ name: 'calendar', query })
  await nextTick()
}

const openEventModal = async () => {
  createToken.value += 1
  await goToCalendar()
}

const goCalendarToday = async () => {
  await goToCalendar({ today: Date.now().toString() })
  activePageRef.value?.goToday?.()
}

const enableCalendarDayMode = async () => {
  await goToCalendar({ mode: 'day', t: Date.now().toString() })
  activePageRef.value?.enableDayMode?.()
  notify('Режим дня включён', 'success')
}

const switchWorkspace = async (workspaceId) => {
  if (!workspaceStore.switchWorkspace(workspaceId)) return
  await router.push({ name: 'calendar' })
  notify('Пространство переключено', 'success')
}

onMounted(() => {
  runDailyAutoBackup()
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

@media (max-width: 860px) {
  .default-layout__body {
    display: block;
    padding-bottom: 76px;
  }
}
</style>
