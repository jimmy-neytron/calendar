import { computed, ref } from 'vue'
import { workspaceFeaturesApi } from '../../api/supabase/workspaceFeatures.api.js'
import { readSubscriptionFeature } from './useSubscriptionSettings.js'

const workspaceBudgetEnabled = ref(false)
const loadedWorkspaceId = ref('')
const loading = ref(false)
const error = ref('')

const hasBudgetAccess = computed(() => readSubscriptionFeature('budget'))

const isEnabled = computed(() => {
    return hasBudgetAccess.value && workspaceBudgetEnabled.value === true
})

function normalizeBudgetEnabled(value) {
    return value === true
}

export function useBudgetSettings() {
    return {
        enabled: isEnabled,
        isEnabled,

        // доступ по тарифу
        hasAccess: hasBudgetAccess,

        // настройка конкретного workspace
        workspaceEnabled: computed(() => workspaceBudgetEnabled.value === true),

        loading: computed(() => loading.value),
        error: computed(() => error.value),

        loadWorkspace: loadWorkspaceFeatures,
        setEnabled: setBudgetEnabled,
    }
}

export async function loadWorkspaceFeatures(workspaceId) {
    if (!workspaceId) {
        loadedWorkspaceId.value = ''
        workspaceBudgetEnabled.value = false
        return { ok: true }
    }

    loading.value = true
    error.value = ''

    try {
        const result = await workspaceFeaturesApi.get(workspaceId)

        if (result.error) {
            error.value = result.error.message || 'Не удалось загрузить настройки пространства'
            return { ok: false, message: error.value }
        }

        loadedWorkspaceId.value = workspaceId
        workspaceBudgetEnabled.value = normalizeBudgetEnabled(result.data?.budget_enabled)

        return { ok: true, data: result.data }
    } catch (exception) {
        error.value = exception?.message || 'Не удалось загрузить настройки пространства'
        return { ok: false, message: error.value }
    } finally {
        loading.value = false
    }
}

export async function setBudgetEnabled(value, workspaceId = loadedWorkspaceId.value) {
    const nextValue = value === true

    if (nextValue && !readSubscriptionFeature('budget')) {
        return {
            ok: false,
            code: 'subscription_required',
            message: 'Бюджет недоступен на тарифе Free. Перейди на Plus или Pro, чтобы включить этот раздел.',
        }
    }

    if (!workspaceId) {
        return {
            ok: false,
            message: 'Сначала выбери пространство',
        }
    }

    loading.value = true
    error.value = ''

    try {
        const result = await workspaceFeaturesApi.upsert(workspaceId, {
            budget_enabled: nextValue,
        })

        if (result.error) {
            error.value = result.error.message || 'Не удалось сохранить настройку бюджета'
            return { ok: false, message: error.value }
        }

        loadedWorkspaceId.value = workspaceId
        workspaceBudgetEnabled.value = normalizeBudgetEnabled(result.data?.budget_enabled)

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('budget-setting-change', {
                detail: {
                    workspaceId,
                    enabled: isEnabled.value,
                    workspaceEnabled: workspaceBudgetEnabled.value,
                    hasAccess: hasBudgetAccess.value,
                },
            }))
        }

        return { ok: true, data: result.data }
    } catch (exception) {
        error.value = exception?.message || 'Не удалось сохранить настройку бюджета'
        return { ok: false, message: error.value }
    } finally {
        loading.value = false
    }
}

export function readBudgetSetting() {
    return isEnabled.value
}

export function readBudgetWorkspaceSetting() {
    return workspaceBudgetEnabled.value === true
}

export function readBudgetAccess() {
    return hasBudgetAccess.value
}