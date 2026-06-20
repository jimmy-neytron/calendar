<template>
  <aside class="app-sidebar">
    <RouterLink
      v-for="item in items"
      :key="item.name"
      class="app-sidebar__item"
      :to="{ name: item.name }"
      :title="item.label"
    >
      <span>{{ item.icon }}</span>
      <b>{{ item.label }}</b>
    </RouterLink>
  </aside>
</template>

<script setup>
const items = [
  { name: 'calendar', label: 'Календарь', icon: '📅' },
  { name: 'sport', label: 'Спорт', icon: '🏋️' },
  { name: 'settings', label: 'Настройки', icon: '⚙️' },
]
</script>

<style scoped>
.app-sidebar {
  position: sticky;
  top: var(--header-height);
  height: calc(100vh - var(--header-height));
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: var(--sidebar-width);
  padding: 12px 10px;
  border-right: 1px solid var(--border-color);
  background: var(--sidebar-bg);
}

.app-sidebar__item {
  display: grid;
  place-items: center;
  gap: 4px;
  min-height: 48px;
  border: 1px solid transparent;
  border-radius: 13px;
  color: var(--text-muted);
  background: transparent;
  text-decoration: none;
  transition: all 0.18s var(--ease-out);
}

.app-sidebar__item span {
  font-size: 17px;
}

.app-sidebar__item b {
  font-size: 9px;
}

.app-sidebar__item:hover,
.app-sidebar__item.router-link-active {
  color: var(--text-primary);
  border-color: var(--border-strong);
  background: var(--control-bg-hover);
}

@media (max-width: 860px) {
  .app-sidebar {
    position: fixed;
    z-index: 25;
    left: 50%;
    right: auto;
    bottom: 12px;
    top: auto;
    width: auto;
    height: 54px;
    flex-direction: row;
    padding: 6px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    background: var(--sidebar-floating-bg);
    backdrop-filter: blur(16px);
    box-shadow: var(--shadow-md);
    transform: translateX(-50%);
  }

  .app-sidebar__item {
    min-width: 46px;
    min-height: 42px;
    border-radius: 12px;
  }

  .app-sidebar__item b {
    display: none;
  }
}
</style>
