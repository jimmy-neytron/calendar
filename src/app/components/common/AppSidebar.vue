<template>
  <aside class="app-sidebar">
    <div class="app-sidebar__context">
      <span class="app-sidebar__mark">{{ workspaceInitial }}</span>
      <div>
        <small>Пространство</small>
        <strong>{{ activeWorkspace?.name || 'Календарь' }}</strong>
      </div>
    </div>

    <nav v-for="group in visibleGroups" :key="group.label" class="app-sidebar__group">
      <span class="app-sidebar__label">{{ group.label }}</span>
      <RouterLink
        v-for="item in group.items"
        :key="item.name"
        class="app-sidebar__item"
        :to="{ name: item.name }"
        :title="item.label"
      >
        <span class="app-sidebar__icon"><UiIcon :name="item.icon" /></span>
        <span class="app-sidebar__copy">
          <b>{{ item.label }}</b>
          <small>{{ item.description }}</small>
        </span>
        <i><UiIcon name="right" /></i>
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { workspaceStore } from '../../stores/workspace.store.js'
import { useActivityLogSettings } from '../../composables/preferences/useActivityLogSettings.js'
import UiIcon from '../ui/UiIcon.vue'

const activeWorkspace = workspaceStore.activeWorkspace
const { isEnabled: activityLogEnabled } = useActivityLogSettings()
const workspaceInitial = computed(() => activeWorkspace.value?.name?.slice(0, 1).toUpperCase() || 'К')

const groups = [
  {
    label: 'Планирование',
    items: [
      { name: 'calendar', label: 'Календарь', description: 'События и расписание', icon: 'calendar' },
      { name: 'budget', label: 'Бюджет', description: 'Доходы и план расходов', icon: 'wallet' },
      { name: 'birthdays', label: 'Дни рождения', description: 'Подарки и напоминания', icon: 'heart' },
      { name: 'ideas', label: 'Идеи', description: 'Планы на потом', icon: 'sparkles' },
      { name: 'sport', label: 'Спорт', description: 'Программа и прогресс', icon: 'sport' },
      { name: 'movies', label: 'Фильмы', description: 'Найти и посмотреть позже', icon: 'movie' },
    ],
  },
  {
    label: 'Пространство',
    items: [
      { name: 'workspace', label: 'Команда', description: 'Люди и доступ', icon: 'users' },
      { name: 'analytics', label: 'Аналитика', description: 'Ритм и нагрузка', icon: 'chart' },
      { name: 'activity', label: 'Активность', description: 'История изменений', icon: 'activity' },
      { name: 'settings', label: 'Настройки', description: 'Профиль и приложение', icon: 'settings' },
    ],
  },
]

const visibleGroups = computed(() => groups.map((group) => ({
  ...group,
  items: group.items.filter((item) => item.name !== 'activity' || activityLogEnabled.value),
})))
</script>

<style scoped>
.app-sidebar {
  position: sticky;
  top: var(--header-height);
  height: calc(100vh - var(--header-height));
  width: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 14px 12px;
  border-right: 1px solid var(--border-color);
  background: var(--sidebar-bg);
  overflow-y: auto;
}

.app-sidebar__context {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 10px;
  background: var(--card-soft);
}

.app-sidebar__mark {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: var(--text-inverse);
  background: var(--accent);
  font-weight: 900;
}

.app-sidebar__context div,
.app-sidebar__copy {
  min-width: 0;
}

.app-sidebar__context small,
.app-sidebar__context strong,
.app-sidebar__copy b,
.app-sidebar__copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-sidebar__context small,
.app-sidebar__copy small {
  color: var(--text-muted);
  font-size: 10px;
}

.app-sidebar__group {
  display: grid;
  gap: 5px;
}

.app-sidebar__label {
  padding: 0 8px 3px;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.app-sidebar__item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  min-height: 48px;
  border: 1px solid transparent;
  border-radius: 13px;
  padding: 6px 8px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: 0.18s var(--ease-out);
}

.app-sidebar__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: var(--text-secondary);
  background: var(--control-bg);
  font-size: 16px;
  font-weight: 800;
}

.app-sidebar__copy b {
  color: var(--text-primary);
  font-size: 12px;
}

.app-sidebar__item i {
  color: var(--text-muted);
  font-style: normal;
  opacity: 0;
}

.app-sidebar__item:hover {
  border-color: var(--border-color);
  background: var(--control-bg);
  transform: translateX(2px);
}

.app-sidebar__item.router-link-active {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.app-sidebar__item.router-link-active .app-sidebar__icon {
  color: var(--text-inverse);
  background: var(--accent);
}

.app-sidebar__item.router-link-active i {
  opacity: 1;
}

@media (max-width: 860px) {
  .app-sidebar {
    position: fixed;
    z-index: 25;
    left: 50%;
    bottom: 10px;
    top: auto;
    width: auto;
    max-width: calc(100vw - 16px);
    height: 58px;
    flex-direction: row;
    gap: 3px;
    padding: 6px;
    border: 1px solid var(--border-color);
    border-radius: 18px;
    background: var(--sidebar-floating-bg);
    backdrop-filter: blur(18px);
    box-shadow: var(--shadow-md);
    transform: translateX(-50%);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .app-sidebar__context,
  .app-sidebar__label {
    display: none;
  }

  .app-sidebar__group {
    display: flex;
    gap: 3px;
  }

  .app-sidebar__item {
    display: grid;
    grid-template-columns: 1fr;
    min-width: 46px;
    min-height: 44px;
    padding: 5px;
  }

  .app-sidebar__icon {
    width: 34px;
    height: 34px;
  }

  .app-sidebar__copy,
  .app-sidebar__item i {
    display: none;
  }
}
</style>
