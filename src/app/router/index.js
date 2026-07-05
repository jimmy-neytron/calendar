import { createRouter, createWebHistory } from 'vue-router'
import { authStore } from '../stores/auth.store.js'
import { workspaceStore } from '../stores/workspace.store.js'
import { loadWorkspaceData } from '../services/backend/workspaceData.service.js'
import { readActivityLogSetting } from '../composables/preferences/useActivityLogSettings.js'
import { loadWorkspaceFeatures, readBudgetSetting } from '../composables/preferences/useBudgetSettings.js'
import { readSubscriptionFeature } from '../composables/preferences/useSubscriptionSettings.js'
import { readTimeTrackingSetting } from '../composables/preferences/useTimeTrackingSettings.js'

const LoginPage = () => import('../pages/auth/LoginPage.vue')
const IndexPage = () => import('../pages/index/IndexPage.vue')
const AdminPage = () => import('../pages/admin/AdminPage.vue')
const AdminAnalyticsPage = () => import('../pages/admin/AdminAnalyticsPage.vue')
const AdminUsersPage = () => import('../pages/admin/AdminUsersPage.vue')
const AdminLeadsPage = () => import('../pages/admin/AdminLeadsPage.vue')
const SettingsPage = () => import('../pages/settings/SettingsPage.vue')
const BudgetPage = () => import('../pages/budget/BudgetPage.vue')
const WorkspacePage = () => import('../pages/workspace/WorkspacePage.vue')
const AnalyticsPage = () => import('../pages/analytics/AnalyticsPage.vue')
const AnalyticsDetailPage = () => import('../pages/analytics/AnalyticsDetailPage.vue')
const IdeasPage = () => import('../pages/ideas/IdeasPage.vue')
const BirthdaysPage = () => import('../pages/birthdays/BirthdaysPage.vue')
const SportPage = () => import('../pages/sport/SportPage.vue')
const ActivityPage = () => import('../pages/activity/ActivityPage.vue')
const MoviesPage = () => import('../pages/movies/MoviesPage.vue')
const DayDisplayPage = () => import('../pages/display/DayDisplayPage.vue')
const TimeTrackingPage = () => import('../pages/time-tracking/TimeTrackingPage.vue')
const TimeProjectPage = () => import('../pages/time-tracking/TimeProjectPage.vue')
const NotFoundPage = () => import('../pages/not-found/NotFoundPage.vue')
const protectedPageLoaders = [
  IndexPage, AdminPage, AdminAnalyticsPage, AdminUsersPage, AdminLeadsPage, SettingsPage, BudgetPage, WorkspacePage, AnalyticsPage, AnalyticsDetailPage,
  IdeasPage, BirthdaysPage, SportPage, ActivityPage, MoviesPage, DayDisplayPage, TimeTrackingPage,
  TimeProjectPage,
]
let pagesPreloaded = false

export const routes = [
  { path: '/login', name: 'login', component: LoginPage, meta: { title: 'Вход', public: true } },
  { path: '/', name: 'calendar', component: IndexPage, meta: { title: 'Календарь' } },
  {
    path: '/admin',
    component: AdminPage,
    meta: { title: 'Админка', requiresAdmin: true, standalone: true },
    children: [
      { path: '', redirect: { name: 'admin-overview' } },
      { path: 'overview', name: 'admin-overview', component: AdminAnalyticsPage, meta: { title: 'Обзор', requiresAdmin: true, standalone: true } },
      { path: 'users', name: 'admin-users', component: AdminUsersPage, meta: { title: 'Пользователи', requiresAdmin: true, standalone: true } },
      { path: 'leads', name: 'admin-leads', component: AdminLeadsPage, meta: { title: 'Заявки', requiresAdmin: true, standalone: true } },
    ],
  },
  { path: '/display', name: 'day-display', component: DayDisplayPage, meta: { title: 'Экран дня', standalone: true } },
  { path: '/budget', name: 'budget', component: BudgetPage, meta: { title: 'Бюджет', requiresBudget: true } },
  { path: '/sport', name: 'sport', component: SportPage, meta: { title: 'Спорт', requiresSubscriptionFeature: 'sport' } },
  { path: '/time', name: 'time-tracking', component: TimeTrackingPage, meta: { title: 'Учёт времени', requiresTimeTracking: true, requiresSubscriptionFeature: 'timeTracking' } },
  { path: '/time/projects/:projectId', name: 'time-project', component: TimeProjectPage, meta: { title: 'Проект · Учёт времени', requiresTimeTracking: true, requiresSubscriptionFeature: 'timeTracking' } },
  { path: '/settings', name: 'settings', component: SettingsPage, meta: { title: 'Настройки' } },
  { path: '/subscriptions', redirect: '/settings' },
  { path: '/workspace', name: 'workspace', component: WorkspacePage, meta: { title: 'Пространство' } },
  { path: '/analytics', name: 'analytics', component: AnalyticsPage, meta: { title: 'Аналитика' } },
  { path: '/analytics/calendar', name: 'analytics-calendar', component: AnalyticsDetailPage, meta: { title: 'Аналитика календаря', analyticsSection: 'calendar' } },
  { path: '/analytics/activity', name: 'analytics-activity', component: AnalyticsDetailPage, meta: { title: 'Аналитика активности', analyticsSection: 'activity', requiresActivityLog: true } },
  { path: '/analytics/sport', name: 'analytics-sport', component: AnalyticsDetailPage, meta: { title: 'Аналитика спорта', analyticsSection: 'sport' } },
  { path: '/analytics/movies', name: 'analytics-movies', component: AnalyticsDetailPage, meta: { title: 'Аналитика фильмов', analyticsSection: 'movies' } },
  { path: '/analytics/ideas', name: 'analytics-ideas', component: AnalyticsDetailPage, meta: { title: 'Аналитика идей', analyticsSection: 'ideas' } },
  { path: '/analytics/birthdays', name: 'analytics-birthdays', component: AnalyticsDetailPage, meta: { title: 'Аналитика дней рождения', analyticsSection: 'birthdays' } },
  { path: '/activity', name: 'activity', component: ActivityPage, meta: { title: 'Активность', requiresActivityLog: true } },
  { path: '/ideas', name: 'ideas', component: IdeasPage, meta: { title: 'Идеи' } },
  { path: '/birthdays', name: 'birthdays', component: BirthdaysPage, meta: { title: 'Дни рождения' } },
  { path: '/movies', name: 'movies', component: MoviesPage, meta: { title: 'Фильмы и сериалы', requiresSubscriptionFeature: 'movies' } },
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

  if (to.meta.requiresTimeTracking && !readTimeTrackingSetting()) {
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
