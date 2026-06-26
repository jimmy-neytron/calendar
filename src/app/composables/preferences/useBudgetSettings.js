import { computed } from 'vue'
import { readSubscriptionFeature, setSubscriptionTier } from './useSubscriptionSettings.js'
import { authStore } from '../../stores/auth.store.js'

const enabled = computed(() => readSubscriptionFeature('budget'))

export function useBudgetSettings() {
  return {
    enabled,
    isEnabled: enabled,
    loading: computed(() => false),
    error: computed(() => ''),
    loadWorkspace: async () => ({ ok: true }),
    setEnabled: async (value) => {
      const targetTier = value ? (authStore.currentUser.value?.subscriptionTier === 'pro' ? 'pro' : 'plus') : 'free'
      return setSubscriptionTier(targetTier)
    },
  }
}

export async function loadWorkspaceFeatures() {
  return { ok: true }
}

export function readBudgetSetting() {
  return readSubscriptionFeature('budget')
}
