import { describe, expect, it } from 'vitest'
import { calculateDailyPurchases, extractPackage, getRecipeRequirements, getWeekRequirements, normalizeIngredientName } from './storeCatalog.service'

describe('storeCatalog.service', () => {
  it('extracts normalized package sizes', () => {
    expect(extractPackage('Молоко 1 л')).toEqual({ amount: 1000, unit: 'ml' })
    expect(extractPackage('Масло 2 × 180 г')).toEqual({ amount: 360, unit: 'g' })
    expect(extractPackage('Яйца 10 шт.')).toEqual({ amount: 10, unit: 'piece' })
    expect(extractPackage('Макароны Barilla 450-500г')).toEqual({ amount: null, unit: null })
    expect(extractPackage('Макароны 450–500 г')).toEqual({ amount: null, unit: null })
    expect(extractPackage('Упаковка 450 г / 500 г')).toEqual({ amount: null, unit: null })
  })

  it('calculates packages and confirmed cost', () => {
    const requirement = { name: 'Курица', normalizedName: 'курица', amount: 1100, unit: 'g' as const }
    const product = {
      id: 'p1', workspaceId: 'w1', store: 'magnit', productCode: '1', name: 'Курица 700 г', normalizedName: 'курица 700 г',
      imageUrl: '', productUrl: '', packageAmount: 700, packageUnit: 'g' as const, currentPrice: 329, oldPrice: null,
      priceUpdatedAt: new Date().toISOString(), sourceIds: [], priceVerified: true, priceSourceId: 's1',
      priceStoreCode: '780171', priceStoreType: 'express', priceCatalogType: '2',
    }
    const link = {
      id: 'l1', workspaceId: 'w1', ingredientName: 'Курица', normalizedIngredientName: normalizeIngredientName('Курица'),
      ingredientUnit: 'g' as const, productId: 'p1', packageAmountOverride: null,
    }
    expect(calculateDailyPurchases([requirement], [link], [product])[0]).toMatchObject({ packages: 2, lineTotal: 658, confirmed: true })
    for (const changes of [{ priceVerified: false }, { currentPrice: null }, { currentPrice: 0 }, { currentPrice: NaN }, { priceUpdatedAt: '2020-01-01' }, { packageAmount: null }]) {
      expect(calculateDailyPurchases([requirement], [link], [{ ...product, ...changes }])[0]).toMatchObject({ lineTotal: null, confirmed: false })
    }
  })

  it('merges the same ingredient across a week', () => {
    const ingredient = { id: 'i1', name: 'Молоко', amount: 500, unit: 'ml' as const, nutritionPer100g: null, source: 'manual' as const, sourceId: 'm1' }
    const recipe = { id: 'r1', workspaceId: 'w1', title: 'Каша', mealType: 'breakfast' as const, servings: 1, imageUrl: '', instructions: '', ingredients: [ingredient], nutritionPerServing: { calories: null, protein: null, fat: null, carbs: null }, archivedAt: null, createdAt: '', updatedAt: '' }
    const week = { id: 'w', workspaceId: 'w1', weekStart: '2026-08-31', plan: { '2026-08-31': { breakfast: { recipeId: 'r1', servings: 1 } }, '2026-09-01': { breakfast: { recipeId: 'r1', servings: 2 } } }, shoppingItems: [], calorieTarget: null, createdAt: '', updatedAt: '' }
    expect(getWeekRequirements(week, week.weekStart, new Map([[recipe.id, recipe]]))).toMatchObject([{ name: 'Молоко', amount: 1500, unit: 'ml' }])
    expect(getRecipeRequirements({ ...recipe, servings: 2, ingredients: [ingredient, { ...ingredient, name: ' молоко ', amount: 100 }, { ...ingredient, unit: 'g', amount: 50 }, { ...ingredient, amount: -1 }] })).toMatchObject([
      { name: 'Молоко', amount: 600, unit: 'ml' }, { name: 'Молоко', amount: 50, unit: 'g' },
    ])
  })
})
