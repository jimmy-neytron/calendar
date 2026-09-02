// @vitest-environment jsdom
import { createApp, nextTick, ref } from 'vue'
import { expect, it, vi } from 'vitest'
import MealRecipeProducts from './MealRecipeProducts.vue'
import type { IngredientProductLink, StoreProduct } from '../../store-catalog/types/storeCatalog.types'
import type { MealRecipe } from '../types/meals.types'
const actions = vi.hoisted(() => ({ load: vi.fn(), link: vi.fn(), setPackage: vi.fn(), notify: vi.fn() }))
const links = ref<IngredientProductLink[]>([])
const product: StoreProduct = { id: 'p', workspaceId: 'w', store: 'magnit', productCode: '123', name: 'Картофель 1 кг', normalizedName: 'картофель', imageUrl: '', productUrl: '', packageAmount: 1000, packageUnit: 'g', currentPrice: 70, oldPrice: null, priceUpdatedAt: new Date().toISOString(), priceVerified: true, priceSourceId: 's', priceStoreCode: '780171', priceStoreType: 'express', priceCatalogType: '2', sourceIds: ['s'] }
vi.mock('../../store-catalog/composables/useStoreCatalog', () => ({
  useStoreCatalog: () => ({
    products: ref([product]), links, loading: ref(false), saving: ref(false), error: ref(''),
    loadCatalog: actions.load, linkProduct: actions.link, setPackage: actions.setPackage,
  }),
}))
vi.mock('../../../composables/ui/useNotification.js', () => ({ useNotification: () => ({ notify: actions.notify }) }))
it('saves a recipe ingredient link and reuses it for another recipe with the same ingredient', async () => {
  const recipe: MealRecipe = { id: 'r', workspaceId: 'w', title: 'Обед', mealType: 'lunch', servings: 2, imageUrl: '', instructions: '', ingredients: [{ id: 'i', name: 'Картофель', amount: 500, unit: 'g', nutritionPer100g: null, source: 'manual', sourceId: '' }], nutritionPerServing: { calories: null, protein: null, fat: null, carbs: null }, archivedAt: null, createdAt: '', updatedAt: '' }
  const host = document.createElement('div'); document.body.append(host)
  actions.link.mockImplementation(async (name, unit, id) => { links.value = [{ id: 'l', workspaceId: 'w', ingredientName: name, normalizedIngredientName: name.toLowerCase(), ingredientUnit: unit, productId: id, packageAmountOverride: null }] })
  const current = ref(recipe)
  const app = createApp({ components: { MealRecipeProducts }, setup: () => ({ current }), template: '<MealRecipeProducts :recipe="current" />' })
  app.mount(host)
  try {
    expect(actions.load).toHaveBeenCalledTimes(1)
    host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click(); await nextTick(); await nextTick()
    ;[...document.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(b => b.textContent?.includes('Картофель 1 кг'))!.click()
    await nextTick(); await nextTick()
    expect(actions.link).toHaveBeenCalledWith('Картофель', 'g', 'p')
    expect(host.textContent).toContain('70 ₽')
    current.value = { ...recipe, id: 'r2', ingredients: [{ ...recipe.ingredients[0], amount: 1500 }] }
    await nextTick()
    expect(host.textContent).toContain('140 ₽')
    expect(host.textContent).toContain('2 упак.')
    expect(actions.load).toHaveBeenCalledTimes(1)
  } finally { app.unmount(); document.body.replaceChildren() }
})
