import { computed, ref, watch, type Ref } from 'vue'
import type { StoreProduct } from '../types/storeCatalog.types'

export function useStoreProductSelection(products: Ref<StoreProduct[]>, filtered: Ref<Array<{ product: StoreProduct }>>) {
  const checkedIds = ref<string[]>([])
  const checked = computed(() => new Set(checkedIds.value))
  const chosen = computed(() => products.value.filter(product => checked.value.has(product.id)))
  function toggle(id: string) {
    checkedIds.value = checked.value.has(id) ? checkedIds.value.filter(value => value !== id) : [...checkedIds.value, id]
  }
  function selectPage(entries: Array<{ product: StoreProduct }>) { checkedIds.value = entries.map(entry => entry.product.id) }
  function selectFiltered() { selectPage(filtered.value) }
  function clear() { checkedIds.value = [] }
  // Changing a filter must never leave invisible items selected for deletion.
  watch(filtered, entries => {
    const visible = new Set(entries.map(entry => entry.product.id))
    checkedIds.value = checkedIds.value.filter(id => visible.has(id))
  }, { flush: 'sync' })
  return { checked, chosen, toggle, selectPage, selectFiltered, clear }
}
