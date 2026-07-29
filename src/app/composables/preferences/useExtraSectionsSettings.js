import { computed, ref } from 'vue'
import { workspaceFeaturesApi } from '../../api/supabase/workspaceFeatures.api.js'
import { queryClient } from '../../query/queryClient.js'
import { queryKeys } from '../../query/queryKeys.js'
import { readSubscriptionFeature } from './useSubscriptionSettings.js'

const workspaceExtraSectionsEnabled = ref(true)
const loadedWorkspaceId = ref('')
const loading = ref(false)
const error = ref('')

export function useExtraSectionsSettings() {
  return {
    isEnabled: computed(() => readExtraSectionsSetting()),
    hasAccess: computed(() => readSubscriptionFeature('extraSections')),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    setEnabled: setExtraSectionsEnabled,
  }
}

export function applyExtraSectionsSetting(workspaceId, data) {
  loadedWorkspaceId.value = workspaceId || ''
  workspaceExtraSectionsEnabled.value = data?.extra_sections_enabled !== false
}

export async function setExtraSectionsEnabled(value, workspaceId = loadedWorkspaceId.value) {
  if (!workspaceId) return { ok: false, message: 'Сначала выбери пространство' }
  if (value === true && !readSubscriptionFeature('extraSections')) {
    return {
      ok: false,
      code: 'subscription_required',
      message: 'Дополнительные разделы доступны на тарифе Pro.',
    }
  }

  loading.value = true
  error.value = ''
  try {
    const result = await workspaceFeaturesApi.upsert(workspaceId, {
      extra_sections_enabled: value === true,
    })
    if (result.error) throw result.error

    queryClient.setQueryData(queryKeys.workspace.features(workspaceId), result.data)
    applyExtraSectionsSetting(workspaceId, result.data)
    dispatchSettingChange(workspaceId)
    return { ok: true, data: result.data }
  } catch (exception) {
    error.value = exception?.message || 'Не удалось сохранить дополнительные разделы'
    return { ok: false, message: error.value }
  } finally {
    loading.value = false
  }
}

export function readExtraSectionsSetting() {
  return readSubscriptionFeature('extraSections') && workspaceExtraSectionsEnabled.value
}

function dispatchSettingChange(workspaceId) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('extra-sections-setting-change', {
    detail: {
      workspaceId,
      enabled: workspaceExtraSectionsEnabled.value,
    },
  }))
}
