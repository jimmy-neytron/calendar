import { computed, reactive, ref } from 'vue'
import { inspectStoreSourceContext, normalizeStoreSourceDraft } from '../services/storeSourceDraft'
import type { StoreCatalogSource, StoreSourceDraft } from '../types/storeCatalog.types'

export function useStoreSourceForm(source?: StoreCatalogSource) {
  const draft = reactive<StoreSourceDraft>({ name: source?.name || '', url: source?.url || '', storeCode: source?.storeCode || '' })
  const error = ref('')
  const context = computed(() => inspectStoreSourceContext(draft.url, draft.storeCode))
  function validate() {
    error.value = ''
    try { return normalizeStoreSourceDraft(draft) }
    catch (reason) { error.value = reason instanceof Error ? reason.message : 'Проверьте данные источника.'; return null }
  }
  return { draft, error, context, validate }
}
