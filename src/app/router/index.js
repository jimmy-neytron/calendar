import { createRouter, createWebHistory } from 'vue-router'
import { authStore } from '../stores/auth.store.js'
import { workspaceStore } from '../stores/workspace.store.js'

const LoginPage = () => import('../pages/auth/LoginPage.vue')
const IndexPage = () => import('../pages/index/IndexPage.vue')
const SettingsPage = () => import('../pages/settings/SettingsPage.vue')
const SportPage = () => import('../pages/sport/SportPage.vue')

export const routes = [
  { path: '/login', name: 'login', component: LoginPage, meta: { title: 'Вход', public: true } },
  { path: '/', name: 'calendar', component: IndexPage, meta: { title: 'Календарь' } },
  { path: '/sport', name: 'sport', component: SportPage, meta: { title: 'Спорт' } },
  { path: '/settings', name: 'settings', component: SettingsPage, meta: { title: 'Настройки' } },
  { path: '/spaces', redirect: '/settings' },
  { path: '/chores', redirect: '/' },
  { path: '/meals', redirect: '/' },
  { path: '/lists', redirect: '/' },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  },
})

router.beforeEach((to) => {
  if (!to.meta.public && !authStore.isAuthenticated.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && authStore.isAuthenticated.value) {
    workspaceStore.ensureActiveWorkspace()
    return { name: 'calendar' }
  }

  if (!to.meta.public) {
    workspaceStore.ensureActiveWorkspace()
  }

  return true
})

router.afterEach((to) => {
  document.title = `${to.meta.title || 'Календарь'} · Пространство`
})
