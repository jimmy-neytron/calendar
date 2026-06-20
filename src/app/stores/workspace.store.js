import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { useLocalStorage } from '../composables/storage/useLocalStorage.js'
import { generateId, generateShortId } from '../utils/helpers/idGenerator.js'
import { authStore } from './auth.store.js'

const WORKSPACES_KEY = `${APP_CONFIG.storageKey}:workspaces`
const INVITES_KEY = `${APP_CONFIG.storageKey}:workspace-invites`
const ACTIVE_WORKSPACE_KEY = `${APP_CONFIG.storageKey}:active-workspace`

const now = new Date().toISOString()

const defaultWorkspaces = [
  {
    id: 'space-family',
    name: 'Семья',
    ownerId: 'u-anna',
    memberIds: ['u-anna', 'u-ilya', 'u-miya'],
    roles: { 'u-anna': 'owner', 'u-ilya': 'admin', 'u-miya': 'member' },
    createdAt: now,
    updatedAt: now,
  },
]

const { state: workspaces } = useLocalStorage(WORKSPACES_KEY, defaultWorkspaces)
const { state: invites } = useLocalStorage(INVITES_KEY, [])
const { state: activeWorkspaceId } = useLocalStorage(ACTIVE_WORKSPACE_KEY, defaultWorkspaces[0].id)

const currentUserSpaces = computed(() => {
  const userId = authStore.currentUserId.value
  if (!userId) return []
  return workspaces.value.filter((workspace) => workspace.memberIds.includes(userId))
})

const activeWorkspace = computed(() => {
  const userSpaces = currentUserSpaces.value
  const selected = userSpaces.find((workspace) => workspace.id === activeWorkspaceId.value)
  return selected || userSpaces[0] || null
})

const activeWorkspaceMembers = computed(() => {
  if (!activeWorkspace.value) return []
  return activeWorkspace.value.memberIds
    .map((userId) => authStore.getUser(userId))
    .filter(Boolean)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      color: user.color || '#ffffff',
      role: activeWorkspace.value.roles?.[user.id] || (activeWorkspace.value.ownerId === user.id ? 'owner' : 'member'),
    }))
})

const activeWorkspaceInvites = computed(() => {
  if (!activeWorkspace.value) return []
  return invites.value.filter((invite) => invite.workspaceId === activeWorkspace.value.id && invite.status === 'active')
})

function ensureActiveWorkspace() {
  if (activeWorkspace.value) return activeWorkspace.value
  if (currentUserSpaces.value[0]) {
    activeWorkspaceId.value = currentUserSpaces.value[0].id
    return currentUserSpaces.value[0]
  }
  if (!authStore.currentUser.value) return null
  return createWorkspace('Моё пространство').workspace
}

function switchWorkspace(workspaceId) {
  const allowed = currentUserSpaces.value.some((workspace) => workspace.id === workspaceId)
  if (!allowed) return false
  activeWorkspaceId.value = workspaceId
  return true
}

