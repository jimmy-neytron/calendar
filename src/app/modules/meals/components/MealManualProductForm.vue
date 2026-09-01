<template>
  <section class="manual-product">
    <header>
      <h4>Свой продукт</h4>
      <p>Пищевая ценность указывается на 100 г.</p>
    </header>
    <UiInput
      ref="nameInput"
      v-model="form.name"
      label="Название"
      placeholder="Например, домашняя гранола"
      required
      @keydown.enter.prevent="submit"
    />
    <div class="manual-product__meta">
      <UiInput v-model="form.brand" label="Бренд или пометка" placeholder="Необязательно" @keydown.enter.prevent="submit" />
      <label>
        <span>Единица по умолчанию</span>
        <UiSelect v-model="form.defaultUnit">
          <option value="g">г</option>
          <option value="ml">мл</option>
          <option value="piece">шт.</option>
        </UiSelect>
      </label>
    </div>
    <div class="manual-product__nutrition">
      <UiInput v-model="form.calories" label="Калории" inputmode="decimal" placeholder="ккал" @keydown.enter.prevent="submit" />
      <UiInput v-model="form.protein" label="Белки" inputmode="decimal" placeholder="г" @keydown.enter.prevent="submit" />
      <UiInput v-model="form.fat" label="Жиры" inputmode="decimal" placeholder="г" @keydown.enter.prevent="submit" />
      <UiInput v-model="form.carbs" label="Углеводы" inputmode="decimal" placeholder="г" @keydown.enter.prevent="submit" />
    </div>
    <p v-if="error" class="manual-product__error">{{ error }}</p>
    <footer><UiButton type="button" icon="plus" @click="submit">Добавить в состав</UiButton></footer>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import { parseMealDecimal } from '../services/mealNutrition.service'
import type { MealIngredient, MealNutrition, MealProductDraft } from '../types/meals.types'

const props = defineProps<{ suggestedName?: string }>()
const emit = defineEmits<{ add: [ingredient: MealIngredient, product: MealProductDraft] }>()
const nameInput = ref<{ focus: () => void } | null>(null)
const error = ref('')
const form = reactive({
  name: props.suggestedName?.trim() || '',
  brand: '',
  defaultUnit: 'g' as MealIngredient['unit'],
  calories: '',
  protein: '',
  fat: '',
  carbs: '',
})

onMounted(async () => {
  await nextTick()
  nameInput.value?.focus()
})

function submit() {
  const name = form.name.trim()
  if (!name) {
    error.value = 'Укажи название продукта'
    nameInput.value?.focus()
    return
  }
  const nutrition: MealNutrition = {
    calories: toNutritionValue(form.calories),
    protein: toNutritionValue(form.protein),
    fat: toNutritionValue(form.fat),
    carbs: toNutritionValue(form.carbs),
  }
  const id = crypto.randomUUID()
  const product: MealProductDraft = {
    id,
    name,
    brand: form.brand.trim(),
    defaultUnit: form.defaultUnit,
    nutritionPer100g: nutrition,
  }
  emit('add', {
    id: crypto.randomUUID(),
    name,
    amount: form.defaultUnit === 'piece' ? 1 : 100,
    unit: form.defaultUnit,
    nutritionPer100g: Object.values(nutrition).some((value) => value != null) ? nutrition : null,
    source: 'manual',
    sourceId: id,
  }, product)
}

function toNutritionValue(value: string) {
  const number = parseMealDecimal(value)
  return number == null ? null : Math.max(0, number)
}
</script>

<style scoped>
.manual-product{display:grid;grid-template-columns:minmax(180px,1fr) 2fr;gap:10px;border:1px solid var(--accent-border);border-radius:14px;padding:12px;background:var(--accent-soft)}.manual-product>header,.manual-product>footer,.manual-product__error,.manual-product__meta{grid-column:1/-1}.manual-product h4,.manual-product p{margin:0}.manual-product h4{font-size:13px}.manual-product header p{margin-top:2px;color:var(--text-muted);font-size:9px}.manual-product__meta{display:grid;grid-template-columns:1fr 190px;gap:8px}.manual-product__meta label{display:grid;gap:5px}.manual-product__meta label>span{color:var(--text-secondary);font-size:11px;font-weight:700}.manual-product__meta :deep(.ui-select__trigger){width:100%;height:36px}.manual-product__nutrition{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.manual-product__error{color:var(--danger);font-size:10px}.manual-product>footer{display:flex;justify-content:flex-end}@media(max-width:700px){.manual-product{grid-template-columns:1fr}.manual-product__nutrition{grid-template-columns:1fr 1fr}}@media(max-width:460px){.manual-product__meta,.manual-product__nutrition{grid-template-columns:1fr}}
</style>
