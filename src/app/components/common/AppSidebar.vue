<template>
  <aside class="app-sidebar" aria-label="Основная навигация">
    <div class="app-sidebar__context">
      <span class="app-sidebar__mark">{{ workspaceInitial }}</span>
      <div>
        <small>Семейное пространство</small>
        <strong>{{ activeWorkspace?.name || 'Моя семья' }}</strong>
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
        <span class="app-sidebar__icon">
          <UiIcon :name="item.icon" />
          <b v-if="item.badge" class="app-sidebar__badge">{{ item.badge }}</b>
        </span>
        <span class="app-sidebar__copy">
          <b>{{ item.label }}</b>
          <small>{{ item.description }}</small>
        </span>
        <i><UiIcon name="right" /></i>
      </RouterLink>
    </nav>

    <div class="app-sidebar__actions">
      <button type="button" @click="isCustomizeOpen = true">
        <span><UiIcon name="settings" /></span>
        <b>Настроить меню</b>
      </button>
    </div>

    <nav class="app-sidebar__mobile" aria-label="Мобильная навигация">
      <RouterLink
        v-for="item in mobileItems"
        :key="item.name"
        :to="{ name: item.name }"
        :title="item.label"
      >
        <span>
          <UiIcon :name="item.icon" />
          <b v-if="item.badge" class="app-sidebar__badge">{{ item.badge }}</b>
        </span>
        <small>{{ item.label }}</small>
      </RouterLink>
      <button type="button" title="Все разделы" @click="isAllSectionsOpen = true">
        <span><UiIcon name="grid" /></span>
        <small>Ещё</small>
      </button>
    </nav>
  </aside>

  <AllSectionsModal
    v-model="isAllSectionsOpen"
    :groups="orderedAvailableGroups"
    :hidden-section-ids="hiddenSectionIds"
    @customize="openCustomizeFromCatalog"
  />

  <SidebarCustomizeModal
    v-model="isCustomizeOpen"
    :groups="availableGroups"
    :preferences="sidebarPreferences"
    :saving="sidebarSaving"
    :error="sidebarError"
    @save="setSidebarPreferences"
    @reset="resetSidebarPreferences"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { workspaceStore } from '../../stores/workspace.store.js'
import { useAdminLeadNotifications } from '../../modules/admin/composables/useAdminLeadNotifications.js'
import { useSidebarPreferences } from '../../composables/preferences/useSidebarPreferences'
import { useAvailableSections } from '../../composables/navigation/useAvailableSections'
import type { SidebarGroup, SidebarSection } from '../../navigation/sidebarSections'
import AllSectionsModal from './AllSectionsModal.vue'
import SidebarCustomizeModal from './SidebarCustomizeModal.vue'
import UiIcon from '../ui/UiIcon.vue'

const route = useRoute()
const activeWorkspace = workspaceStore.activeWorkspace
const { availableGroups } = useAvailableSections()
const { unreadLeadCount } = useAdminLeadNotifications()
const {
  preferences: sidebarPreferences,
  saving: sidebarSaving,
  error: sidebarError,
  setPreferences: setSidebarPreferences,
  reset: resetSidebarPreferences,
} = useSidebarPreferences()
const workspaceInitial = computed(() => activeWorkspace.value?.name?.slice(0, 1).toUpperCase() || 'К')
const isCustomizeOpen = ref(false)
const isAllSectionsOpen = ref(false)

const currentSidebarName = computed(() => {
  const routeName = String(route.name || '')
  if (routeName === 'time-project') return 'time-tracking'
  if (routeName === 'integration-detail') return 'integrations'
  if (routeName.startsWith('analytics-')) return 'analytics'
  return routeName
})

function withBadge(item: SidebarSection) {
  return {
    ...item,
    badge: item.name === 'admin-overview' ? unreadLeadCount.value : 0,
  }
}

function orderGroups(groups: SidebarGroup[]) {
  const order = sidebarPreferences.value.sectionOrder
  return groups.map((group) => ({
    ...group,
    items: [...group.items].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)),
  }))
}

