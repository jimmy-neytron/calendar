<template>
  <section class="admin-shell">
    <aside class="admin-shell__sidebar">
      <RouterLink class="admin-shell__brand" :to="{ name: 'admin-overview' }">
        <span><UiIcon name="key"/></span>
        <div>
          <small>Панель</small>
          <strong>Админка</strong>
        </div>
      </RouterLink>

      <nav class="admin-shell__nav" aria-label="Разделы админки">
        <RouterLink
            v-for="item in navItems"
            :key="item.name"
            class="admin-shell__link"
            :to="{ name: item.name }"
        >
          <span class="admin-shell__icon"><UiIcon :name="item.icon"/></span>
          <span class="admin-shell__copy">
            <b>{{ item.label }}</b>
            <small>{{ item.description }}</small>
          </span>
          <strong v-if="item.badge" class="admin-shell__badge">{{ item.badge }}</strong>
        </RouterLink>
      </nav>

      <RouterLink class="admin-shell__back" :to="{ name: 'calendar' }">
        <UiIcon name="left"/>
        В календарь
      </RouterLink>
    </aside>

    <main class="admin-shell__main">
      <header class="admin-shell__topbar">
        <div>
          <small>Администрирование</small>
          <strong>{{ activeTitle }}</strong>
        </div>
        <span v-if="unreadLeadCount" class="admin-shell__notice">
          {{ unreadLeadCount }} новых заявок
        </span>
      </header>

      <div class="admin-shell__content">
        <RouterView v-slot="{ Component }">
          <transition name="admin-page" appear mode="out-in">
            <component :is="Component"/>
          </transition>
        </RouterView>
      </div>
    </main>
  </section>
</template>

<script setup>
import {computed, onMounted} from 'vue'
import {RouterLink, RouterView, useRoute} from 'vue-router'
import UiIcon from '../../../components/ui/UiIcon.vue'
import {useAdminLeadNotifications} from '../composables/useAdminLeadNotifications.js'

const route = useRoute()
const {unreadLeadCount, startUnreadLeadPolling} = useAdminLeadNotifications()

const navItems = computed(() => [
  {
    name: 'admin-overview',
    label: 'Обзор',
    description: 'Главные метрики',
    icon: 'chart',
    badge: 0,
  },
  {
    name: 'admin-users',
    label: 'Пользователи',
    description: 'Роли, тарифы, блокировки',
    icon: 'users',
    badge: 0,
  },
  {
    name: 'admin-leads',
    label: 'Заявки',
    description: 'Лиды с landing page',
    icon: 'table',
    badge: unreadLeadCount.value,
  },
  {
    name: 'admin-modals',
    label: 'Модальные окна',
    description: 'Сообщения для всех',
    icon: 'grid',
    badge: 0,
  },
])
const activeTitle = computed(() => (
    navItems.value.find((item) => item.name === route.name)?.label || 'Админка'
))

onMounted(startUnreadLeadPolling)
</script>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns:270px minmax(0, 1fr);
  min-height: 100vh;
  color: var(--text-primary);
  background: var(--bg-primary)
}

.admin-shell__sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100vh;
  border-right: 1px solid var(--border-color);
  padding: 16px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--card-solid) 88%, var(--bg-primary)), var(--sidebar-bg))
}

.admin-shell__brand {
  display: grid;
  grid-template-columns:44px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px;
  color: var(--text-primary);
  background: var(--card-solid);
  text-decoration: none
}

.admin-shell__brand > span {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  color: var(--text-inverse);
  background: var(--accent);
  font-size: 20px
}

.admin-shell__brand small, .admin-shell__brand strong {
  display: block
}

.admin-shell__brand small, .admin-shell__topbar small {
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: .12em;
  text-transform: uppercase
}

.admin-shell__brand strong {
  margin-top: 2px;
  font-size: 18px
}

.admin-shell__nav {
  display: grid;
  gap: 6px
}

.admin-shell__link {
  display: grid;
  grid-template-columns:38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 9px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: background-color .16s var(--ease-out), border-color .16s var(--ease-out), color .16s var(--ease-out)
}

.admin-shell__link:hover {
  border-color: var(--border-color);
  background: var(--control-bg)
}

.admin-shell__link.router-link-active {
  border-color: var(--accent-border);
  color: var(--text-primary);
  background: var(--accent-soft)
}

.admin-shell__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  color: var(--text-secondary);
  background: var(--control-bg);
  font-size: 18px
}

.router-link-active .admin-shell__icon {
  color: var(--text-inverse);
  background: var(--accent)
}

.admin-shell__copy {
  min-width: 0
}

.admin-shell__copy b, .admin-shell__copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap
}

.admin-shell__copy small {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 10px
}

.admin-shell__badge, .admin-shell__notice {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  color: #fff;
  background: var(--danger);
  font-size: 10px;
  font-weight: 850
}

.admin-shell__back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px;
  color: var(--text-secondary);
  background: var(--control-bg);
  text-decoration: none;
  font-size: 12px;
  font-weight: 750
}

.admin-shell__main {
  display: grid;
  grid-template-rows:auto minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
  padding: 16px 18px 28px
}

.admin-shell__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 13px 15px;
  background: var(--card-solid);
  box-shadow: var(--shadow-sm)
}

.admin-shell__topbar strong {
  display: block;
  margin-top: 2px;
  font-size: 18px
}

.admin-shell__notice {
  width: auto;
  padding: 0 9px;
  background: var(--warning);
  white-space: nowrap
}

.admin-shell__content {
  position: relative;
  min-width: 0
}

.admin-page-enter-active {
  transition: opacity .2s var(--ease-out);
}

.admin-page-leave-active {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  transition: opacity .2s ease-in;
}

.admin-page-enter-from, .admin-page-leave-to {
  opacity: 0
}

@media (max-width: 860px) {
  .admin-shell {
    display: block;
    padding-bottom: 74px
  }

  .admin-shell__sidebar {
    position: fixed;
    z-index: 30;
    inset: auto 8px 8px;
    height: auto;
    display: grid;
    grid-template-columns:auto minmax(0, 1fr) auto;
    align-items: center;
    padding: 6px;
    border: 1px solid var(--border-color);
    border-radius: 16px;
    background: var(--sidebar-floating-bg);
    backdrop-filter: blur(18px);
    box-shadow: var(--shadow-md)
  }

  .admin-shell__brand {
    display: none
  }

  .admin-shell__nav {
    display: flex;
    gap: 5px;
    overflow-x: auto
  }

  .admin-shell__link {
    grid-template-columns:34px auto;
    min-width: 44px;
    padding: 5px
  }

  .admin-shell__copy {
    display: none
  }

  .admin-shell__back {
    margin: 0;
    padding: 8px
  }

  .admin-shell__main {
    padding: 12px
  }

  .admin-shell__topbar {
    align-items: flex-start
  }

  .admin-shell__notice {
    height: auto;
    min-height: 22px
  }
}

@media (max-width: 520px) {
  .admin-shell__topbar {
    display: grid
  }

  .admin-shell__back {
    font-size: 0
  }

  .admin-shell__back svg {
    font-size: 16px
  }
}
</style>
