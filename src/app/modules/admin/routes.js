const AdminPage = () => import('./pages/AdminPage.vue')
const AdminAnalyticsPage = () => import('./pages/AdminAnalyticsPage.vue')
const AdminUsersPage = () => import('./pages/AdminUsersPage.vue')
const AdminUserDetailPage = () => import('./pages/AdminUserDetailPage.vue')
const AdminLeadsPage = () => import('./pages/AdminLeadsPage.vue')
const AdminModalsPage = () => import('./pages/AdminModalsPage.vue')

export const adminPageLoaders = [
  AdminPage,
  AdminAnalyticsPage,
  AdminUsersPage,
  AdminUserDetailPage,
  AdminLeadsPage,
  AdminModalsPage,
]

export const adminRoutes = [
  {
    path: '/admin',
    component: AdminPage,
    meta: { title: 'Админка', requiresAdmin: true, standalone: true },
    children: [
      { path: '', redirect: { name: 'admin-overview' } },
      { path: 'overview', name: 'admin-overview', component: AdminAnalyticsPage, meta: { title: 'Обзор', requiresAdmin: true, standalone: true } },
      { path: 'users', name: 'admin-users', component: AdminUsersPage, meta: { title: 'Пользователи', requiresAdmin: true, standalone: true } },
      { path: 'users/:userId', name: 'admin-user-detail', component: AdminUserDetailPage, meta: { title: 'Пользователь', requiresAdmin: true, standalone: true } },
      { path: 'leads', name: 'admin-leads', component: AdminLeadsPage, meta: { title: 'Заявки', requiresAdmin: true, standalone: true } },
      { path: 'modals', name: 'admin-modals', component: AdminModalsPage, meta: { title: 'Модальные окна', requiresAdmin: true, standalone: true } },
    ],
  },
]
