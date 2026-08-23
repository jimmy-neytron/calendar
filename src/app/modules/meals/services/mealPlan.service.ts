import type { MealIngredient, MealWeek } from '../types/meals.types'

export function cloneMealWeek(week: MealWeek): MealWeek {
  return JSON.parse(JSON.stringify(week)) as MealWeek
}

export function cloneMealIngredients(ingredients: MealIngredient[]): MealIngredient[] {
  return JSON.parse(JSON.stringify(ingredients)) as MealIngredient[]
}
