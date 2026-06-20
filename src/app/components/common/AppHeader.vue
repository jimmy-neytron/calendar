<template>
  <header class="app-header">
    <div class="app-header__brand">
      <button class="app-header__logo" type="button" @click="$emit('open-settings')">✦</button>
      <div>
        <strong>Календарь</strong>
        <span>{{ activeWorkspace?.name || 'Пространство' }}</span>
      </div>
    </div>

    <div class="app-header__center">
      <button class="app-header__date" type="button" @click="$emit('today')">
        <span>{{ weekday }}</span>
        <b>{{ currentDate }}</b>
      </button>
    </div>

    <div class="app-header__actions">
      <select
        class="app-header__workspace"
        :value="activeWorkspace?.id"
        aria-label="Пространство"
        @change="$emit('switch-workspace', $event.target.value)"
      >
        <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">
          {{ workspace.name }}
        </option>
      </select>
      <UiButton variant="secondary" icon="☀" @click="$emit('day-mode')">День</UiButton>
      <UiButton icon="＋" @click="$emit('create-event')">Событие</UiButton>
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
  workspaces: { type: Array, default: () => [] },
})

defineEmits(['create-event', 'today', 'day-mode', 'switch-workspace', 'open-settings'])

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
}

.app-header__brand strong,
.app-header__brand span {
  display: block;
}

.app-header__brand strong {
  white-space: nowrap;
  font-size: 13px;
}

.app-header__brand span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 600;
}

.app-header__logo,
.app-header__user {
  display: grid;
  place-items: center;
  border: 1px solid var(--border-color);
  background: var(--control-bg-solid);
  color: var(--text-primary);
  text-decoration: none;
}

.app-header__logo {
  width: 30px;
  height: 30px;
  border-radius: 9px;
}

.app-header__user {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-weight: 800;
  font-size: 12px;
}

.app-header__center {
  justify-self: center;
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

.app-header__workspace {
  max-width: 150px;
  height: 30px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 0 9px;
  color: var(--text-primary);
  background: var(--control-bg-solid);
  outline: none;
  font-size: 12px;
}

@media (max-width: 900px) {
  .app-header {
    grid-template-columns: 1fr auto;
    gap: 8px;
    padding: 7px 10px;
  }

  .app-header__center {
    display: none;
  }
}

@media (max-width: 620px) {
  .app-header__brand span,
  .app-header__actions .ui-button:first-of-type,
  .app-header__workspace {
    display: none;
  }

  .app-header__brand strong {
    font-size: 12px;
  }
}
</style>
