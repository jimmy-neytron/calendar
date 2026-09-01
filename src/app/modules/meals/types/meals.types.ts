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
  recipeTitle?: string
  recipeServings?: number
  ingredients?: MealIngredient[]
}

export type MealDayPlan = Partial<Record<MealType, MealSlot>>
export type MealWeekPlan = Record<string, MealDayPlan>

export interface MealShoppingItem {
  id: string
  name: string
  amount: number
  unit: MealIngredient['unit']
  date: string
}

export interface MealWeek {
  id: string
  workspaceId: string
  weekStart: string
  plan: MealWeekPlan
  shoppingItems: MealShoppingItem[]
  calorieTarget: number | null
  createdAt: string
  updatedAt: string
}

export interface FoodReference {
  id: string
  name: string
  brand?: string
  defaultUnit?: MealIngredient['unit']
  nutritionPer100g: MealNutrition
  source: 'manual' | 'local' | 'openfoodfacts'
}

export interface MealProduct {
  id: string
  workspaceId: string
  name: string
  brand: string
  defaultUnit: MealIngredient['unit']
  nutritionPer100g: MealNutrition
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export type MealProductDraft = Pick<
  MealProduct,
  'id' | 'name' | 'brand' | 'defaultUnit' | 'nutritionPer100g'
>
