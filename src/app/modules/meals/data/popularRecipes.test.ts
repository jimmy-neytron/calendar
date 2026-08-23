import { describe, expect, it } from 'vitest'
import { POPULAR_RECIPES } from './popularRecipes'

describe('встроенный справочник блюд', () => {
  it('содержит популярные блюда для всех приёмов пищи', () => {
    expect(POPULAR_RECIPES).toHaveLength(20)
    expect(new Set(POPULAR_RECIPES.map((recipe) => recipe.mealType))).toEqual(
      new Set(['breakfast', 'lunch', 'dinner', 'snack']),
    )
  })

  it('имеет стабильные идентификаторы, ингредиенты и рассчитанные калории', () => {
    expect(new Set(POPULAR_RECIPES.map((recipe) => recipe.id)).size).toBe(POPULAR_RECIPES.length)
    POPULAR_RECIPES.forEach((recipe) => {
      expect(recipe.id.startsWith('popular:')).toBe(true)
      expect(recipe.ingredients.length).toBeGreaterThan(0)
      expect(recipe.nutritionPerServing.calories).toBeGreaterThan(0)
    })
  })
})
