import { computed, ref } from 'vue'
import { savePushSubscription, removePushSubscription } from '../../api/supabase/pushSubscriptions.api.js'
import { authStore } from '../../stores/auth.store.js'

const enabled = ref(localStorage.getItem('workspace-calendar:push-notifications') === 'true')
const loading = ref(false)
const DEVICE_ID_KEY = 'workspace-calendar:push-device-id'
const supported = computed(() => (
  typeof window !== 'undefined'
  && 'serviceWorker' in navigator
  && 'PushManager' in window
  && 'Notification' in window
))

export function usePushNotifications() {
  async function enable() {
    if (loading.value) return { ok: false, message: 'Подожди завершения настройки' }
    loading.value = true
    try {
      if (!supported.value) return { ok: false, message: getUnsupportedMessage() }
      if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
        return { ok: false, message: 'На сайте не настроен публичный VAPID-ключ' }
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        enabled.value = false
        persist()
        return { ok: false, message: 'Разрешение на уведомления не выдано' }
      }

      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
      })

      if (!authStore.currentUserId.value) return { ok: false, message: 'Сначала войди в аккаунт' }
      const { error } = await savePushSubscription({
        deviceId: getDeviceId(),
        subscription,
      })
      if (error) return { ok: false, message: `Supabase: ${error.message}` }

      enabled.value = true
      persist()
      return { ok: true, message: 'Push-напоминания включены на этом устройстве' }
    } catch (error) {
      enabled.value = false
      persist()
      return { ok: false, message: getPushErrorMessage(error) }
    } finally {
      loading.value = false
    }
  }

  async function disable() {
    if (loading.value) return { ok: false, message: 'Подожди завершения настройки' }
    loading.value = true
    try {
      if (supported.value) {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        const { error } = await removePushSubscription(getDeviceId())
        if (error) return { ok: false, message: `Supabase: ${error.message}` }
        if (subscription) await subscription.unsubscribe()
      }
      enabled.value = false
      persist()
      return { ok: true, message: 'Push-уведомления выключены на этом устройстве' }
    } catch (error) {
      return { ok: false, message: getPushErrorMessage(error) }
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    if (!supported.value) {
      enabled.value = false
      persist()
      return false
    }
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      enabled.value = Notification.permission === 'granted' && Boolean(subscription)
      persist()
      return enabled.value
    } catch {
      enabled.value = false
      persist()
      return false
    }
  }

  return { enabled, loading, supported, enable, disable, refresh }
}

function getDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const deviceId = crypto.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  localStorage.setItem(DEVICE_ID_KEY, deviceId)
  return deviceId
}

function getUnsupportedMessage() {
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone()) {
    return 'На iPhone push работает только в приложении, добавленном на экран «Домой»'
  }
  return 'Push-уведомления не поддерживаются этим браузером'
}

function getPushErrorMessage(error) {
  const message = String(error?.message || error || '')
  if (/abort|not allowed|denied/i.test(message)) return 'Safari не разрешил создать push-подписку'
  if (/service worker/i.test(message)) return 'Service Worker ещё не готов. Закрой и заново открой PWA'
  return message ? `Не удалось включить push: ${message}` : 'Не удалось включить push-уведомления'
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}

function persist() {
  localStorage.setItem('workspace-calendar:push-notifications', String(enabled.value))
}

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = window.atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}
