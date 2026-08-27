import { ref } from 'vue'

const isNavigating = ref(false)
const showPageSkeleton = ref(false)
const targetTitle = ref('')
const targetStandalone = ref(false)
const loadedRoutes = new Set()

function start(route) {
  const routeKey = getRouteKey(route)
  isNavigating.value = true
  showPageSkeleton.value = !loadedRoutes.has(routeKey)
  targetTitle.value = route?.meta?.title || 'Раздел'
  targetStandalone.value = route?.name === 'login' || route?.meta?.standalone === true
}

function finish(route) {
  loadedRoutes.add(getRouteKey(route))
  isNavigating.value = false
  showPageSkeleton.value = false
  targetTitle.value = ''
  targetStandalone.value = false
}

function cancel() {
  isNavigating.value = false
  showPageSkeleton.value = false
  targetTitle.value = ''
  targetStandalone.value = false
}

function getRouteKey(route) {
  return String(route?.name || route?.path || 'unknown')
}

export const navigationStore = {
  isNavigating,
  showPageSkeleton,
  targetTitle,
  targetStandalone,
  start,
  finish,
  cancel,
}
