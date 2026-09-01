<template>
  <UiModal
    :model-value="modelValue"
    :title="copying ? 'Блюдо из справочника' : recipe ? 'Изменить блюдо' : 'Новое блюдо'"
    eyebrow="Питание"
    width="820px"
    dialog-class="meal-recipe-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="recipe-form" @submit.prevent="submit">
      <section class="recipe-basics">
        <UiInput v-model="form.title" autofocus label="Название" placeholder="Например, гречка с курицей" required />
        <label class="recipe-field">
          <span>Приём пищи</span>
          <UiSelect v-model="form.mealType">
            <option value="breakfast">Завтрак</option>
            <option value="lunch">Обед</option>
            <option value="dinner">Ужин</option>
            <option value="snack">Перекус</option>
          </UiSelect>
        </label>
        <UiInput v-model="form.servings" label="Порций в рецепте" type="number" min="1" max="100" />
        <UiInput v-model="form.imageUrl" label="Ссылка на фото" placeholder="Необязательно" />
      </section>

      <section class="recipe-section">
        <header>
          <div>
            <h3>Ингредиенты</h3>
            <p>Новый продукт сохраняется в общем справочнике пространства. Если данные заполнены, калории посчитаются автоматически.</p>
          </div>
        </header>

        <div class="ingredient-search">
          <UiInput
            v-model="foodQuery"
            placeholder="Название продукта или штрихкод"
            @keydown.enter.prevent="searchExternal"
          />
          <UiButton type="button" variant="secondary" icon="search" :loading="externalLoading" @click="searchExternal">
            Найти в Open Food Facts
          </UiButton>
        </div>
        <div class="manual-product-action">
          <span>Нет нужного продукта в поиске?</span>
          <UiButton type="button" variant="ghost" icon="plus" @click="toggleManualProduct">
            {{ manualProductOpen ? 'Скрыть форму' : 'Добавить вручную' }}
          </UiButton>
        </div>

        <MealManualProductForm
          v-if="manualProductOpen"
          :suggested-name="foodQuery"
          @add="addManualProduct"
        />
        <p v-if="externalError" class="recipe-error">{{ externalError }}</p>
        <p class="off-attribution">
          Поиск выполняется напрямую с устройства.
          <a href="https://world.openfoodfacts.org/" target="_blank" rel="noreferrer">Данные Open Food Facts</a>
        </p>

        <div v-if="foodQuery.trim().length >= 2" class="food-results">
          <button
            v-for="food in displayedFoods"
            :key="`${food.source}:${food.id}`"
            type="button"
            @click="addFood(food)"
          >
            <span><b>{{ food.name }}</b><small>{{ food.brand || sourceLabel(food.source) }}</small></span>
            <strong>{{ nutritionLabel(food.nutritionPer100g.calories) }}</strong>
          </button>
          <p v-if="!displayedFoods.length && !externalLoading">Ничего не найдено. Блюдо всё равно можно сохранить без состава.</p>
        </div>

        <div v-if="form.ingredients.length" class="ingredient-list">
          <article v-for="ingredient in form.ingredients" :key="ingredient.id">
            <div>
              <strong>{{ ingredient.name }}</strong>
              <small>{{ ingredient.nutritionPer100g ? nutritionLabel(ingredient.nutritionPer100g.calories) : 'Без пищевых данных' }}</small>
            </div>
            <UiInput v-model="ingredient.amount" type="text" inputmode="decimal" aria-label="Количество" />
            <UiSelect v-model="ingredient.unit" aria-label="Единица">
              <option value="g">г</option>
              <option value="ml">мл</option>
              <option value="piece">шт.</option>
            </UiSelect>
            <UiIconButton icon="trash" label="Удалить ингредиент" variant="danger" @click="removeIngredient(ingredient.id)" />
          </article>
        </div>
      </section>

      <section class="recipe-section">
        <header>
          <div>
            <h3>На одну порцию</h3>
            <p>Можно оставить пустым или заменить автоматически рассчитанные значения.</p>
          </div>
          <UiButton
            v-if="hasCalculatedNutrition"
            type="button"
            variant="ghost"
            @click="applyCalculatedNutrition"
          >
            Подставить расчёт
          </UiButton>
        </header>
        <div class="nutrition-inputs">
          <UiInput v-model="form.calories" label="Калории" type="text" inputmode="decimal" placeholder="ккал" />
          <UiInput v-model="form.protein" label="Белки" type="text" inputmode="decimal" placeholder="г" />
          <UiInput v-model="form.fat" label="Жиры" type="text" inputmode="decimal" placeholder="г" />
          <UiInput v-model="form.carbs" label="Углеводы" type="text" inputmode="decimal" placeholder="г" />
        </div>
      </section>

      <UiInput v-model="form.instructions" type="textarea" label="Как приготовить" placeholder="Необязательно" />
      <p v-if="formError" class="recipe-error">{{ formError }}</p>

      <footer>
        <UiButton type="button" variant="secondary" @click="emit('update:modelValue', false)">Отмена</UiButton>
        <UiButton type="submit" icon="check" :loading="saving">Сохранить блюдо</UiButton>
      </footer>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIconButton from '../../../components/ui/UiIconButton.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import MealManualProductForm from './MealManualProductForm.vue'
