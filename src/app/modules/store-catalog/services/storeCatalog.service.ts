import type {
  DailyIngredientRequirement,
  DailyPurchase,
  IngredientProductLink,
  StorePackageUnit,
  StoreProduct,
  StoreCatalogSource,
} from '../types/storeCatalog.types'
import type { MealIngredient, MealRecipe, MealWeek } from '../../meals/types/meals.types'

export function normalizeIngredientName(value: string): string {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
}

export { extractPackage } from '../../../../../supabase/functions/_shared/storePackage'
import { isStorePriceCurrent } from '../../../../../supabase/functions/_shared/storePrice'
import { parseCatalogContext } from '../../../../../supabase/functions/store-catalog-sync/catalogParser'

export function getCurrentStoreProducts(products: StoreProduct[], sources: StoreCatalogSource[], now = Date.now()): StoreProduct[] {
  const contexts = new Map(sources.map(source => {
    try { return [source.id, parseCatalogContext({ url: source.url, store_code: source.storeCode })] as const }
    catch { return [source.id, null] as const }
  }))
  return products.map(product => {
    // Price validity depends on its originating shop, not its update schedule.
    const context = contexts.get(product.priceSourceId)
    const matches = context && context.storeCode === product.priceStoreCode
      && context.storeType === product.priceStoreType && context.catalogType === product.priceCatalogType
    const current = matches && isStorePriceCurrent(product.currentPrice, product.priceVerified, product.priceUpdatedAt, now)
    return current ? product : { ...product, currentPrice: null, oldPrice: null, priceVerified: false }
  })
}

export function getDailyRequirements(
  week: MealWeek | null,
  date: string,
  recipeById: ReadonlyMap<string, MealRecipe>,
): DailyIngredientRequirement[] {
  if (!week) return []
  const entries: Array<{ ingredient: Pick<MealIngredient, 'name' | 'amount' | 'unit'>; multiplier: number }> = []
  Object.values(week.plan[date] || {}).forEach((slot) => {
    const recipe = recipeById.get(slot.recipeId)
    const ingredients = slot.ingredients?.length ? slot.ingredients : recipe?.ingredients || []
    const baseServings = slot.recipeServings || recipe?.servings || 1
    const multiplier = Math.max(0, slot.servings) / Math.max(1, baseServings)
    ingredients.forEach((ingredient) => entries.push({ ingredient, multiplier }))
  })
  week.shoppingItems
    .filter((item) => item.date === date)
    .forEach((ingredient) => entries.push({ ingredient, multiplier: 1 }))

  const merged = new Map<string, DailyIngredientRequirement>()
  entries.forEach(({ ingredient, multiplier }) => {
    const normalizedName = normalizeIngredientName(ingredient.name)
    const key = `${normalizedName}:${ingredient.unit}`
    const current = merged.get(key) || { name: ingredient.name, normalizedName, amount: 0, unit: ingredient.unit }
    current.amount += ingredient.amount * multiplier
    merged.set(key, current)
  })
  return [...merged.values()]
    .map((item) => ({ ...item, amount: Math.round(item.amount * 100) / 100 }))
    .filter((item) => item.amount > 0)
    .sort((left, right) => left.name.localeCompare(right.name, 'ru'))
}

/** Quantities for the entire recipe; repeated ingredients share one store link. */
export function getRecipeRequirements(recipe: MealRecipe): DailyIngredientRequirement[] {
  const merged = new Map<string, DailyIngredientRequirement>()
  for (const ingredient of recipe.ingredients) {
    if (!Number.isFinite(ingredient.amount) || ingredient.amount <= 0) continue
    const normalizedName = normalizeIngredientName(ingredient.name)
    const key = normalizedName + ':' + ingredient.unit
    const current = merged.get(key) || { name: ingredient.name, normalizedName, amount: 0, unit: ingredient.unit }
    current.amount += ingredient.amount
    merged.set(key, current)
  }
  return [...merged.values()]
}

export function getWeekRequirements(
  week: MealWeek | null,
  weekStart: string,
  recipeById: ReadonlyMap<string, MealRecipe>,
): DailyIngredientRequirement[] {
  const merged = new Map<string, DailyIngredientRequirement>()
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(`${weekStart}T12:00:00`)
    date.setDate(date.getDate() + offset)
    getDailyRequirements(week, date.toLocaleDateString('en-CA'), recipeById).forEach((item) => {
      const key = `${item.normalizedName}:${item.unit}`
      const current = merged.get(key) || { ...item, amount: 0 }
      current.amount += item.amount
      merged.set(key, current)
    })
  }
  return [...merged.values()]
    .map((item) => ({ ...item, amount: Math.round(item.amount * 100) / 100 }))
    .sort((left, right) => left.name.localeCompare(right.name, 'ru'))
}

export function calculateDailyPurchases(
  requirements: DailyIngredientRequirement[],
  links: IngredientProductLink[],
  products: StoreProduct[],
): DailyPurchase[] {
  const productById = new Map(products.map((product) => [product.id, product]))
  const linkByIngredient = new Map(links.map((link) => [`${link.normalizedIngredientName}:${link.ingredientUnit}`, link]))
  return requirements.map((requirement) => {
    const link = linkByIngredient.get(`${requirement.normalizedName}:${requirement.unit}`) || null
    const product = link ? productById.get(link.productId) || null : null
    const packageAmount = link?.packageAmountOverride || product?.packageAmount || null
    const compatible = Boolean(product && packageAmount && product.packageUnit === requirement.unit)
    const packages = compatible ? Math.ceil(requirement.amount / packageAmount!) : null
    const confirmed = Boolean(packages && product && isStorePriceCurrent(product.currentPrice, product.priceVerified, product.priceUpdatedAt))
    return {
      ...requirement,
      link,
      product,
      packageAmount,
      packages,
      lineTotal: confirmed ? Math.round(packages! * product!.currentPrice! * 100) / 100 : null,
      confirmed,
    }
  })
}
