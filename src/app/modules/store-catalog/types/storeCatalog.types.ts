import type { MealIngredient } from '../../meals/types/meals.types'

export type StorePackageUnit = MealIngredient['unit']
export type StoreSourceStatus = 'idle' | 'syncing' | 'success' | 'error'

export interface StoreCatalogSource {
  id: string
  workspaceId: string
  store: string
  storeCode: string
  url: string
  name: string
  /** Whether scheduled updates are enabled; does not restrict manual sync. */
  enabled: boolean
  lastSyncedAt: string | null
  nextSyncAt: string
  status: StoreSourceStatus
  lastError: string
  productCount: number
}

export interface StoreProduct {
  id: string
  workspaceId: string
  store: string
  productCode: string
  name: string
  normalizedName: string
  imageUrl: string
  productUrl: string
  packageAmount: number | null
  packageUnit: StorePackageUnit | null
  currentPrice: number | null
  oldPrice: number | null
  priceUpdatedAt: string | null
  priceVerified: boolean
  priceSourceId: string
  priceStoreCode: string
  priceStoreType: string
  priceCatalogType: string
  sourceIds: string[]
}

export interface IngredientProductLink {
  id: string
  workspaceId: string
  ingredientName: string
  normalizedIngredientName: string
  ingredientUnit: StorePackageUnit
  productId: string
  packageAmountOverride: number | null
}

export interface DailyIngredientRequirement {
  name: string
  normalizedName: string
  amount: number
  unit: StorePackageUnit
}

export interface DailyPurchase extends DailyIngredientRequirement {
  link: IngredientProductLink | null
  product: StoreProduct | null
  packageAmount: number | null
  packages: number | null
  lineTotal: number | null
  confirmed: boolean
}

export interface StoreSourceDraft {
  name: string
  url: string
  storeCode: string
}