const orderedAvailableGroups = computed(() => orderGroups(availableGroups.value))
const visibleGroups = computed(() => orderGroups(availableGroups.value)
  .map((group) => ({
    ...group,
    items: group.items
      .filter((item) => item.fixed || sidebarPreferences.value.visibleSectionIds.includes(item.name) || currentSidebarName.value === item.name)
      .map(withBadge),
  }))
  .filter((group) => group.items.length))

const hiddenSectionIds = computed(() => availableGroups.value
  .flatMap((group) => group.items)
  .filter((item) => !item.fixed && !sidebarPreferences.value.visibleSectionIds.includes(item.name))
  .map((item) => item.name))

const mobileItems = computed(() => {
  const available = orderedAvailableGroups.value.flatMap((group) => group.items)
  const byName = new Map(available.map((item) => [item.name, item]))
  const selected = sidebarPreferences.value.mobileFavoriteIds
    .map((id) => byName.get(id))
    .filter((item): item is SidebarSection => Boolean(item && (item.fixed || sidebarPreferences.value.visibleSectionIds.includes(item.name))))
  const fallback = selected.length ? selected : available.filter((item) => item.fixed || sidebarPreferences.value.visibleSectionIds.includes(item.name)).slice(0, 4)
  return fallback.slice(0, 4).map(withBadge)
})

function openCustomizeFromCatalog() {
  isAllSectionsOpen.value = false
  isCustomizeOpen.value = true
}

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
  position: relative;
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

.app-sidebar__badge {
  position: absolute;
  top: -6px;
  right: -6px;
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  border: 2px solid var(--sidebar-bg);
  border-radius: 999px;
  padding: 0 4px;
  color: #fff;
  background: var(--danger);
  font-size: 9px;
  line-height: 1;
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

.app-sidebar__actions {
  flex: 0 0 auto;
  margin-top: auto;
  padding-top: 4px;
}

.app-sidebar__actions button {
  width: 100%;
  display: grid;
  grid-template-columns: 30px 1fr;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  border: 1px solid transparent;
  border-radius: 11px;
  padding: 3px 7px;
  color: var(--text-muted);
  background: transparent;
  text-align: left;
}

.app-sidebar__actions button:hover {
  border-color: var(--border-color);
  color: var(--text-primary);
  background: var(--control-bg);
}

.app-sidebar__actions button span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: var(--control-bg);
}

.app-sidebar__actions button b { font-size: 10px; }
.app-sidebar__mobile { display: none; }

@media (max-width: 860px) {
  .app-sidebar {
    position: fixed;
    z-index: 25;
    left: 50%;
    bottom: 10px;
    top: auto;
    width: min(390px, calc(100vw - 16px));
    max-width: none;
    height: 64px;
    display: block;
    padding: 6px;
    border: 1px solid var(--border-color);
    border-radius: 18px;
    background: var(--sidebar-floating-bg);
    backdrop-filter: blur(18px);
    box-shadow: var(--shadow-md);
    transform: translateX(-50%);
    overflow: visible;
  }

  .app-sidebar__context,
  .app-sidebar__group,
  .app-sidebar__actions {
    display: none;
  }

  .app-sidebar__mobile {
    height: 100%;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 2px;
  }

  .app-sidebar__mobile>a,
  .app-sidebar__mobile>button {
    min-width: 0;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 2px;
    border: 0;
    border-radius: 12px;
    padding: 3px 2px;
    color: var(--text-muted);
    background: transparent;
    text-decoration: none;
  }

  .app-sidebar__mobile>a>span,
  .app-sidebar__mobile>button>span {
    position: relative;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 9px;
    font-size: 16px;
  }

  .app-sidebar__mobile small {
    max-width: 100%;
    overflow: hidden;
    font-size: 8px;
    font-weight: 750;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .app-sidebar__mobile>a.router-link-active {
    color: var(--accent);
    background: var(--accent-soft);
  }

  .app-sidebar__mobile>a.router-link-active>span {
    color: var(--text-inverse);
    background: var(--accent);
  }

  .app-sidebar__mobile .app-sidebar__badge { top: -5px; right: -8px; border-color: var(--sidebar-floating-bg); }
}
</style>
