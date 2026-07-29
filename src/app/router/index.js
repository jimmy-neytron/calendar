import { createRouter, createWebHistory } from 'vue-router'
import { authStore } from '../stores/auth.store.js'
import { workspaceStore } from '../stores/workspace.store.js'
import { loadWorkspaceData } from '../services/backend/workspaceData.service.js'
import { readActivityLogSetting } from '../composables/preferences/useActivityLogSettings.js'
import { loadWorkspaceFeatures, readBudgetSetting } from '../composables/preferences/useBudgetSettings.js'
import { readExtraSectionsSetting } from '../composables/preferences/useExtraSectionsSettings.js'
import { readSubscriptionFeature } from '../composables/preferences/useSubscriptionSettings.js'
import { adminPageLoaders, adminRoutes } from '../modules/admin/routes.js'

const LoginPage = () => import('../pages/auth/LoginPage.vue')
const IndexPage = () => import('../pages/index/IndexPage.vue')
const SettingsPage = () => import('../pages/settings/SettingsPage.vue')
const IntegrationsPage = () => import('../modules/integrations/pages/IntegrationsPage.vue')
const FullFocusPage = () => import('../modules/full-focus/pages/FullFocusPage.vue')
const BudgetPage = () => import('../pages/budget/BudgetPage.vue')
const WorkspacePage = () => import('../pages/workspace/WorkspacePage.vue')
const AnalyticsPage = () => import('../pages/analytics/AnalyticsPage.vue')
const AnalyticsDetailPage = () => import('../pages/analytics/AnalyticsDetailPage.vue')
const IdeasPage = () => import('../pages/ideas/IdeasPage.vue')
const BirthdaysPage = () => import('../pages/birthdays/BirthdaysPage.vue')
const FamilyTreePage = () => import('../pages/family-tree/FamilyTreePage.vue')
const SportPage = () => import('../pages/sport/SportPage.vue')
const ActivityPage = () => import('../pages/activity/ActivityPage.vue')
const MoviesPage = () => import('../pages/movies/MoviesPage.vue')
const DayDisplayPage = () => import('../pages/display/DayDisplayPage.vue')
const TimeTrackingPage = () => import('../pages/time-tracking/TimeTrackingPage.vue')
const TimeProjectPage = () => import('../pages/time-tracking/TimeProjectPage.vue')
const NotFoundPage = () => import('../pages/not-found/NotFoundPage.vue')
const protectedPageLoaders = [
  IndexPage, ...adminPageLoaders, SettingsPage, IntegrationsPage, FullFocusPage, BudgetPage, WorkspacePage, AnalyticsPage, AnalyticsDetailPage,
  IdeasPage, BirthdaysPage, FamilyTreePage, SportPage, ActivityPage, MoviesPage, DayDisplayPage, TimeTrackingPage,
  TimeProjectPage,
]
let pagesPreloaded = false

