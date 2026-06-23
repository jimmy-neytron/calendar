import { computed, onBeforeUnmount, ref } from 'vue'

export function useScreenWakeLock() {
  const wakeLock = ref(null)
  const error = ref('')
  const shouldStayAwake = ref(false)
  const isSupported = computed(() => 'wakeLock' in navigator)
  const isActive = computed(() => Boolean(wakeLock.value))

  async function enable() {
    shouldStayAwake.value = true
    error.value = ''
    if (!isSupported.value) {
      error.value = 'Браузер не поддерживает удержание экрана'
      return false
    }

    try {
      wakeLock.value = await navigator.wakeLock.request('screen')
      wakeLock.value.addEventListener('release', () => {
        wakeLock.value = null
      }, { once: true })
      return true
    } catch (wakeLockError) {
      error.value = wakeLockError?.message || 'Не удалось удерживать экран включённым'
      wakeLock.value = null
      return false
    }
  }

  async function disable() {
    shouldStayAwake.value = false
    if (!wakeLock.value) return
    await wakeLock.value.release()
    wakeLock.value = null
  }

  async function restoreWhenVisible() {
    if (document.visibilityState === 'visible' && shouldStayAwake.value && !wakeLock.value) await enable()
  }

  document.addEventListener('visibilitychange', restoreWhenVisible)
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', restoreWhenVisible)
    disable()
  })

  return {
    error,
    isActive,
    isSupported,
    enable,
    disable,
  }
}
