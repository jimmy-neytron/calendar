import type { MealIngredient, MealRecipe, MealWeek } from '../types/meals.types'

export function cloneMealWeek(week: MealWeek): MealWeek {
  return JSON.parse(JSON.stringify(week)) as MealWeek
}

export function cloneMealIngredients(ingredients: MealIngredient[]): MealIngredient[] {
  return JSON.parse(JSON.stringify(ingredients)) as MealIngredient[]
}

/**
 * Фиксирует состав выбранного блюда внутри меню недели. Это сохраняет корректный
 * список покупок, даже если рецепт позже изменили или блюдо взято из встроенного справочника.
 */
export function addMealSlotSnapshots(
  week: MealWeek,
  recipeById: ReadonlyMap<string, MealRecipe>,
): MealWeek {
  const snapshot = cloneMealWeek(week)
  Object.values(snapshot.plan).forEach((day) => {
    Object.values(day).forEach((slot) => {
      const recipe = recipeById.get(slot.recipeId)
      if (!recipe) return
      slot.recipeTitle = recipe.title
      slot.recipeServings = recipe.servings
      slot.ingredients = cloneMealIngredients(recipe.ingredients)
    })
  })
  return snapshot
}
