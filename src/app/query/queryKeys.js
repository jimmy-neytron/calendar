/**
 * Фабрика ключей TanStack Query.
 * Централизованные ключи исключают опечатки и позволяют безопасно инвалидировать
 * данные целого раздела, не затрагивая остальные части приложения.
 */
export const queryKeys = {
  collections: {
    root: ['collections'],
    workspace: (table, workspaceId) => ['collections', table, workspaceId],
  },
  workspace: {
    root: ['workspace-data'],
    data: (workspaceId, userId) => ['workspace-data', workspaceId, userId || 'guest'],
    section: (workspaceId, userId, section) => ['workspace-data', workspaceId, userId || 'guest', section],
    features: (workspaceId) => ['workspace-features', workspaceId],
  },
  activity: {
    root: ['activity'],
    workspace: (workspaceId) => ['activity', workspaceId],
    list: (workspaceId, params) => ['activity', workspaceId, params],
  },
  admin: {
    root: ['admin'],
    unreadLeads: () => ['admin', 'unread-leads'],
    users: () => ['admin', 'users'],
    leads: () => ['admin', 'leads'],
    overview: () => ['admin', 'overview'],
  },
  external: {
    investmentMarket: (cryptoIds, fiatCodes) => ['external', 'investment-market', [...cryptoIds].sort(), [...fiatCodes].sort()],
    movieCatalog: () => ['external', 'movies', 'catalog'],
    movieGenres: () => ['external', 'movies', 'genres'],
  },
  releaseNotes: () => ['release-notes'],
  familyTree: (workspaceId) => ['family-tree', workspaceId],
}
