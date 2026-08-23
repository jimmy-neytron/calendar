import { describe, expect, it } from 'vitest'
import {
  calculateRecipeNutrition,
  mergeShoppingIngredients,
  parseMealDecimal,
  sumNutrition,
} from './mealNutrition.service'
import type { MealIngredient, MealRecipe } from '../types/meals.types'

const chicken: MealIngredient = {
  id: 'chicken',
  name: 'Куриная грудка',
  amount: 200,
  unit: 'g',
  source: 'local',
  sourceId: 'chicken',
  nutritionPer100g: { calories: 165, protein: 31, fat: 3.6, carbs: 0 },
}

describe('расчёты питания', () => {
  it('принимает дробные значения с точкой и запятой', () => {
    expect(parseMealDecimal('12.5')).toBe(12.5)
    expect(parseMealDecimal('12,5')).toBe(12.5)
    expect(parseMealDecimal('')).toBeNull()
    expect(parseMealDecimal('не число')).toBeNull()
  })

  it('считает пищевую ценность на одну порцию', () => {
    expect(calculateRecipeNutrition([chicken], 2)).toEqual({
      calories: 165,
      protein: 31,
      fat: 3.6,
      carbs: 0,
    })
  })

  it('не выдаёт ложный полный итог, если у ингредиента нет данных', () => {
    const unknown = { ...chicken, id: 'unknown', nutritionPer100g: null }
    expect(calculateRecipeNutrition([chicken, unknown], 1)).toEqual({
      calories: null,
      protein: null,
      fat: null,
      carbs: null,
    })
  })

  it('не пересчитывает данные на 100 г для ингредиента, заданного в штуках', () => {
    expect(calculateRecipeNutrition([{ ...chicken, unit: 'piece' }], 1)).toEqual({
      calories: null,
      protein: null,
      fat: null,
      carbs: null,
    })
  })

  it('суммирует только известные показатели дня', () => {
    expect(sumNutrition([
      { calories: 400, protein: 20, fat: null, carbs: 30 },
      { calories: 250, protein: null, fat: null, carbs: 10 },
    ])).toEqual({ calories: 650, protein: 20, fat: null, carbs: 40 })
  })

  it('объединяет одинаковые продукты с учётом порций', () => {
    const recipe = {
      servings: 2,
      ingredients: [chicken],
    } as MealRecipe
    expect(mergeShoppingIngredients([
      { recipe, servings: 1 },
      { recipe, servings: 2 },
    ])).toEqual([{
      key: 'куриная грудка:g',
      name: 'Куриная грудка',
      amount: 300,
      unit: 'g',
    }])
  })
})
