export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealNutrition {
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
}

export interface MealIngredient {
  id: string
  name: string
  amount: number
  unit: 'g' | 'ml' | 'piece'
  nutritionPer100g: MealNutrition | null
  source: 'manual' | 'local' | 'openfoodfacts'
  sourceId: string
}

export interface MealRecipe {
  id: string
  workspaceId: string
  title: string
  mealType: MealType
  servings: number
  imageUrl: string
  instructions: string
  ingredients: MealIngredient[]
  nutritionPerServing: MealNutrition
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MealSlot {
  recipeId: string
  servings: number
}

export type MealDayPlan = Partial<Record<MealType, MealSlot>>
export type MealWeekPlan = Record<string, MealDayPlan>

export interface MealWeek {
  id: string
  workspaceId: string
  weekStart: string
  plan: MealWeekPlan
  calorieTarget: number | null
  createdAt: string
  updatedAt: string
}

export interface FoodReference {
  id: string
  name: string
  brand?: string
  nutritionPer100g: MealNutrition
  source: 'local' | 'openfoodfacts'
}
