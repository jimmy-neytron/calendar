import { computed, ref } from 'vue'
import { workspaceFeaturesApi } from '../../api/supabase/workspaceFeatures.api.js'
import { queryClient } from '../../query/queryClient.js'
import { queryKeys } from '../../query/queryKeys.js'
import { readSubscriptionFeature } from './useSubscriptionSettings.js'
import { applyExtraSectionsSetting } from './useExtraSectionsSettings.js'

const workspaceBudgetEnabled = ref(false)
const loadedWorkspaceId = ref('')
const loading = ref(false)
const error = ref('')

const hasBudgetAccess = computed(() => readSubscriptionFeature('budget'))
const isEnabled = computed(() => hasBudgetAccess.value && workspaceBudgetEnabled.value)

/**
 * Настройки бюджета объединяют серверный feature flag и доступ по подписке.
 * Синхронные computed сохранены для router guards, а серверный снимок хранится в Query.
 */
export function useBudgetSettings() {
  return {
    enabled: isEnabled,
    isEnabled,
    hasAccess: hasBudgetAccess,
    workspaceEnabled: computed(() => workspaceBudgetEnabled.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    loadWorkspace: loadWorkspaceFeatures,
    setEnabled: setBudgetEnabled,
  }
}

/** Загружает feature flags workspace с дедупликацией параллельных запросов. */
export async function loadWorkspaceFeatures(workspaceId) {
  if (!workspaceId) {
    loadedWorkspaceId.value = ''
    workspaceBudgetEnabled.value = false
    applyExtraSectionsSetting('', null)
    return { ok: true }
  }

  loading.value = true
  error.value = ''
  try {
    const data = await queryClient.fetchQuery({
      queryKey: queryKeys.workspace.features(workspaceId),
      queryFn: async () => {
        const result = await workspaceFeaturesApi.get(workspaceId)
        if (result.error) throw result.error
        return result.data
      },
    })
    applyWorkspaceFeatures(workspaceId, data)
    return { ok: true, data }
  } catch (exception) {
    error.value = exception?.message || 'Не удалось загрузить настройки пространства'
    return { ok: false, message: error.value }
  } finally {
    loading.value = false
  }
}

/** Сохраняет feature flag и атомарно обновляет Query-кэш и синхронный снимок. */
export async function setBudgetEnabled(value, workspaceId = loadedWorkspaceId.value) {
  const nextValue = value === true
  if (nextValue && !readSubscriptionFeature('budget')) {
    return {
      ok: false,
      code: 'subscription_required',
      message: 'Бюджет недоступен для текущего тарифа.',
    }
  }
  if (!workspaceId) return { ok: false, message: 'Сначала выбери пространство' }

  loading.value = true
  error.value = ''
  try {
    const result = await workspaceFeaturesApi.upsert(workspaceId, {
      budget_enabled: nextValue,
    })
    if (result.error) throw result.error

    queryClient.setQueryData(queryKeys.workspace.features(workspaceId), result.data)
    applyWorkspaceFeatures(workspaceId, result.data)
    dispatchBudgetChange(workspaceId)
    return { ok: true, data: result.data }
  } catch (exception) {
    error.value = exception?.message || 'Не удалось сохранить настройку бюджета'
    return { ok: false, message: error.value }
  } finally {
    loading.value = false
  }
}

function applyWorkspaceFeatures(workspaceId, data) {
  loadedWorkspaceId.value = workspaceId
  workspaceBudgetEnabled.value = data?.budget_enabled === true
  applyExtraSectionsSetting(workspaceId, data)
}

function dispatchBudgetChange(workspaceId) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('budget-setting-change', {
    detail: {
      workspaceId,
      enabled: isEnabled.value,
      workspaceEnabled: workspaceBudgetEnabled.value,
      hasAccess: hasBudgetAccess.value,
    },
  }))
}

export function readBudgetSetting() {
  return isEnabled.value
}

export function readBudgetWorkspaceSetting() {
  return workspaceBudgetEnabled.value
}

export function readBudgetAccess() {
  return hasBudgetAccess.value
}
