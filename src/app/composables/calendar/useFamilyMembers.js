import { computed } from 'vue'
import { workspaceStore } from '../../stores/workspace.store.js'

/**
 * Workspace members used as calendar participants.
 * New members join through a secure Supabase invite.
 */
export function useFamilyMembers() {
  const members = workspaceStore.activeWorkspaceMembers
  const memberMap = computed(() => new Map(members.value.map((member) => [member.id, member])))

  const addMember = async (data) => {
    const email = data.email?.trim()?.toLowerCase?.()
    const workspace = workspaceStore.activeWorkspace.value
    if (!workspace) return { ok: false, errors: { workspace: 'Пространство не найдено' } }
    if (!email?.includes('@')) return { ok: false, errors: { email: 'Укажи email участника' } }
    const result = await workspaceStore.createInvite(workspace.id, email)
    return result.ok
      ? { ok: true, invite: result.invite }
      : { ok: false, errors: { email: result.message } }
  }

  const updateMember = () => ({ ok: false, message: 'Профиль участник изменяет в своём аккаунте' })

  const deleteMember = async (id) => {
    const workspace = workspaceStore.activeWorkspace.value
    if (!workspace || workspace.memberIds.length <= 1) return
    await workspaceStore.removeMember(workspace.id, id)
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
