import { computed, ref, watch, type Ref } from 'vue'
import { normalizeIngredientName } from '../services/storeCatalog.service'
import { getStoreProductIssues, hasStoreDiscount } from '../services/storeProductPresentation'
import type { StoreProduct } from '../types/storeCatalog.types'

export function useStoreProductCatalog(products: Ref<StoreProduct[]>) {
  const query = ref(''), sourceId = ref(''), packageFilter = ref('all')
  const priceFilter = ref<'all' | 'missing'>('all')
  const discountOnly = ref(false), page = ref(1), selectedId = ref('')
  const pageSize = 24
  const entries = computed(() => products.value.map(product => ({ product, issues: getStoreProductIssues(product) })))
  const withoutPrice = computed(() => entries.value.filter(entry => entry.issues.some(issue => issue.kind === 'price')))
  const filtered = computed(() => {
    const q = normalizeIngredientName(query.value)
    return entries.value.filter(({ product, issues }) =>
      (!q || normalizeIngredientName(`${product.name} ${product.productCode}`).includes(q))
      && (!sourceId.value || (sourceId.value === 'without-source' ? !product.sourceIds.length && !product.priceSourceId : product.sourceIds.includes(sourceId.value)))
      && (priceFilter.value === 'all' || issues.some(issue => issue.kind === 'price'))
      && (packageFilter.value === 'all' || (packageFilter.value === 'missing') === issues.some(issue => issue.kind === 'package'))
      && (!discountOnly.value || (!issues.some(issue => issue.kind === 'price') && hasStoreDiscount(product))))
  })
  const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
  const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
  const selected = computed(() => products.value.find(product => product.id === selectedId.value) || null)
  watch([query, sourceId, packageFilter, priceFilter, discountOnly], () => { page.value = 1 }, { flush: 'sync' })
  watch(pageCount, count => { page.value = Math.min(page.value, count) }, { flush: 'sync' })
  watch(selected, product => { if (!product) selectedId.value = '' })
  function resetFilters() { query.value = ''; sourceId.value = ''; packageFilter.value = 'all'; priceFilter.value = 'all'; discountOnly.value = false }
  function showWithoutPrice() { resetFilters(); priceFilter.value = 'missing' }
  return { query, sourceId, packageFilter, priceFilter, discountOnly, page, pageCount, paged, filtered, withoutPrice, selectedId, selected, resetFilters, showWithoutPrice }
}