import { LOCAL_FOODS } from '../data/localFoods'
import { searchOpenFoodFacts } from '../api/openFoodFacts.api'
import { calculateRecipeNutrition, parseMealDecimal } from '../services/mealNutrition.service'
import { cloneMealIngredients } from '../services/mealPlan.service'
import type { FoodReference, MealIngredient, MealProductDraft, MealRecipe, MealType } from '../types/meals.types'

type RecipeDraft = Omit<MealRecipe, 'id' | 'workspaceId' | 'archivedAt' | 'createdAt' | 'updatedAt'>

const props = defineProps<{
  modelValue: boolean
  recipe?: MealRecipe | null
  saving?: boolean
  copying?: boolean
  customFoods?: FoodReference[]
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [draft: RecipeDraft]
  'save-product': [product: MealProductDraft]
}>()

const form = reactive({
  title: '',
  mealType: 'dinner' as MealType,
  servings: '1',
  imageUrl: '',
  instructions: '',
  ingredients: [] as MealIngredient[],
  calories: '',
  protein: '',
  fat: '',
  carbs: '',
})
const foodQuery = ref('')
const externalResults = ref<FoodReference[]>([])
const externalLoading = ref(false)
const externalError = ref('')
const formError = ref('')
const manualProductOpen = ref(false)

const localResults = computed(() => {
  const query = normalize(foodQuery.value)
  if (query.length < 2) return []
  return [...(props.customFoods || []), ...LOCAL_FOODS]
    .filter((food) => normalize(`${food.name} ${food.brand || ''}`).includes(query))
    .slice(0, 8)
})
const displayedFoods = computed(() => {
  const unique = new Map<string, FoodReference>()
  ;[...localResults.value, ...externalResults.value].forEach((food) => unique.set(`${food.source}:${food.id}`, food))
  return [...unique.values()].slice(0, 12)
})
const calculatedNutrition = computed(() => calculateRecipeNutrition(
  form.ingredients.map((item) => ({ ...item, amount: Math.max(0, parseMealDecimal(item.amount) ?? 0) })),
  Math.max(1, Number(form.servings) || 1),
))
const hasCalculatedNutrition = computed(() => calculatedNutrition.value.calories != null)

watch(() => props.modelValue, (opened) => {
  if (!opened) return
  const nutrition = props.recipe?.nutritionPerServing
  Object.assign(form, {
    title: props.recipe?.title || '',
    mealType: props.recipe?.mealType || 'dinner',
    servings: String(props.recipe?.servings || 1),
    imageUrl: props.recipe?.imageUrl || '',
    instructions: props.recipe?.instructions || '',
    ingredients: cloneMealIngredients(props.recipe?.ingredients || []),
    calories: nutrition?.calories == null ? '' : String(nutrition.calories),
    protein: nutrition?.protein == null ? '' : String(nutrition.protein),
    fat: nutrition?.fat == null ? '' : String(nutrition.fat),
    carbs: nutrition?.carbs == null ? '' : String(nutrition.carbs),
  })
  foodQuery.value = ''
  externalResults.value = []
  externalError.value = ''
  formError.value = ''
  manualProductOpen.value = false
}, { immediate: true })

async function searchExternal() {
  if (foodQuery.value.trim().length < 3) {
    externalError.value = 'Введи минимум три символа или штрихкод'
    return
  }
  externalLoading.value = true
  externalError.value = ''
  try {
    externalResults.value = await searchOpenFoodFacts(foodQuery.value)
    if (!externalResults.value.length) externalError.value = 'В Open Food Facts ничего не найдено'
  } catch (error) {
    externalError.value = error instanceof Error ? error.message : 'Не удалось выполнить поиск'
  } finally {
    externalLoading.value = false
  }
}

function addFood(food: FoodReference) {
  const existing = form.ingredients.find((item) => item.source === food.source && item.sourceId === food.id)
  if (existing) {
    existing.amount += 100
    return
  }
  form.ingredients.push({
    id: crypto.randomUUID(),
    name: food.name,
    amount: food.defaultUnit === 'piece' ? 1 : 100,
    unit: food.defaultUnit || 'g',
    nutritionPer100g: { ...food.nutritionPer100g },
    source: food.source,
    sourceId: food.id,
  })
}

function toggleManualProduct() {
  manualProductOpen.value = !manualProductOpen.value
}

