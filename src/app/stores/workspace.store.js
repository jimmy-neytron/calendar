import { computed, ref } from 'vue'
import { workspacesApi } from '../api/supabase/workspaces.api.js'
import { APP_CONFIG } from '../config/app.config.js'
import { useLocalStorage } from '../composables/storage/useLocalStorage.js'
import { generateShortId } from '../utils/helpers/idGenerator.js'
import { authStore } from './auth.store.js'

const { state: activeWorkspaceId } = useLocalStorage(`${APP_CONFIG.storageKey}:active-workspace`, null)
const { state: workspaces } = useLocalStorage(`${APP_CONFIG.storageKey}:workspaces`, [])
const { state: invites } = useLocalStorage(`${APP_CONFIG.storageKey}:workspace-invites`, [])
const loading = ref(false)
const initializedForUserId = ref(null)
const error = ref('')

const currentUserSpaces = computed(() => workspaces.value)
const activeWorkspace = computed(() => (
  workspaces.value.find((workspace) => workspace.id === activeWorkspaceId.value)
  || workspaces.value[0]
  || null
))
const activeWorkspaceMembers = computed(() => activeWorkspace.value?.members || [])
const activeWorkspaceInvites = computed(() => invites.value.filter(
  (invite) => invite.workspaceId === activeWorkspace.value?.id && invite.status === 'active'
))

