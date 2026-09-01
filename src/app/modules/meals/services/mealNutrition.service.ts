import type {
  MealIngredient,
  MealNutrition,
  MealRecipe,
  MealShoppingItem,
  MealSlot,
} from '../types/meals.types'

export interface ShoppingIngredient {
  key: string
  name: string
  amount: number
  unit: MealIngredient['unit']
}

export function parseMealDecimal(value: unknown): number | null {
  const normalized = String(value ?? '').trim().replace(',', '.')
  if (!normalized) return null
  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

const NUTRIENTS: Array<keyof MealNutrition> = ['calories', 'protein', 'fat', 'carbs']

export function calculateRecipeNutrition(
  ingredients: MealIngredient[],
  servings = 1,
): MealNutrition {
  const safeServings = Math.max(1, Number(servings) || 1)
  const result: MealNutrition = { calories: null, protein: null, fat: null, carbs: null }

  NUTRIENTS.forEach((nutrient) => {
    const knownIngredients = ingredients.filter((item) => (
      item.unit !== 'piece' && item.nutritionPer100g?.[nutrient] != null
    ))
    if (!ingredients.length || knownIngredients.length !== ingredients.length) return
    const total = knownIngredients.reduce((sum, item) => (
      sum + Number(item.nutritionPer100g?.[nutrient] || 0) * Math.max(0, item.amount) / 100
    ), 0)
    result[nutrient] = roundNutrition(total / safeServings)
  })

  return result
}

export function getSlotNutrition(recipe: MealRecipe, slot: MealSlot): MealNutrition {
  const multiplier = Math.max(0, Number(slot.servings) || 0)
  return mapNutrition(recipe.nutritionPerServing, (value) => (
    value == null ? null : roundNutrition(value * multiplier)
  ))
}

export function sumNutrition(values: MealNutrition[]): MealNutrition {
  return mapNutrition({ calories: null, protein: null, fat: null, carbs: null }, (_, nutrient) => {
    const known = values.map((item) => item[nutrient]).filter((value): value is number => value != null)
    return known.length ? roundNutrition(known.reduce((sum, value) => sum + value, 0)) : null
  })
}

export function mergeShoppingIngredients(
  slots: Array<{ recipe: MealRecipe; servings: number }>,
): ShoppingIngredient[] {
  const merged = new Map<string, ShoppingIngredient>()

  slots.forEach(({ recipe, servings }) => {
    const multiplier = Math.max(0, servings) / Math.max(1, recipe.servings)
    recipe.ingredients.forEach((ingredient) => {
      const key = `${normalizeName(ingredient.name)}:${ingredient.unit}`
      const current = merged.get(key) || { key, name: ingredient.name, amount: 0, unit: ingredient.unit }
      current.amount += ingredient.amount * multiplier
      merged.set(key, current)
    })
  })

  return [...merged.values()]
    .map((item) => ({ ...item, amount: roundAmount(item.amount) }))
    .sort((first, second) => first.name.localeCompare(second.name, 'ru'))
}

export function mergeManualShoppingItems(
  ingredients: ShoppingIngredient[],
  manualItems: MealShoppingItem[],
): ShoppingIngredient[] {
  const merged = new Map(ingredients.map((ingredient) => [ingredient.key, { ...ingredient }]))
  manualItems.forEach((item) => {
    const key = `${normalizeName(item.name)}:${item.unit}`
    const current = merged.get(key) || { key, name: item.name, amount: 0, unit: item.unit }
    current.amount += Math.max(0, Number(item.amount) || 0)
    merged.set(key, current)
  })
  return [...merged.values()]
    .map((item) => ({ ...item, amount: roundAmount(item.amount) }))
    .filter((item) => item.amount > 0)
    .sort((first, second) => first.name.localeCompare(second.name, 'ru'))
}

function mapNutrition(
  nutrition: MealNutrition,
  mapper: (value: number | null, nutrient: keyof MealNutrition) => number | null,
): MealNutrition {
  return NUTRIENTS.reduce<MealNutrition>((result, nutrient) => {
    result[nutrient] = mapper(nutrition[nutrient], nutrient)
    return result
  }, { calories: null, protein: null, fat: null, carbs: null })
}

function normalizeName(value: string) {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim()
}

function roundNutrition(value: number) {
  return Math.round(value * 10) / 10
}

function roundAmount(value: number) {
  return Math.round(value * 100) / 100
}
