import { ref, watch } from 'vue'
import { createStorage } from './useStorage.js'

/**
 * Reactive localStorage state.
 * @param {string} key
 * @param {any} initialValue
 */
export function useLocalStorage(key, initialValue) {
  const store = createStorage()
  const storedValue = store.get(key)
  const state = ref(storedValue ?? initialValue)

  watch(
    state,
    (value) => {
      store.set(key, value)
    },
    { deep: true }
  )

  const reset = () => {
    state.value = initialValue
    store.set(key, initialValue)
  }

  return {
    state,
    reset,
  }
}
