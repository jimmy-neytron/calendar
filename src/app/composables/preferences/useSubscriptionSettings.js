import { computed } from 'vue'
import { authStore } from '../../stores/auth.store.js'
import {
  getSubscriptionPlan,
  isSubscriptionFeatureEnabled,
  normalizeSubscriptionTier,
} from '../../utils/constants/subscriptionConstants.js'

const currentTier = computed(() => normalizeSubscriptionTier(authStore.currentUser.value?.subscriptionTier))
const currentPlan = computed(() => getSubscriptionPlan(currentTier.value))
const workspaceLimit = computed(() => currentPlan.value.workspaceLimit)

export function useSubscriptionSettings() {
  return {
    currentTier,
    currentPlan,
    workspaceLimit,
    featureEnabled: (feature) => computed(() => isSubscriptionFeatureEnabled(currentTier.value, feature)),
    setPlan: setSubscriptionTier,
  }
}

export function readSubscriptionTier() {
  return currentTier.value
}

export function readSubscriptionFeature(feature) {
  return isSubscriptionFeatureEnabled(currentTier.value, feature)
}

export function readWorkspaceLimit() {
  return workspaceLimit.value
}

export async function setSubscriptionTier(tier) {
  const normalized = normalizeSubscriptionTier(tier)
  if (!authStore.currentUser.value) {
    return { ok: false, message: 'Сначала войди в аккаунт' }
  }
  return authStore.updateCurrentUser({ subscriptionTier: normalized })
}
