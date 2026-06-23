import { computed, ref } from 'vue'
import { savePushSubscription, removePushSubscription } from '../../api/supabase/pushSubscriptions.api.js'
import { authStore } from '../../stores/auth.store.js'

const enabled = ref(localStorage.getItem('workspace-calendar:push-notifications') === 'true')
const DEVICE_ID_KEY = 'workspace-calendar:push-device-id'
const supported = computed(() => (
  typeof window !== 'undefined'
  && 'serviceWorker' in navigator
  && 'PushManager' in window
  && 'Notification' in window
))

export function usePushNotifications() {
  async function enable() {
    if (!supported.value) return { ok: false, message: 'Push-уведомления не поддерживаются этим браузером' }
    if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      return { ok: false, message: 'Добавь VITE_VAPID_PUBLIC_KEY в настройки приложения' }
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

    const userId = authStore.currentUserId.value
    if (!userId) return { ok: false, message: 'Сначала войди в аккаунт' }
    const { error } = await savePushSubscription({
      deviceId: getDeviceId(),
      subscription,
    })
    if (error) return { ok: false, message: error.message }

    enabled.value = true
    persist()
    return { ok: true, message: 'Push-напоминания включены на этом устройстве' }
  }

  async function disable() {
    if (supported.value) {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      const { error } = await removePushSubscription(getDeviceId())
      if (error) return { ok: false, message: error.message }
      if (subscription) await subscription.unsubscribe()
    }
    enabled.value = false
    persist()
    return { ok: true, message: 'Push-уведомления выключены на этом устройстве' }
  }

  return { enabled, supported, enable, disable }
}

function getDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const deviceId = crypto.randomUUID()
  localStorage.setItem(DEVICE_ID_KEY, deviceId)
  return deviceId
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
