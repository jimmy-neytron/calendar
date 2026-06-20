import { computed } from 'vue'
import { authStore } from '../../stores/auth.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'
import { validateMember } from '../../utils/validators/calendarValidator.js'

/**
 * Workspace members used as calendar participants.
 * In local MVP they are backed by local accounts and workspace membership.
 */
export function useFamilyMembers() {
  const members = workspaceStore.activeWorkspaceMembers
  const memberMap = computed(() => new Map(members.value.map((member) => [member.id, member])))

  const addMember = (data) => {
    const name = data.name?.trim()
    const email = data.email?.trim()?.toLowerCase?.() || `${Date.now()}-${name?.toLowerCase?.() || 'member'}@local.app`
    const accountResult = authStore.createUser({
      name,
      email,
      color: data.color,
    })

    if (!accountResult.ok) return { ok: false, errors: { name: accountResult.message } }

    const workspace = workspaceStore.activeWorkspace.value
    if (!workspace) return { ok: false, errors: { workspace: 'Пространство не найдено' } }

    const member = {
      id: accountResult.user.id,
      name: accountResult.user.name,
      color: accountResult.user.color,
      avatar: accountResult.user.avatar,
    }

    const validation = validateMember(member)
    if (!validation.valid) return { ok: false, errors: validation.errors }

    if (!workspace.memberIds.includes(accountResult.user.id)) {
      workspaceStore.workspaces.value = workspaceStore.workspaces.value.map((item) => (
        item.id === workspace.id
          ? { ...item, memberIds: [...item.memberIds, accountResult.user.id], updatedAt: new Date().toISOString() }
          : item
      ))
    }

    return { ok: true, member }
  }

  const updateMember = (id, updates) => {
    authStore.users.value = authStore.users.value.map((user) => (
      user.id === id
        ? { ...user, ...updates, avatar: updates.avatar || updates.name?.slice(0, 1).toUpperCase() || user.avatar }
        : user
    ))
  }

  const deleteMember = (id) => {
    const workspace = workspaceStore.activeWorkspace.value
    if (!workspace || workspace.memberIds.length <= 1) return
    workspaceStore.removeMember(workspace.id, id)
  }

  const getMember = (id) => memberMap.value.get(id)

  return {
    members,
    memberMap,
    addMember,
    updateMember,
    deleteMember,
    getMember,
  }
}
