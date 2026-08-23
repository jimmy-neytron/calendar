import { reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import { cloneMealIngredients, cloneMealWeek } from './mealPlan.service'
import type { MealIngredient, MealWeek } from '../types/meals.types'

describe('план питания', () => {
  it('безопасно копирует реактивную неделю и отделяет черновик от store', () => {
    const source = reactive<MealWeek>({
      id: 'week-1',
      workspaceId: 'workspace-1',
      weekStart: '2026-08-17',
      plan: {
        '2026-08-17': { breakfast: { recipeId: 'recipe-1', servings: 1 } },
      },
      calorieTarget: null,
      createdAt: '2026-08-17T00:00:00.000Z',
      updatedAt: '2026-08-17T00:00:00.000Z',
    })

    const draft = cloneMealWeek(source)
    draft.plan['2026-08-17'].breakfast!.servings = 2

    expect(source.plan['2026-08-17'].breakfast?.servings).toBe(1)
    expect(draft.plan['2026-08-17'].breakfast?.servings).toBe(2)
  })

  it('безопасно копирует реактивные ингредиенты для редактора блюда', () => {
    const source = reactive<MealIngredient[]>([{
      id: 'ingredient-1',
      name: 'Гречка',
      amount: 100,
      unit: 'g',
      nutritionPer100g: { calories: 343, protein: 13, fat: 3.4, carbs: 72 },
      source: 'local',
      sourceId: 'buckwheat',
    }])

    const draft = cloneMealIngredients(source)
    draft[0].amount = 200

    expect(source[0].amount).toBe(100)
    expect(draft[0].amount).toBe(200)
  })
})
