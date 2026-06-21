import { computed, ref } from 'vue'

const activeRequests = ref(0)
const visible = ref(false)
let showTimer = null
let hideTimer = null
let visibleSince = 0

const isActive = computed(() => activeRequests.value > 0)

function startRequest() {
  activeRequests.value += 1
  clearTimeout(hideTimer)

  if (visible.value || showTimer) return
  showTimer = setTimeout(() => {
    showTimer = null
    if (!activeRequests.value) return
    visible.value = true
    visibleSince = Date.now()
  }, 140)
}

function finishRequest() {
  activeRequests.value = Math.max(0, activeRequests.value - 1)
  if (activeRequests.value) return

  clearTimeout(showTimer)
  showTimer = null
  if (!visible.value) return

  const remaining = Math.max(0, 520 - (Date.now() - visibleSince))
  hideTimer = setTimeout(() => {
    visible.value = false
    visibleSince = 0
  }, remaining)
}

function installFetchTracking() {
  if (typeof window === 'undefined' || window.__workspaceFetchTracked) return
  window.__workspaceFetchTracked = true
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (...args) => {
    startRequest()
    try {
      return await originalFetch(...args)
    } finally {
      finishRequest()
    }
  }
}

installFetchTracking()

export const networkActivityStore = {
  activeRequests,
  isActive,
  visible,
}