function addManualProduct(ingredient: MealIngredient, product: MealProductDraft) {
  form.ingredients.push(ingredient)
  emit('save-product', product)
  foodQuery.value = ''
  externalResults.value = []
  manualProductOpen.value = false
}

function removeIngredient(id: string) {
  form.ingredients = form.ingredients.filter((item) => item.id !== id)
}

function applyCalculatedNutrition() {
  form.calories = toInput(calculatedNutrition.value.calories)
  form.protein = toInput(calculatedNutrition.value.protein)
  form.fat = toInput(calculatedNutrition.value.fat)
  form.carbs = toInput(calculatedNutrition.value.carbs)
}

function submit() {
  const title = form.title.trim()
  if (!title) {
    formError.value = 'Укажи название блюда'
    return
  }
  formError.value = ''
  emit('save', {
    title,
    mealType: form.mealType,
    servings: Math.max(1, Math.min(100, Number(form.servings) || 1)),
    imageUrl: form.imageUrl.trim(),
    instructions: form.instructions.trim(),
    ingredients: form.ingredients.map((item) => ({
      ...item,
      amount: Math.max(0, parseMealDecimal(item.amount) ?? 0),
    })),
    nutritionPerServing: {
      calories: numberOrNull(form.calories) ?? calculatedNutrition.value.calories,
      protein: numberOrNull(form.protein) ?? calculatedNutrition.value.protein,
      fat: numberOrNull(form.fat) ?? calculatedNutrition.value.fat,
      carbs: numberOrNull(form.carbs) ?? calculatedNutrition.value.carbs,
    },
  })
}

function normalize(value: string) {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim()
}

function numberOrNull(value: string) {
  const number = parseMealDecimal(value)
  return number == null ? null : Math.max(0, number)
}

function toInput(value: number | null) {
  return value == null ? '' : String(value)
}

function nutritionLabel(value: number | null) {
  return value == null ? 'ккал не указаны' : `${Math.round(value)} ккал / 100 г`
}

function sourceLabel(source: FoodReference['source']) {
  if (source === 'manual') return 'Общий справочник'
  return source === 'local' ? 'Встроенный справочник' : 'Open Food Facts'
}
</script>

<style scoped>
.recipe-form{display:grid;gap:18px}.recipe-basics{display:grid;grid-template-columns:2fr 1fr .7fr;gap:10px}.recipe-basics>:last-child{grid-column:1/-1}.recipe-field{display:grid;gap:5px}.recipe-field>span{color:var(--text-secondary);font-size:11px;font-weight:700}.recipe-field :deep(.ui-select__trigger){width:100%;height:36px}.recipe-section{display:grid;gap:12px;border:1px solid var(--border-color);border-radius:16px;padding:14px;background:var(--card-soft)}.recipe-section>header{display:flex;align-items:center;justify-content:space-between;gap:12px}.recipe-section h3{margin:0;font-size:15px}.recipe-section p{margin:3px 0 0;color:var(--text-muted);font-size:10px}.ingredient-search{display:grid;grid-template-columns:1fr auto;gap:8px}.manual-product-action{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--border-color);padding-top:8px;color:var(--text-muted);font-size:10px}.off-attribution a{color:var(--accent);text-decoration:none}.food-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.food-results>button{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid var(--border-color);border-radius:11px;padding:9px;color:var(--text-primary);background:var(--control-bg);text-align:left}.food-results span,.food-results small{display:block;min-width:0}.food-results b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.food-results small{margin-top:2px;color:var(--text-muted);font-size:8px}.food-results strong{flex:none;color:var(--success);font-size:9px}.food-results>p{grid-column:1/-1}.ingredient-list{display:grid;gap:6px}.ingredient-list article{display:grid;grid-template-columns:minmax(150px,1fr) 90px 82px 34px;align-items:center;gap:7px;border-top:1px solid var(--border-color);padding-top:7px}.ingredient-list strong,.ingredient-list small{display:block}.ingredient-list strong{font-size:11px}.ingredient-list small{color:var(--text-muted);font-size:8px}.ingredient-list :deep(.ui-input__control),.ingredient-list :deep(.ui-select__trigger){height:34px}.nutrition-inputs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.recipe-error{margin:0;color:var(--danger);font-size:10px}.recipe-form>footer{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--border-color);padding-top:12px}@media(max-width:700px){.recipe-basics,.nutrition-inputs{grid-template-columns:1fr 1fr}.recipe-basics>:last-child{grid-column:1/-1}.food-results{grid-template-columns:1fr}.ingredient-search{grid-template-columns:1fr}.ingredient-list article{grid-template-columns:1fr 80px 72px 34px}.ingredient-list article>div{grid-column:1/-1}}@media(max-width:460px){.recipe-basics,.nutrition-inputs{grid-template-columns:1fr}.recipe-basics>:last-child{grid-column:auto}.manual-product-action{align-items:flex-start;flex-direction:column}}
</style>