export const routes = [
  { path: '/login', name: 'login', component: LoginPage, meta: { title: 'Вход', public: true } },
  { path: '/', name: 'calendar', component: IndexPage, meta: { title: 'Календарь' } },
  ...adminRoutes,
  { path: '/display', name: 'day-display', component: DayDisplayPage, meta: { title: 'Экран дня', standalone: true } },
  { path: '/budget', name: 'budget', component: BudgetPage, meta: { title: 'Бюджет', requiresBudget: true } },
  { path: '/sport', name: 'sport', component: SportPage, meta: { title: 'Спорт', requiresExtraSections: true, requiresSubscriptionFeature: 'sport' } },
  { path: '/sport/focus', name: 'sport-focus', component: FullFocusPage, meta: { title: 'Full Focus', requiresExtraSections: true, requiresSubscriptionFeature: 'sport' } },
  { path: '/time', name: 'time-tracking', component: TimeTrackingPage, meta: { title: 'Учёт времени', requiresExtraSections: true, requiresSubscriptionFeature: 'timeTracking' } },
  { path: '/time/projects/:projectId', name: 'time-project', component: TimeProjectPage, meta: { title: 'Проект · Учёт времени', requiresExtraSections: true, requiresSubscriptionFeature: 'timeTracking' } },
  { path: '/settings', name: 'settings', component: SettingsPage, meta: { title: 'Настройки' } },
  { path: '/integrations', name: 'integrations', component: IntegrationsPage, meta: { title: 'Интеграции', requiresSubscriptionFeature: 'integrations' } },
  { path: '/integrations/:integrationId', name: 'integration-detail', component: IntegrationsPage, meta: { title: 'Интеграция', requiresSubscriptionFeature: 'integrations' } },
  { path: '/full-focus', redirect: '/sport/focus' },
  { path: '/subscriptions', redirect: '/settings' },
  { path: '/workspace', name: 'workspace', component: WorkspacePage, meta: { title: 'Пространство', requiresSubscriptionFeature: 'workspace' } },
  { path: '/analytics', name: 'analytics', component: AnalyticsPage, meta: { title: 'Аналитика', requiresSubscriptionFeature: 'analytics' } },
  { path: '/analytics/calendar', name: 'analytics-calendar', component: AnalyticsDetailPage, meta: { title: 'Аналитика календаря', analyticsSection: 'calendar', requiresSubscriptionFeature: 'analytics' } },
  { path: '/analytics/activity', name: 'analytics-activity', component: AnalyticsDetailPage, meta: { title: 'Аналитика активности', analyticsSection: 'activity', requiresActivityLog: true, requiresSubscriptionFeature: 'analytics' } },
  { path: '/analytics/sport', name: 'analytics-sport', component: AnalyticsDetailPage, meta: { title: 'Аналитика спорта', analyticsSection: 'sport', requiresExtraSections: true, requiresSubscriptionFeature: 'analytics' } },
  { path: '/analytics/movies', name: 'analytics-movies', component: AnalyticsDetailPage, meta: { title: 'Аналитика фильмов', analyticsSection: 'movies', requiresExtraSections: true, requiresSubscriptionFeature: 'analytics' } },
  { path: '/analytics/ideas', name: 'analytics-ideas', component: AnalyticsDetailPage, meta: { title: 'Аналитика идей', analyticsSection: 'ideas', requiresSubscriptionFeature: 'analytics' } },
  { path: '/analytics/birthdays', name: 'analytics-birthdays', component: AnalyticsDetailPage, meta: { title: 'Аналитика дней рождения', analyticsSection: 'birthdays', requiresSubscriptionFeature: 'analytics' } },
  { path: '/activity', name: 'activity', component: ActivityPage, meta: { title: 'Активность', requiresActivityLog: true, requiresSubscriptionFeature: 'activity' } },
  { path: '/ideas', name: 'ideas', component: IdeasPage, meta: { title: 'Идеи' } },
  { path: '/birthdays', name: 'birthdays', component: BirthdaysPage, meta: { title: 'Дни рождения' } },
  { path: '/family-tree', name: 'family-tree', component: FamilyTreePage, meta: { title: 'Семейное дерево', requiresExtraSections: true, requiresSubscriptionFeature: 'extraSections' } },
  { path: '/movies', name: 'movies', component: MoviesPage, meta: { title: 'Фильмы и сериалы', requiresExtraSections: true, requiresSubscriptionFeature: 'movies' } },
  { path: '/spaces', redirect: '/workspace' },
  { path: '/chores', redirect: '/' },
  { path: '/meals', redirect: '/ideas' },
  { path: '/lists', redirect: '/' },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundPage, meta: { title: 'Страница не найдена' } },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path === from.path) return false
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  await authStore.initialize()
  if (!to.meta.public && !authStore.isAuthenticated.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (!to.meta.public) {
    const profile = await authStore.refreshCurrentUser()
    if (profile.blocked || !authStore.isAuthenticated.value) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  if (to.meta.requiresActivityLog && !readActivityLogSetting()) {
    return { name: 'settings' }
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin.value) {
    return { name: 'settings' }
  }

  if (to.meta.requiresSubscriptionFeature && !readSubscriptionFeature(to.meta.requiresSubscriptionFeature)) {
    return { name: 'settings' }
  }

  if (to.name === 'login' && authStore.isAuthenticated.value) {
    const workspace = await workspaceStore.ensureActiveWorkspace()
    if (workspace) await loadWorkspaceData(workspace.id)
    return { name: 'calendar' }
  }

  if (!to.meta.public) {
    const workspace = workspaceStore.activeWorkspace.value
      || await workspaceStore.ensureActiveWorkspace()
    if (workspace) await loadWorkspaceFeatures(workspace.id)
    if (to.meta.requiresExtraSections && !readExtraSectionsSetting()) {
      return { name: 'settings' }
    }
    if (to.meta.requiresBudget && !readBudgetSetting()) {
      return { name: 'settings' }
    }
    if (workspace) await loadWorkspaceData(workspace.id)
  }

  return true
})

router.afterEach((to) => {
  document.title = `${to.meta.title || 'Календарь'} · Пространство`
  if (!to.meta.public) preloadProtectedPages()
})

function preloadProtectedPages() {
  if (pagesPreloaded) return
  pagesPreloaded = true
  const preload = () => Promise.allSettled(protectedPageLoaders.map((load) => load()))
  if ('requestIdleCallback' in window) window.requestIdleCallback(preload, { timeout: 1800 })
  else window.setTimeout(preload, 350)
}
