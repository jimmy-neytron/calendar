import { computed, ref } from 'vue'
import { APP_CONFIG } from '../../config/app.config.js'
import { authStore } from '../../stores/auth.store.js'
import { ONBOARDING_VERSION, onboardingSteps } from '../../onboarding/onboardingSteps.js'

const isOpen = ref(false)
const isPromptOpen = ref(false)
const currentIndex = ref(0)
const direction = ref(1)

const currentStep = computed(() => onboardingSteps[currentIndex.value])
const progress = computed(() => ((currentIndex.value + 1) / onboardingSteps.length) * 100)
const isFirst = computed(() => currentIndex.value === 0)
const isLast = computed(() => currentIndex.value === onboardingSteps.length - 1)

function storageKey() {
  const userId = authStore.currentUserId.value || 'guest'
  return `${APP_CONFIG.storageKey}:onboarding:${userId}`
}

function isCompleted() {
  try {
    return Number(localStorage.getItem(storageKey())) >= ONBOARDING_VERSION
  } catch {
    return false
  }
}

function start({ force = false, stepId = '' } = {}) {
  if (!force && isCompleted()) return false
  const index = onboardingSteps.findIndex((step) => step.id === stepId)
  currentIndex.value = index >= 0 ? index : 0
  direction.value = 1
  if (force) {
    isPromptOpen.value = false
    isOpen.value = true
  } else {
    isPromptOpen.value = true
  }
  return true
}

function acceptPrompt() {
  isPromptOpen.value = false
  isOpen.value = true
}

function declinePrompt() {
  markCompleted()
  isPromptOpen.value = false
}

function next() {
  if (isLast.value) {
    complete()
    return
  }
  direction.value = 1
  currentIndex.value += 1
}

function previous() {
  if (isFirst.value) return
  direction.value = -1
  currentIndex.value -= 1
}

function goTo(index) {
  if (index < 0 || index >= onboardingSteps.length || index === currentIndex.value) return
  direction.value = index > currentIndex.value ? 1 : -1
  currentIndex.value = index
}

function complete() {
  markCompleted()
  isOpen.value = false
}

function markCompleted() {
  try {
    localStorage.setItem(storageKey(), String(ONBOARDING_VERSION))
  } catch {
    // The prompt can still close when storage is unavailable.
  }
}

function close() {
  isOpen.value = false
}

export function useOnboarding() {
  return {
    steps: onboardingSteps,
    isOpen,
    isPromptOpen,
    currentIndex,
    currentStep,
    progress,
    direction,
    isFirst,
    isLast,
    isCompleted,
    start,
    acceptPrompt,
    declinePrompt,
    next,
    previous,
    goTo,
    complete,
    close,
  }
}
