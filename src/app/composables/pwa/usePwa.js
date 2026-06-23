import { computed, ref } from 'vue'

const deferredInstallPrompt = ref(null)
const registration = ref(null)
const updateAvailable = ref(false)
const isInstalled = ref(isStandalone())
const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
let initialized = false
let refreshing = false

const canInstall = computed(() => Boolean(deferredInstallPrompt.value) && !isInstalled.value)
const needsIosInstructions = computed(() => isIos && !isInstalled.value && !canInstall.value)

export async function initializePwa() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstallPrompt.value = event
  })

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt.value = null
    isInstalled.value = true
  })

  window.addEventListener('online', () => {
    isOnline.value = true
  })
  window.addEventListener('offline', () => {
    isOnline.value = false
  })

  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return

  try {
    registration.value = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    watchRegistration(registration.value)
  } catch (error) {
    console.warn('PWA service worker registration failed', error)
    return
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  window.setInterval(() => registration.value?.update(), 60 * 60 * 1000)
}

export function usePwa() {
  async function install() {
    const prompt = deferredInstallPrompt.value
    if (!prompt) return false
    await prompt.prompt()
    const result = await prompt.userChoice
    deferredInstallPrompt.value = null
    return result.outcome === 'accepted'
  }

  function applyUpdate() {
    const waitingWorker = registration.value?.waiting
    if (!waitingWorker) return
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  return {
    canInstall,
    isInstalled,
    isOnline,
    needsIosInstructions,
    updateAvailable,
    install,
    applyUpdate,
  }
}

function watchRegistration(serviceWorkerRegistration) {
  if (serviceWorkerRegistration.waiting && navigator.serviceWorker.controller) {
    updateAvailable.value = true
  }

  serviceWorkerRegistration.addEventListener('updatefound', () => {
    const installingWorker = serviceWorkerRegistration.installing
    if (!installingWorker) return
    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
        updateAvailable.value = true
      }
    })
  })
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}
