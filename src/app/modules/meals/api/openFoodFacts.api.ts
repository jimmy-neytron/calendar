import type { FoodReference, MealNutrition } from '../types/meals.types'

const SEARCH_API_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const PRODUCT_API_URL = 'https://world.openfoodfacts.org/api/v3/product'
const CACHE_KEY = 'workspace-calendar:open-food-facts-cache:v1'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 25

interface CachedSearch {
  expiresAt: number
  items: FoodReference[]
}

export async function searchOpenFoodFacts(query: string): Promise<FoodReference[]> {
  const normalizedQuery = normalizeQuery(query)
  if (normalizedQuery.length < 3) return []

  const cache = readCache()
  const cached = cache[normalizedQuery]
  if (cached?.expiresAt > Date.now()) return cached.items

  const items = /^\d{8,14}$/.test(normalizedQuery)
    ? await getProductByBarcode(normalizedQuery)
    : await searchProductsByText(normalizedQuery)

  cache[normalizedQuery] = { expiresAt: Date.now() + CACHE_TTL, items }
  writeCache(cache)
  return items
}

async function getProductByBarcode(barcode: string): Promise<FoodReference[]> {
  const url = new URL(`${PRODUCT_API_URL}/${barcode}`)
  url.searchParams.set('fields', 'code,product_name,product_name_ru,brands,nutriments')
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('Open Food Facts временно недоступен')
  const payload = await response.json() as { status?: string; product?: Record<string, unknown> }
  const product = payload.product ? toFoodReference(payload.product) : null
  return product ? [product] : []
}

async function searchProductsByText(query: string): Promise<FoodReference[]> {
  const url = new URL(SEARCH_API_URL)
  url.searchParams.set('search_terms', query)
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', '1')
  url.searchParams.set('page_size', '8')
  url.searchParams.set('lc', 'ru')
  url.searchParams.set('fields', [
    'code',
    'product_name',
    'product_name_ru',
    'brands',
    'nutriments',
  ].join(','))

  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('Текстовый поиск Open Food Facts временно недоступен. Попробуй ввести штрихкод.')
  const payload = await response.json() as { products?: Array<Record<string, unknown>> }
  return (payload.products || []).map(toFoodReference).filter(Boolean) as FoodReference[]
}

function toFoodReference(product: Record<string, unknown>): FoodReference | null {
  const id = String(product.code || '')
  const name = String(product.product_name_ru || product.product_name || '').trim()
  if (!id || !name) return null
  const nutriments = product.nutriments && typeof product.nutriments === 'object'
    ? product.nutriments as Record<string, unknown>
    : {}
  const nutritionPer100g: MealNutrition = {
    calories: numberOrNull(nutriments['energy-kcal_100g']),
    protein: numberOrNull(nutriments.proteins_100g),
    fat: numberOrNull(nutriments.fat_100g),
    carbs: numberOrNull(nutriments.carbohydrates_100g),
  }
  return {
    id,
    name,
    brand: String(product.brands || ''),
    nutritionPer100g,
    source: 'openfoodfacts',
  }
}

function numberOrNull(value: unknown) {
  const number = Number(value)
  return value !== null && value !== '' && Number.isFinite(number) ? Math.max(0, number) : null
}

function normalizeQuery(value: string) {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim()
}

function readCache(): Record<string, CachedSearch> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeCache(cache: Record<string, CachedSearch>) {
  if (typeof localStorage === 'undefined') return
  const activeEntries = Object.fromEntries(
    Object.entries(cache)
      .filter(([, item]) => item.expiresAt > Date.now())
      .sort(([, first], [, second]) => second.expiresAt - first.expiresAt)
      .slice(0, CACHE_MAX_ENTRIES),
  )
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(activeEntries))
  } catch {
    // A full/disabled browser cache must never prevent adding a product.
  }
}