function mapWorkspace(row) {
  const members = (row.members || []).map((membership) => {
    const profile = membership.profile || {}
    return {
      id: membership.user_id,
      name: profile.name || profile.email || 'Пользователь',
      email: profile.email || '',
      avatar: profile.avatar || (profile.name || '?').slice(0, 1).toUpperCase(),
      color: profile.color || '#60a5fa',
      role: membership.role,
    }
  })
  authStore.mergeUsers(members)
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    memberIds: members.map((member) => member.id),
    roles: Object.fromEntries(members.map((member) => [member.id, member.role])),
    members,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapInvite(row) {
  return {
    id: row.id,
    code: row.code,
    workspaceId: row.workspace_id,
    workspaceName: workspaces.value.find((item) => item.id === row.workspace_id)?.name || '',
    invitedEmail: row.invited_email,
    createdBy: row.created_by,
    acceptedBy: row.accepted_by,
    status: row.status,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
  }
}

async function initialize(force = false) {
  const userId = authStore.currentUserId.value
  if (!userId) {
    workspaces.value = []
    invites.value = []
    initializedForUserId.value = null
    return
  }
  if (!force && initializedForUserId.value === userId) return
  if (!navigator.onLine) {
    initializedForUserId.value = userId
    error.value = ''
    return
  }

  loading.value = true
  try {
    const { data, error: loadError } = await workspacesApi.list()
    if (loadError) {
      error.value = loadError.message
      initializedForUserId.value = userId
      return
    }
    workspaces.value = (data || []).map(mapWorkspace)
    initializedForUserId.value = userId
    error.value = ''
    const activeWorkspaceExists = workspaces.value.some(
      (workspace) => workspace.id === activeWorkspaceId.value
    )
    if (!activeWorkspaceExists) {
      activeWorkspaceId.value = workspaces.value[0]?.id || null
    }
  } finally {
    loading.value = false
  }
}

async function loadInvites() {
  if (!activeWorkspace.value || !['owner', 'admin'].includes(getCurrentUserRole())) {
    invites.value = []
    return
  }
  if (!navigator.onLine) return
  const { data } = await workspacesApi.listInvites(activeWorkspace.value.id)
  invites.value = (data || []).map(mapInvite)
}

async function ensureActiveWorkspace() {
  await initialize()
  if (error.value) return null
  if (!activeWorkspace.value && authStore.currentUser.value) {
    const { error: ensureError } = await workspacesApi.ensure('Моё пространство')
    if (ensureError) {
      error.value = ensureError.message
      return null
    }
    initializedForUserId.value = null
    await initialize(true)
  }
  activeWorkspaceId.value = activeWorkspace.value?.id || null
  await loadInvites()
  return activeWorkspace.value
}

async function switchWorkspace(workspaceId) {
  if (!workspaces.value.some((workspace) => workspace.id === workspaceId)) return false
  activeWorkspaceId.value = workspaceId
  await loadInvites()
  const { loadWorkspaceData } = await import('../services/backend/workspaceData.service.js')
  await loadWorkspaceData(workspaceId)
  return true
}

async function createWorkspace(name) {
  if (!navigator.onLine) return networkRequired()
  const title = String(name || '').trim()
  if (!title) return { ok: false, message: 'Укажи название пространства' }
  const { data, error: createError } = await workspacesApi.create(title)
  if (createError) {
    return {
      ok: false,
      message: createError.code === '42702'
        ? 'Функция создания пространства требует обновления. Выполни миграцию 20260622_fix_workspace_creation.sql в Supabase.'
        : createError.message,
    }
  }
  await initialize(true)
  activeWorkspaceId.value = data
  const { loadWorkspaceData } = await import('../services/backend/workspaceData.service.js')
  await loadWorkspaceData(data)
  return { ok: true, workspace: activeWorkspace.value }
}

async function updateWorkspace(workspaceId, updates) {
  if (!navigator.onLine) return networkRequired()
  const { error: updateError } = await workspacesApi.update(workspaceId, { name: String(updates.name || '').trim() })
  if (updateError) return { ok: false, message: updateError.message }
  await initialize(true)
  return { ok: true }
}

async function createInvite(workspaceId, email = '') {
  if (!navigator.onLine) return networkRequired()
  const payload = {
    code: generateShortId().toUpperCase(),
    workspace_id: workspaceId,
    invited_email: String(email || '').trim().toLowerCase(),
    created_by: authStore.currentUserId.value,
  }
  const { data, error: inviteError } = await workspacesApi.createInvite(payload)
  if (inviteError) return { ok: false, message: inviteError.message }
  const invite = mapInvite(data)
  invites.value = [invite, ...invites.value]
  return { ok: true, invite }
}

async function acceptInvite(code) {
  if (!navigator.onLine) return networkRequired()
  const { data, error: acceptError } = await workspacesApi.acceptInvite(String(code || '').trim())
  if (acceptError) return { ok: false, message: acceptError.message }
  await initialize(true)
  await switchWorkspace(data)
  return { ok: true, workspaceId: data }
}

async function removeMember(workspaceId, userId) {
  if (!navigator.onLine) return networkRequired()
  const { error: removeError } = await workspacesApi.removeMember(workspaceId, userId)
  if (removeError) return { ok: false, message: removeError.message }
  await initialize(true)
  return { ok: true }
}

async function updateMemberRole(workspaceId, userId, role) {
  if (!navigator.onLine) return false
  const { error: roleError } = await workspacesApi.updateMemberRole(workspaceId, userId, role)
  if (roleError) return false
  await initialize(true)
  return true
}

function getCurrentUserRole() {
  if (!activeWorkspace.value) return 'viewer'
  return activeWorkspace.value.roles[authStore.currentUserId.value] || 'viewer'
}

async function deleteWorkspace(workspaceId) {
  if (!navigator.onLine) return networkRequired()
  const { error: removeError } = await workspacesApi.remove(workspaceId)
  if (removeError) {
    return {
      ok: false,
      message: removeError.code === '42883'
        ? 'Выполни миграцию 20260622_delete_workspace.sql в Supabase.'
        : removeError.message,
    }
  }
  await initialize(true)
  activeWorkspaceId.value = workspaces.value[0]?.id || null
  if (activeWorkspaceId.value) {
    const { loadWorkspaceData } = await import('../services/backend/workspaceData.service.js')
    await loadWorkspaceData(activeWorkspaceId.value, { force: true })
  }
  return { ok: true, workspaceId: activeWorkspaceId.value }
}

function networkRequired() {
  return {
    ok: false,
    message: 'Для управления пространством и доступами нужен интернет',
  }
}

export const workspaceStore = {
  workspaces, invites, activeWorkspaceId, currentUserSpaces, activeWorkspace,
  activeWorkspaceMembers, activeWorkspaceInvites, loading, error,
  initialize, ensureActiveWorkspace, switchWorkspace, createWorkspace,
  updateWorkspace, createInvite, acceptInvite, removeMember,
  deleteWorkspace, updateMemberRole, getCurrentUserRole,
}
