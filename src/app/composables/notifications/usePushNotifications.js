import { computed, ref } from 'vue'
import { savePushSubscription, removePushSubscription } from '../../api/supabase/pushSubscriptions.api.js'
import { authStore } from '../../stores/auth.store.js'

const enabled = ref(localStorage.getItem('workspace-calendar:push-notifications') === 'true')
const loading = ref(false)
const status = ref('')
const statusType = ref('info')
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
    setStatus('Проверяем поддержку push…')
    try {
      if (!supported.value) {
        const result = { ok: false, message: getUnsupportedMessage() }
        setStatus(result.message, 'warning')
        return result
      }
      if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
        const result = { ok: false, message: 'На сайте не настроен публичный VAPID-ключ' }
        setStatus(result.message, 'danger')
        return result
      }

      setStatus('Ждём разрешение iPhone…')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        enabled.value = false
        persist()
        const result = { ok: false, message: 'Разрешение на уведомления не выдано' }
        setStatus(result.message, 'danger')
        return result
      }

      setStatus('Подключаем устройство к push…')
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
      })

      if (!authStore.currentUserId.value) {
        const result = { ok: false, message: 'Сначала войди в аккаунт' }
        setStatus(result.message, 'danger')
        return result
      }
      setStatus('Сохраняем устройство в Supabase…')
      const { error } = await savePushSubscription({
        deviceId: getDeviceId(),
        subscription,
      })
      if (error) throw new Error(`Supabase: ${error.message}`)

      enabled.value = true
      persist()
      const result = { ok: true, message: 'Push-напоминания включены на этом устройстве' }
      setStatus(result.message, 'success')
      return result
    } catch (error) {
      enabled.value = false
      persist()
      const result = { ok: false, message: getPushErrorMessage(error) }
      setStatus(result.message, 'danger')
      return result
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
      const result = { ok: true, message: 'Push-уведомления выключены на этом устройстве' }
      setStatus(result.message)
      return result
    } catch (error) {
      const result = { ok: false, message: getPushErrorMessage(error) }
      setStatus(result.message, 'danger')
      return result
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    if (!supported.value) {
      enabled.value = false
      persist()
      setStatus(getUnsupportedMessage(), 'warning')
      return false
    }
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      enabled.value = Notification.permission === 'granted' && Boolean(subscription)
      persist()
      if (enabled.value) setStatus('Push-напоминания активны на этом устройстве', 'success')
      else if (Notification.permission === 'denied') setStatus('Уведомления запрещены в настройках iPhone', 'danger')
      else setStatus('Push-напоминания выключены')
      return enabled.value
    } catch (error) {
      enabled.value = false
      persist()
      setStatus(getPushErrorMessage(error), 'danger')
      return false
    }
  }

  return { enabled, loading, status, statusType, supported, enable, disable, refresh }
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

function setStatus(message, type = 'info') {
  status.value = message
  statusType.value = type
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
