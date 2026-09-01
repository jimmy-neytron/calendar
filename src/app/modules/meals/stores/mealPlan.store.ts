import { computed, ref } from 'vue'
import { workspaceStore } from '../../../stores/workspace.store.js'
import {
  archiveMealRecipe,
  getMealWeek,
  listMealProducts,
  listMealRecipes,
  upsertMealProduct,
  upsertMealRecipe,
  upsertMealWeek,
} from '../api/meals.api'
import type { MealProduct, MealRecipe, MealWeek } from '../types/meals.types'
import { POPULAR_RECIPES } from '../data/popularRecipes'

const recipes = ref<MealRecipe[]>([])
const products = ref<MealProduct[]>([])
const week = ref<MealWeek | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
let loadedWorkspaceId = ''

const activeRecipes = computed(() => recipes.value.filter((recipe) => !recipe.archivedAt))
const availableRecipes = computed(() => [...POPULAR_RECIPES, ...activeRecipes.value])
const recipeById = computed(() => new Map(availableRecipes.value.map((recipe) => [recipe.id, recipe])))
const customFoods = computed(() => products.value
  .filter((product) => !product.archivedAt)
  .map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand || 'Общий справочник',
    defaultUnit: product.defaultUnit,
    source: 'manual' as const,
    nutritionPer100g: product.nutritionPer100g,
  })))

async function load(weekStart: string) {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId) return { ok: false, message: 'Пространство не выбрано' }
  loading.value = true
  error.value = ''
  try {
    const [loadedRecipes, loadedProducts, loadedWeek] = await Promise.all([
      loadedWorkspaceId === workspaceId ? Promise.resolve(recipes.value) : listMealRecipes(workspaceId),
      loadedWorkspaceId === workspaceId ? Promise.resolve(products.value) : listMealProducts(workspaceId),
      getMealWeek(workspaceId, weekStart),
    ])
    recipes.value = loadedRecipes
    products.value = loadedProducts
    loadedWorkspaceId = workspaceId
    week.value = loadedWeek || createEmptyWeek(workspaceId, weekStart)
    return { ok: true }
  } catch (reason) {
    error.value = getErrorMessage(reason)
    return { ok: false, message: error.value }
  } finally {
    loading.value = false
  }
}

async function saveProduct(product: MealProduct) {
  saving.value = true
  try {
    const saved = await upsertMealProduct(product)
    products.value = [...products.value.filter((item) => item.id !== saved.id), saved]
      .sort((first, second) => first.name.localeCompare(second.name, 'ru'))
    return { ok: true, product: saved }
  } catch (reason) {
    return { ok: false, message: getErrorMessage(reason) }
  } finally {
    saving.value = false
  }
}

async function saveRecipe(recipe: MealRecipe) {
  saving.value = true
  try {
    const saved = await upsertMealRecipe(recipe)
    recipes.value = [...recipes.value.filter((item) => item.id !== saved.id), saved]
      .sort((first, second) => first.title.localeCompare(second.title, 'ru'))
    return { ok: true, recipe: saved }
  } catch (reason) {
    return { ok: false, message: getErrorMessage(reason) }
  } finally {
    saving.value = false
  }
}

async function removeRecipe(id: string) {
  saving.value = true
  try {
    await archiveMealRecipe(id)
    const archivedAt = new Date().toISOString()
    recipes.value = recipes.value.map((recipe) => recipe.id === id
      ? { ...recipe, archivedAt, updatedAt: archivedAt }
      : recipe)
    return { ok: true }
  } catch (reason) {
    return { ok: false, message: getErrorMessage(reason) }
  } finally {
    saving.value = false
  }
}

async function saveWeek(nextWeek: MealWeek) {
  saving.value = true
  try {
    week.value = await upsertMealWeek({ ...nextWeek, updatedAt: new Date().toISOString() })
    return { ok: true, week: week.value }
  } catch (reason) {
    return { ok: false, message: getErrorMessage(reason) }
  } finally {
    saving.value = false
  }
}

function createEmptyWeek(workspaceId: string, weekStart: string): MealWeek {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    workspaceId,
    weekStart,
    plan: {},
    shoppingItems: [],
    calorieTarget: null,
    createdAt: now,
    updatedAt: now,
  }
}

function getErrorMessage(reason: unknown) {
  return reason instanceof Error && reason.message
    ? reason.message
    : 'Не удалось сохранить данные питания'
}

export const mealPlanStore = {
  recipes,
  products,
  customFoods,
  recipeById,
  activeRecipes,
  availableRecipes,
  popularRecipes: POPULAR_RECIPES,
  week,
  loading,
  saving,
  error,
  load,
  saveRecipe,
  saveProduct,
  removeRecipe,
  saveWeek,
}
