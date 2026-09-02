import { computed, onScopeDispose, ref } from 'vue'
import { workspaceStore } from '../../../stores/workspace.store.js'
import { mealPlanStore } from '../../meals/stores/mealPlan.store'
import {
  createStoreSource,
  updateStoreSource,
  deleteStoreSource,
  deleteStoreProducts,
  clearStoreSourceProducts,
  listIngredientLinks,
  listStoreProducts,
  listStoreSources,
  saveIngredientLink,
  removeIngredientLink,
  setStoreSourceEnabled,
  syncStoreSource,
  updateProductPackage,
} from '../api/storeCatalog.api'
import { calculateDailyPurchases, getCurrentStoreProducts, getDailyRequirements, normalizeIngredientName } from '../services/storeCatalog.service'
import type { StorePackageUnit, StoreSourceDraft } from '../types/storeCatalog.types'

export function useStoreCatalog() {
  const sources = ref<Awaited<ReturnType<typeof listStoreSources>>>([])
  const storedProducts = ref<Awaited<ReturnType<typeof listStoreProducts>>>([])
  const priceClock = ref(Date.now())
  const priceTimer = setInterval(() => { priceClock.value = Date.now() }, 60000)
  onScopeDispose(() => clearInterval(priceTimer))
  const products = computed(() => getCurrentStoreProducts(storedProducts.value, sources.value, priceClock.value))
  const links = ref<Awaited<ReturnType<typeof listIngredientLinks>>>([])
  const selectedDate = ref(new Date().toLocaleDateString('en-CA'))
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const syncingSourceId = ref('')

  const requirements = computed(() => getDailyRequirements(mealPlanStore.week.value, selectedDate.value, mealPlanStore.recipeById.value))
  const purchases = computed(() => calculateDailyPurchases(requirements.value, links.value, products.value))
  const confirmedTotal = computed(() => purchases.value.reduce((sum, item) => sum + (item.lineTotal || 0), 0))
  const unresolvedCount = computed(() => purchases.value.filter((item) => !item.confirmed).length)

  async function load() {
    const workspaceId = workspaceStore.activeWorkspaceId.value
    if (!workspaceId) return
    loading.value = true
    error.value = ''
    try {
      await Promise.all([
        mealPlanStore.load(getMondayDateKey(selectedDate.value)),
        listStoreSources(workspaceId).then((value) => { sources.value = value }),
        listStoreProducts(workspaceId).then((value) => { storedProducts.value = value }),
        listIngredientLinks(workspaceId).then((value) => { links.value = value }),
      ])
    } catch (reason) {
      error.value = getMessage(reason)
    } finally {
      loading.value = false
    }
  }

  async function loadCatalog() {
    const workspaceId = workspaceStore.activeWorkspaceId.value
    if (!workspaceId) return
    loading.value = true
    error.value = ''
    try {
      const [nextSources, nextProducts, nextLinks] = await Promise.all([
        listStoreSources(workspaceId),
        listStoreProducts(workspaceId),
        listIngredientLinks(workspaceId),
      ])
      sources.value = nextSources
      storedProducts.value = nextProducts
      links.value = nextLinks
    } catch (reason) {
      error.value = getMessage(reason)
    } finally {
      loading.value = false
    }
  }

  async function changeDate(date: string) {
    selectedDate.value = date
    await mealPlanStore.load(getMondayDateKey(date))
  }

  async function addSource(draft: StoreSourceDraft) {
    const workspaceId = workspaceStore.activeWorkspaceId.value
    if (!workspaceId) throw new Error('Выберите рабочее пространство перед добавлением источника.')
    if (saving.value || syncingSourceId.value) throw new Error('Дождитесь завершения текущей операции.')
    saving.value = true
    try {
      sources.value = [...sources.value, await createStoreSource(workspaceId, draft)]
    } finally { saving.value = false }
  }

  async function toggleSource(sourceId: string, enabled: boolean) {
    requireSourceMutation(sourceId)
    saving.value = true
    try {
      await setStoreSourceEnabled(sourceId, enabled)
      sources.value = sources.value.map((source) => source.id === sourceId ? { ...source, enabled } : source)
    } finally { saving.value = false }
  }

  function requireSourceMutation(sourceId: string) {
    const workspaceId = workspaceStore.activeWorkspaceId.value
    const source = sources.value.find(item => item.id === sourceId)
    if (!workspaceId || !source || source.workspaceId !== workspaceId) throw new Error('Источник не найден. Обновите список.')
    if (saving.value || syncingSourceId.value || source.status === 'syncing') throw new Error('Дождитесь завершения текущей операции.')
    return { workspaceId, source }
  }

  function invalidateSourceProducts(sourceId: string, detach = false) {
    storedProducts.value = storedProducts.value.map(product => ({
      ...product,
      ...(product.priceSourceId === sourceId ? {
        priceVerified: false, currentPrice: null, oldPrice: null, unitPrice: null,
        priceSourceId: detach ? '' : product.priceSourceId,
      } : {}),
      sourceIds: detach ? product.sourceIds.filter(id => id !== sourceId) : product.sourceIds,
    }))
  }

  async function editSource(sourceId: string, draft: StoreSourceDraft) {
    const { workspaceId, source } = requireSourceMutation(sourceId)
    saving.value = true
    try {
      const updated = await updateStoreSource(workspaceId, sourceId, draft)
      if (source.url !== updated.url || source.storeCode !== updated.storeCode) invalidateSourceProducts(sourceId)
      sources.value = sources.value.map(item => item.id === sourceId ? updated : item)
    } finally { saving.value = false }
  }

  function removeStoredProducts(productIds: string[]) {
    const removed = new Set(productIds)
    storedProducts.value = storedProducts.value.filter(item => !removed.has(item.id))
    links.value = links.value.filter(item => !removed.has(item.productId))
  }

  async function removeSource(sourceId: string, deleteProducts = true) {
    const { workspaceId } = requireSourceMutation(sourceId)
    saving.value = true
    try {
      const deletedProductIds = await deleteStoreSource(workspaceId, sourceId, deleteProducts)
      removeStoredProducts(deletedProductIds)
      invalidateSourceProducts(sourceId, true)
      sources.value = sources.value.filter(item => item.id !== sourceId)
    } finally { saving.value = false }
  }

  async function clearSourceProducts(sourceId: string) {
    const { workspaceId } = requireSourceMutation(sourceId)
    saving.value = true
    try {
      const result = await clearStoreSourceProducts(workspaceId, sourceId)
      removeStoredProducts(result.deletedProductIds)
      invalidateSourceProducts(sourceId, true)
      sources.value = sources.value.map(item => item.id === sourceId ? result.source : item)
    } finally { saving.value = false }
  }

  async function removeProducts(productIds: string[]) {
    const workspaceId = workspaceStore.activeWorkspaceId.value
    if (!workspaceId || !productIds.length || productIds.some(id => !storedProducts.value.some(product => product.id === id && product.workspaceId === workspaceId))) {
      throw new Error('Товары не найдены. Обновите каталог.')
    }
    if (saving.value || syncingSourceId.value || sources.value.some(source => source.status === 'syncing')) {
      throw new Error('Дождитесь завершения текущей операции.')
    }
    saving.value = true
    try {
      const result = await deleteStoreProducts(workspaceId, productIds)
      removeStoredProducts(result.deletedProductIds)
      const updatedSources = new Map(result.sources.map(source => [source.id, source]))
      sources.value = sources.value.map(source => updatedSources.get(source.id) || source)
    } finally { saving.value = false }
  }

  async function syncSource(sourceId: string) {
    if (saving.value || syncingSourceId.value) throw new Error('Дождитесь завершения текущей операции.')
    syncingSourceId.value = sourceId
    try {
      await syncStoreSource(sourceId)
    } finally {
      await loadCatalog()
      syncingSourceId.value = ''
    }
  }

  async function linkProduct(ingredientName: string, unit: StorePackageUnit, productId: string) {
    const workspaceId = workspaceStore.activeWorkspaceId.value
    if (!workspaceId) return
    saving.value = true
    try {
      if (!productId) {
        const normalizedName = normalizeIngredientName(ingredientName)
        await removeIngredientLink(workspaceId, normalizedName, unit)
        links.value = links.value.filter(item => !(item.normalizedIngredientName === normalizedName && item.ingredientUnit === unit))
        return
      }
      const link = await saveIngredientLink(workspaceId, ingredientName, unit, productId, normalizeIngredientName(ingredientName))
      links.value = [...links.value.filter((item) => item.id !== link.id && !(item.normalizedIngredientName === link.normalizedIngredientName && item.ingredientUnit === link.ingredientUnit)), link]
    } finally { saving.value = false }
  }

  async function setPackage(productId: string, amount: number, unit: StorePackageUnit) {
    saving.value = true
    try {
      await updateProductPackage(productId, amount, unit)
      storedProducts.value = storedProducts.value.map((product) => product.id === productId ? { ...product, packageAmount: amount, packageUnit: unit } : product)
    } finally { saving.value = false }
  }

  return { sources, products, links, selectedDate, loading, saving, error, syncingSourceId, requirements, purchases, confirmedTotal, unresolvedCount, load, loadCatalog, changeDate, addSource, editSource, removeSource, clearSourceProducts, removeProducts, toggleSource, syncSource, linkProduct, setPackage }
}

function getMondayDateKey(date: string) {
  const current = new Date(`${date}T12:00:00`)
  const weekday = current.getDay() || 7
  current.setDate(current.getDate() - weekday + 1)
  return current.toLocaleDateString('en-CA')
}

function getMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Не удалось загрузить каталог'
}
