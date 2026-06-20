import { ref } from 'vue'

export function useModal(initialState = false) {
  const isOpen = ref(initialState)
  const open = () => { isOpen.value = true }
  const close = () => { isOpen.value = false }
  const toggle = () => { isOpen.value = !isOpen.value }

  return {
    isOpen,
    open,
    close,
    toggle,
  }
}
