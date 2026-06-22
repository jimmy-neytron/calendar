import { computed, ref, watch } from 'vue'
import { APP_CONFIG } from '../../config/app.config.js'

export function usePaginatedView(items, key) {
  const storageKey = `${APP_CONFIG.storageKey}:collection-view:${key}`
  const saved = readSettings(storageKey)
  const viewMode = ref(saved.viewMode || 'cards')
  const pageSize = ref(saved.pageSize || 20)
  const page = ref(1)
  const pageCount = computed(() => Math.max(1, Math.ceil(items.value.length / pageSize.value)))
  const pagedItems = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return items.value.slice(start, start + pageSize.value)
  })
  const rangeStart = computed(() => items.value.length ? (page.value - 1) * pageSize.value + 1 : 0)
  const rangeEnd = computed(() => Math.min(page.value * pageSize.value, items.value.length))

  watch([viewMode, pageSize], () => {
    page.value = 1
    localStorage.setItem(storageKey, JSON.stringify({
      viewMode: viewMode.value,
      pageSize: pageSize.value,
    }))
  })
  watch(() => items.value.length, () => {
    page.value = Math.min(page.value, pageCount.value)
  })

  function goToPage(value) {
    page.value = Math.min(pageCount.value, Math.max(1, Number(value) || 1))
  }

  function resetPage() {
    page.value = 1
  }

  return {
    viewMode,
    pageSize,
    page,
    pageCount,
    pagedItems,
    rangeStart,
    rangeEnd,
    goToPage,
    resetPage,
  }
}

function readSettings(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
}
