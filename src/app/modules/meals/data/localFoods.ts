import type { FoodReference } from '../types/meals.types'

const food = (
  id: string,
  name: string,
  calories: number,
  protein: number,
  fat: number,
  carbs: number,
): FoodReference => ({
  id,
  name,
  source: 'local',
  nutritionPer100g: { calories, protein, fat, carbs },
})

// Усреднённые справочные значения на 100 г. Пользователь может изменить их
// для конкретного блюда, если данные с упаковки отличаются.
export const LOCAL_FOODS: FoodReference[] = [
  food('chicken-breast', 'Куриная грудка, готовая', 165, 31, 3.6, 0),
  food('turkey', 'Индейка, филе', 135, 29, 1.7, 0),
  food('beef', 'Говядина, готовая', 250, 26, 15, 0),
  food('salmon', 'Лосось', 208, 20, 13, 0),
  food('egg', 'Яйцо куриное', 143, 12.6, 9.5, 0.7),
  food('cottage-cheese', 'Творог 5%', 121, 17, 5, 1.8),
  food('milk', 'Молоко 2,5%', 52, 2.8, 2.5, 4.7),
  food('kefir', 'Кефир 2,5%', 53, 3, 2.5, 4),
  food('yogurt', 'Йогурт натуральный', 63, 5.3, 1.6, 7),
  food('rice-cooked', 'Рис, варёный', 130, 2.7, 0.3, 28),
  food('buckwheat-cooked', 'Гречка, варёная', 110, 4.2, 1.1, 21.3),
  food('pasta-cooked', 'Макароны, варёные', 131, 5, 1.1, 25),
  food('oatmeal-cooked', 'Овсяная каша', 71, 2.5, 1.5, 12),
  food('potato', 'Картофель', 77, 2, 0.1, 17),
  food('bread', 'Хлеб пшеничный', 265, 9, 3.2, 49),
  food('olive-oil', 'Масло оливковое', 884, 0, 100, 0),
  food('butter', 'Масло сливочное', 717, 0.9, 81, 0.1),
  food('banana', 'Банан', 89, 1.1, 0.3, 23),
  food('apple', 'Яблоко', 52, 0.3, 0.2, 14),
  food('tomato', 'Помидор', 18, 0.9, 0.2, 3.9),
  food('cucumber', 'Огурец', 15, 0.7, 0.1, 3.6),
  food('carrot', 'Морковь', 41, 0.9, 0.2, 10),
  food('onion', 'Лук репчатый', 40, 1.1, 0.1, 9.3),
  food('broccoli', 'Брокколи', 34, 2.8, 0.4, 7),
  food('cheese', 'Сыр твёрдый', 356, 25, 27, 2.2),
]
