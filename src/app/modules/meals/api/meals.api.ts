import { requireAuthenticatedSupabase } from '../../../api/supabase/client.js'
import type { MealProduct, MealRecipe, MealWeek } from '../types/meals.types'

const PRODUCT_COLUMNS = [
  'id',
  'workspace_id',
  'name',
  'brand',
  'default_unit',
  'nutrition_per_100g',
  'archived_at',
  'created_at',
  'updated_at',
].join(',')

const RECIPE_COLUMNS = [
  'id',
  'workspace_id',
  'title',
  'meal_type',
  'servings',
  'image_url',
  'instructions',
  'ingredients',
  'nutrition_per_serving',
  'archived_at',
  'created_at',
  'updated_at',
].join(',')

const WEEK_COLUMNS = [
  'id',
  'workspace_id',
  'week_start',
  'plan',
  'calorie_target',
  'created_at',
  'updated_at',
].join(',')

export async function listMealRecipes(workspaceId: string): Promise<MealRecipe[]> {
  const client = await requireAuthenticatedSupabase()
  const { data, error } = await client
    .from('meal_recipes')
    .select(RECIPE_COLUMNS)
    .eq('workspace_id', workspaceId)
    .order('title')
  if (error) throw error
  return (data || []).map(fromRecipeRow)
}

export async function listMealProducts(workspaceId: string): Promise<MealProduct[]> {
  const client = await requireAuthenticatedSupabase()
  const { data, error } = await client
    .from('meal_products')
    .select(PRODUCT_COLUMNS)
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)
    .order('name')
  if (error) throw error
  return (data || []).map(fromProductRow)
}

export async function upsertMealProduct(product: MealProduct): Promise<MealProduct> {
  const client = await requireAuthenticatedSupabase()
  const { data, error } = await client
    .from('meal_products')
    .upsert(toProductRow(product), { onConflict: 'id' })
    .select(PRODUCT_COLUMNS)
    .single()
  if (error) throw error
  return fromProductRow(data)
}

export async function upsertMealRecipe(recipe: MealRecipe): Promise<MealRecipe> {
  const client = await requireAuthenticatedSupabase()
  const { data, error } = await client
    .from('meal_recipes')
    .upsert(toRecipeRow(recipe), { onConflict: 'id' })
    .select(RECIPE_COLUMNS)
    .single()
  if (error) throw error
  return fromRecipeRow(data)
}

export async function archiveMealRecipe(id: string) {
  const client = await requireAuthenticatedSupabase()
  const { error } = await client
    .from('meal_recipes')
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function getMealWeek(workspaceId: string, weekStart: string): Promise<MealWeek | null> {
  const client = await requireAuthenticatedSupabase()
  const { data, error } = await client
    .from('meal_weeks')
    .select(WEEK_COLUMNS)
    .eq('workspace_id', workspaceId)
    .eq('week_start', weekStart)
    .maybeSingle()
  if (error) throw error
  return data ? fromWeekRow(data) : null
}

export async function upsertMealWeek(week: MealWeek): Promise<MealWeek> {
  const client = await requireAuthenticatedSupabase()
  const { data, error } = await client
    .from('meal_weeks')
    .upsert(toWeekRow(week), { onConflict: 'workspace_id,week_start' })
    .select(WEEK_COLUMNS)
    .single()
  if (error) throw error
  return fromWeekRow(data)
}

function toRecipeRow(recipe: MealRecipe) {
  return {
    id: recipe.id,
    workspace_id: recipe.workspaceId,
    title: recipe.title,
    meal_type: recipe.mealType,
    servings: recipe.servings,
    image_url: recipe.imageUrl,
    instructions: recipe.instructions,
    ingredients: recipe.ingredients,
    nutrition_per_serving: recipe.nutritionPerServing,
    archived_at: recipe.archivedAt,
    created_at: recipe.createdAt,
    updated_at: recipe.updatedAt,
  }
}

function toProductRow(product: MealProduct) {
  return {
    id: product.id,
    workspace_id: product.workspaceId,
    name: product.name,
    brand: product.brand,
    default_unit: product.defaultUnit,
    nutrition_per_100g: product.nutritionPer100g,
    archived_at: product.archivedAt,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  }
}

function fromProductRow(row: Record<string, unknown>): MealProduct {
  const unit = String(row.default_unit || 'g')
  return {
    id: String(row.id || ''),
    workspaceId: String(row.workspace_id || ''),
    name: String(row.name || ''),
    brand: String(row.brand || ''),
    defaultUnit: ['g', 'ml', 'piece'].includes(unit) ? unit as MealProduct['defaultUnit'] : 'g',
    nutritionPer100g: normalizeNutrition(row.nutrition_per_100g),
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  }
}

function fromRecipeRow(row: Record<string, unknown>): MealRecipe {
  return {
    id: String(row.id || ''),
    workspaceId: String(row.workspace_id || ''),
    title: String(row.title || ''),
    mealType: normalizeMealType(row.meal_type),
    servings: Math.max(1, Number(row.servings || 1)),
    imageUrl: String(row.image_url || ''),
    instructions: String(row.instructions || ''),
    ingredients: Array.isArray(row.ingredients) ? row.ingredients as MealRecipe['ingredients'] : [],
    nutritionPerServing: normalizeNutrition(row.nutrition_per_serving),
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  }
}

function toWeekRow(week: MealWeek) {
  return {
    id: week.id,
    workspace_id: week.workspaceId,
    week_start: week.weekStart,
    plan: { ...week.plan, __shoppingItems: week.shoppingItems },
    calorie_target: week.calorieTarget,
    created_at: week.createdAt,
    updated_at: week.updatedAt,
  }
}

function fromWeekRow(row: Record<string, unknown>): MealWeek {
  const rawPlan = row.plan && typeof row.plan === 'object' && !Array.isArray(row.plan)
    ? row.plan as Record<string, unknown>
    : {}
  const shoppingItems = Array.isArray(rawPlan.__shoppingItems)
    ? rawPlan.__shoppingItems as MealWeek['shoppingItems']
    : []
  const plan = Object.fromEntries(
    Object.entries(rawPlan).filter(([date]) => date !== '__shoppingItems'),
  ) as MealWeek['plan']
  return {
    id: String(row.id || ''),
    workspaceId: String(row.workspace_id || ''),
    weekStart: String(row.week_start || '').slice(0, 10),
    plan,
    shoppingItems,
    calorieTarget: row.calorie_target == null ? null : Math.max(0, Number(row.calorie_target)),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  }
}

function normalizeMealType(value: unknown): MealRecipe['mealType'] {
  const mealType = String(value || '')
  return ['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)
    ? mealType as MealRecipe['mealType']
    : 'dinner'
}

function normalizeNutrition(value: unknown): MealRecipe['nutritionPerServing'] {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    calories: nullableNumber(source.calories),
    protein: nullableNumber(source.protein),
    fat: nullableNumber(source.fat),
    carbs: nullableNumber(source.carbs),
  }
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : null
}
