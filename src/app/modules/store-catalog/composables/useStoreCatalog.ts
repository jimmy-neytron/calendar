import { computed, onScopeDispose, ref } from 'vue'
import { workspaceStore } from '../../../stores/workspace.store.js'
import { mealPlanStore } from '../../meals/stores/mealPlan.store'
import {
  createStoreSource,
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
    if (!workspaceId) return
    saving.value = true
    try {
      sources.value = [...sources.value, await createStoreSource(workspaceId, draft)]
    } finally { saving.value = false }
  }

  async function toggleSource(sourceId: string, enabled: boolean) {
    await setStoreSourceEnabled(sourceId, enabled)
    sources.value = sources.value.map((source) => source.id === sourceId ? { ...source, enabled } : source)
  }

  async function syncSource(sourceId: string) {
    if (syncingSourceId.value) throw new Error('Дождитесь завершения текущей синхронизации.')
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

  return { sources, products, links, selectedDate, loading, saving, error, syncingSourceId, requirements, purchases, confirmedTotal, unresolvedCount, load, loadCatalog, changeDate, addSource, toggleSource, syncSource, linkProduct, setPackage }
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
