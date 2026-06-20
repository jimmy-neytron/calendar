<template>
  <header class="app-header">
    <RouterLink class="app-header__brand" :to="{ name: 'calendar' }">
      <span class="app-header__logo">✦</span>
      <span>
        <strong>Календарь</strong>
        <small>{{ activeWorkspace?.name || 'Пространство' }}</small>
      </span>
    </RouterLink>

    <button class="app-header__date" type="button" @click="$emit('today')">
      <span>{{ weekday }}</span>
      <b>{{ currentDate }}</b>
    </button>

    <div class="app-header__actions">
      <UiButton
        v-if="isCalendarRoute"
        variant="secondary"
        :icon="viewMode === 'day' ? '▦' : '◫'"
        @click="$emit('toggle-calendar-view')"
      >
        {{ viewMode === 'day' ? 'Месяц' : 'День' }}
      </UiButton>
      <NotificationBell />
      <RouterLink class="app-header__user" :to="{ name: 'settings' }" :title="currentUser?.email">
        {{ currentUser?.avatar || '?' }}
      </RouterLink>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import UiButton from '../ui/UiButton.vue'
import NotificationBell from '../notifications/NotificationBell.vue'

defineProps({
  currentUser: { type: Object, default: null },
  activeWorkspace: { type: Object, default: null },
  isCalendarRoute: { type: Boolean, default: false },
  viewMode: { type: String, default: 'month' },
})

defineEmits(['today', 'toggle-calendar-view'])

const now = new Date()
const weekday = computed(() => new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(now))
const currentDate = computed(() => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(now))
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: var(--header-height);
  padding: 7px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--header-bg);
  backdrop-filter: blur(16px);
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--text-primary);
  text-decoration: none;
}

.app-header__brand > span:last-child,
.app-header__brand strong,
.app-header__brand small {
  display: block;
}

.app-header__brand strong {
  font-size: 13px;
}

.app-header__brand small {
  color: var(--text-muted);
  font-size: 10px;
}

.app-header__logo,
.app-header__user {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  color: var(--text-primary);
  background: var(--control-bg-solid);
}

.app-header__date {
  min-width: 124px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 3px 10px;
  color: var(--text-primary);
  background: var(--control-bg);
}

.app-header__date span,
.app-header__date b {
  display: block;
  text-transform: capitalize;
}

.app-header__date span {
  color: var(--text-muted);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.app-header__actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
}

.app-header__user {
  border-radius: 50%;
  text-decoration: none;
  font-size: 12px;
  font-weight: 800;
}

@media (max-width: 900px) {
  .app-header {
    grid-template-columns: 1fr auto;
  }

  .app-header__date {
    display: none;
  }
}

@media (max-width: 620px) {
  .app-header__brand small,
  .app-header__actions .ui-button {
    display: none;
  }
}
</style>
