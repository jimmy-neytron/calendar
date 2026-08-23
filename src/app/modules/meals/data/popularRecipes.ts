import { LOCAL_FOODS } from './localFoods'
import { calculateRecipeNutrition } from '../services/mealNutrition.service'
import type { MealIngredient, MealRecipe, MealType } from '../types/meals.types'

interface PopularRecipeSource {
  id: string
  title: string
  mealType: MealType
  ingredients: Array<[foodId: string, amount: number]>
  instructions: string
}

const SOURCES: PopularRecipeSource[] = [
  { id: 'oatmeal-banana', title: 'Овсяная каша с бананом', mealType: 'breakfast', ingredients: [['oatmeal-cooked', 250], ['banana', 100]], instructions: 'Приготовь овсяную кашу и добавь нарезанный банан.' },
  { id: 'omelette-tomato-cheese', title: 'Омлет с помидором и сыром', mealType: 'breakfast', ingredients: [['egg', 120], ['tomato', 100], ['cheese', 30]], instructions: 'Взбей яйца, добавь помидор и сыр, готовь под крышкой.' },
  { id: 'cottage-cheese-apple', title: 'Творог с яблоком', mealType: 'breakfast', ingredients: [['cottage-cheese', 200], ['apple', 120]], instructions: 'Нарежь яблоко и смешай с творогом.' },
  { id: 'yogurt-banana', title: 'Йогурт с бананом', mealType: 'breakfast', ingredients: [['yogurt', 200], ['banana', 100]], instructions: 'Добавь нарезанный банан в натуральный йогурт.' },
  { id: 'cheese-tomato-sandwich', title: 'Бутерброды с сыром и помидором', mealType: 'breakfast', ingredients: [['bread', 80], ['cheese', 40], ['tomato', 80]], instructions: 'Собери бутерброды и при желании слегка подрумянь.' },
  { id: 'buckwheat-chicken', title: 'Гречка с курицей', mealType: 'lunch', ingredients: [['buckwheat-cooked', 180], ['chicken-breast', 150], ['cucumber', 100]], instructions: 'Подавай готовую гречку с курицей и свежим огурцом.' },
  { id: 'rice-chicken-broccoli', title: 'Рис с курицей и брокколи', mealType: 'lunch', ingredients: [['rice-cooked', 180], ['chicken-breast', 150], ['broccoli', 120]], instructions: 'Соедини готовый рис, курицу и брокколи.' },
  { id: 'pasta-beef', title: 'Макароны с говядиной', mealType: 'lunch', ingredients: [['pasta-cooked', 200], ['beef', 130], ['tomato', 100], ['onion', 40]], instructions: 'Обжарь лук с говядиной, добавь помидор и макароны.' },
  { id: 'turkey-potato-salad', title: 'Индейка с картофелем и салатом', mealType: 'lunch', ingredients: [['turkey', 150], ['potato', 220], ['cucumber', 100], ['tomato', 100]], instructions: 'Приготовь индейку и картофель, подавай со свежими овощами.' },
  { id: 'chicken-soup', title: 'Куриный суп с овощами', mealType: 'lunch', ingredients: [['chicken-breast', 100], ['potato', 150], ['carrot', 60], ['onion', 40]], instructions: 'Отвари курицу и овощи до готовности, приправь по вкусу.' },
  { id: 'beef-buckwheat', title: 'Говядина с гречкой', mealType: 'lunch', ingredients: [['beef', 140], ['buckwheat-cooked', 180], ['tomato', 100]], instructions: 'Подавай тушёную говядину с гречкой и помидором.' },
  { id: 'salmon-rice-broccoli', title: 'Лосось с рисом и брокколи', mealType: 'dinner', ingredients: [['salmon', 150], ['rice-cooked', 160], ['broccoli', 150]], instructions: 'Запеки или обжарь лосось, подавай с рисом и брокколи.' },
  { id: 'baked-chicken-potato', title: 'Запечённая курица с картофелем', mealType: 'dinner', ingredients: [['chicken-breast', 160], ['potato', 220], ['carrot', 80], ['olive-oil', 8]], instructions: 'Запекай курицу и овощи до готовности.' },
  { id: 'turkey-pasta', title: 'Паста с индейкой и томатами', mealType: 'dinner', ingredients: [['turkey', 150], ['pasta-cooked', 190], ['tomato', 120], ['onion', 30]], instructions: 'Обжарь индейку с луком и томатами, добавь пасту.' },
  { id: 'vegetable-bowl', title: 'Овощной боул с яйцом', mealType: 'dinner', ingredients: [['egg', 100], ['potato', 150], ['broccoli', 150], ['tomato', 100]], instructions: 'Разложи приготовленные овощи и яйцо в глубокой тарелке.' },
  { id: 'salmon-potato-salad', title: 'Лосось с картофелем и салатом', mealType: 'dinner', ingredients: [['salmon', 150], ['potato', 200], ['cucumber', 100], ['tomato', 100]], instructions: 'Приготовь лосось и картофель, подавай с овощным салатом.' },
  { id: 'cottage-cheese-banana', title: 'Творог с бананом', mealType: 'snack', ingredients: [['cottage-cheese', 150], ['banana', 100]], instructions: 'Смешай творог с нарезанным бананом.' },
  { id: 'kefir-apple', title: 'Кефир и яблоко', mealType: 'snack', ingredients: [['kefir', 250], ['apple', 150]], instructions: 'Простой перекус без приготовления.' },
  { id: 'yogurt-apple', title: 'Йогурт с яблоком', mealType: 'snack', ingredients: [['yogurt', 180], ['apple', 120]], instructions: 'Нарежь яблоко и добавь в йогурт.' },
  { id: 'cheese-sandwich', title: 'Сэндвич с сыром', mealType: 'snack', ingredients: [['bread', 60], ['cheese', 35], ['cucumber', 80]], instructions: 'Собери сэндвич с сыром и свежим огурцом.' },
]

const foodById = new Map(LOCAL_FOODS.map((food) => [food.id, food]))

export const POPULAR_RECIPES: MealRecipe[] = SOURCES.map((source) => {
  const ingredients = source.ingredients.flatMap(([foodId, amount]) => {
    const food = foodById.get(foodId)
    if (!food) return []
    const ingredient: MealIngredient = {
      id: `popular:${source.id}:${foodId}`,
      name: food.name,
      amount,
      unit: 'g',
      nutritionPer100g: food.nutritionPer100g,
      source: 'local',
      sourceId: food.id,
    }
    return [ingredient]
  })
  return {
    id: `popular:${source.id}`,
    workspaceId: 'builtin',
    title: source.title,
    mealType: source.mealType,
    servings: 1,
    imageUrl: '',
    instructions: source.instructions,
    ingredients,
    nutritionPerServing: calculateRecipeNutrition(ingredients, 1),
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
})