function createWorkspace(name) {
  const title = String(name || '').trim()
  if (!authStore.currentUser.value) return { ok: false, message: 'Сначала войди в аккаунт' }
  if (!title) return { ok: false, message: 'Укажи название пространства' }

  const workspace = {
    id: generateId(),
    name: title,
    ownerId: authStore.currentUser.value.id,
    memberIds: [authStore.currentUser.value.id],
    roles: { [authStore.currentUser.value.id]: 'owner' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  workspaces.value = [...workspaces.value, workspace]
  activeWorkspaceId.value = workspace.id
  return { ok: true, workspace }
}

function updateWorkspace(workspaceId, updates) {
  const currentUserId = authStore.currentUserId.value
  workspaces.value = workspaces.value.map((workspace) => {
    if (workspace.id !== workspaceId || workspace.ownerId !== currentUserId) return workspace
    return {
      ...workspace,
      ...updates,
      name: updates.name?.trim?.() || workspace.name,
      updatedAt: new Date().toISOString(),
    }
  })
}

function createInvite(workspaceId, email = '') {
  const workspace = workspaces.value.find((item) => item.id === workspaceId)
  if (!workspace) return { ok: false, message: 'Пространство не найдено' }
  if (!workspace.memberIds.includes(authStore.currentUserId.value)) return { ok: false, message: 'Нет доступа к пространству' }

  const invite = {
    id: generateId(),
    code: generateShortId().toUpperCase(),
    workspaceId,
    workspaceName: workspace.name,
    invitedEmail: String(email || '').trim().toLowerCase(),
    createdBy: authStore.currentUserId.value,
    status: 'active',
    createdAt: new Date().toISOString(),
  }

  invites.value = [invite, ...invites.value]
  return { ok: true, invite }
}

function acceptInvite(code) {
  const inviteCode = String(code || '').trim().toUpperCase()
  const invite = invites.value.find((item) => item.code === inviteCode && item.status === 'active')
  const user = authStore.currentUser.value
  if (!user) return { ok: false, message: 'Сначала войди в аккаунт' }
  if (!invite) return { ok: false, message: 'Код приглашения не найден или уже использован' }
  if (invite.invitedEmail && invite.invitedEmail !== user.email) {
    return { ok: false, message: 'Этот код создан для другого email' }
  }

  workspaces.value = workspaces.value.map((workspace) => {
    if (workspace.id !== invite.workspaceId) return workspace
    if (workspace.memberIds.includes(user.id)) return workspace
    return {
      ...workspace,
      memberIds: [...workspace.memberIds, user.id],
      roles: { ...(workspace.roles || {}), [user.id]: 'member' },
      updatedAt: new Date().toISOString(),
    }
  })

  activeWorkspaceId.value = invite.workspaceId
  invites.value = invites.value.map((item) => (
    item.id === invite.id
      ? { ...item, status: 'accepted', acceptedBy: user.id, acceptedAt: new Date().toISOString() }
      : item
  ))

  return { ok: true, workspaceId: invite.workspaceId }
}

function removeMember(workspaceId, userId) {
  const currentUserId = authStore.currentUserId.value
  workspaces.value = workspaces.value.map((workspace) => {
    if (workspace.id !== workspaceId) return workspace
    if (workspace.ownerId !== currentUserId && userId !== currentUserId) return workspace
    if (workspace.ownerId === userId) return workspace
    return {
      ...workspace,
      memberIds: workspace.memberIds.filter((id) => id !== userId),
      roles: Object.fromEntries(Object.entries(workspace.roles || {}).filter(([id]) => id !== userId)),
      updatedAt: new Date().toISOString(),
    }
  })
}


function updateMemberRole(workspaceId, userId, role) {
  const currentUserId = authStore.currentUserId.value
  const workspace = workspaces.value.find((item) => item.id === workspaceId)
  if (!workspace || workspace.ownerId !== currentUserId || workspace.ownerId === userId) return false
  const allowedRoles = new Set(['admin', 'member', 'viewer'])
  if (!allowedRoles.has(role)) return false

  workspaces.value = workspaces.value.map((item) => {
    if (item.id !== workspaceId) return item
    return {
      ...item,
      roles: { ...(item.roles || {}), [userId]: role },
      updatedAt: new Date().toISOString(),
    }
  })
  return true
}

function getCurrentUserRole() {
  const workspace = activeWorkspace.value
  const userId = authStore.currentUserId.value
  if (!workspace || !userId) return 'viewer'
  if (workspace.ownerId === userId) return 'owner'
  return workspace.roles?.[userId] || 'member'
}

function deleteWorkspace(workspaceId) {
  const currentUserId = authStore.currentUserId.value
  const workspace = workspaces.value.find((item) => item.id === workspaceId)
  if (!workspace || workspace.ownerId !== currentUserId) return false
  workspaces.value = workspaces.value.filter((item) => item.id !== workspaceId)
  invites.value = invites.value.filter((invite) => invite.workspaceId !== workspaceId)
  if (activeWorkspaceId.value === workspaceId) {
    activeWorkspaceId.value = currentUserSpaces.value[0]?.id || null
  }
  return true
}

export const workspaceStore = {
  workspaces,
  invites,
  activeWorkspaceId,
  currentUserSpaces,
  activeWorkspace,
  activeWorkspaceMembers,
  activeWorkspaceInvites,
  ensureActiveWorkspace,
  switchWorkspace,
  createWorkspace,
  updateWorkspace,
  createInvite,
  acceptInvite,
  removeMember,
  deleteWorkspace,
  updateMemberRole,
  getCurrentUserRole,
}
