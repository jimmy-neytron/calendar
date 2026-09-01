<template>
  <UiModal
    :model-value="modelValue"
    title="Добавить продукт"
    eyebrow="Список покупок"
    width="520px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="shopping-item-form" @submit.prevent="submit">
      <UiInput
        v-model="form.name"
        autofocus
        label="Продукт"
        placeholder="Например, молоко"
        required
      />
      <div class="shopping-item-form__amount">
        <UiInput v-model="form.amount" label="Количество" inputmode="decimal" required />
        <label>
          <span>Единица</span>
          <UiSelect v-model="form.unit">
            <option value="g">г</option>
            <option value="ml">мл</option>
            <option value="piece">шт.</option>
          </UiSelect>
        </label>
      </div>
      <UiInput v-model="form.date" type="date" label="Когда купить" :min="minDate" :max="maxDate" required />
      <p v-if="error" class="shopping-item-form__error">{{ error }}</p>
      <footer>
        <UiButton type="button" variant="secondary" @click="emit('update:modelValue', false)">Отмена</UiButton>
        <UiButton type="submit" icon="plus">Добавить</UiButton>
      </footer>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import { parseMealDecimal } from '../services/mealNutrition.service'
import type { MealShoppingItem } from '../types/meals.types'

const props = defineProps<{
  modelValue: boolean
  defaultDate: string
  minDate: string
  maxDate: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  add: [item: MealShoppingItem]
}>()
const form = reactive({ name: '', amount: '1', unit: 'piece' as MealShoppingItem['unit'], date: '' })
const error = ref('')

watch(() => props.modelValue, (opened) => {
  if (!opened) return
  Object.assign(form, { name: '', amount: '1', unit: 'piece', date: props.defaultDate })
  error.value = ''
})

function submit() {
  const name = form.name.trim()
  const amount = parseMealDecimal(form.amount)
  if (!name) {
    error.value = 'Укажи название продукта'
    return
  }
  if (amount == null || amount <= 0) {
    error.value = 'Количество должно быть больше нуля'
    return
  }
  if (!form.date || form.date < props.minDate || form.date > props.maxDate) {
    error.value = 'Выбери доступный день этой недели'
    return
  }
  emit('add', {
    id: crypto.randomUUID(),
    name,
    amount: Math.round(amount * 100) / 100,
    unit: form.unit,
    date: form.date,
  })
}
</script>

<style scoped>
.shopping-item-form{display:grid;gap:14px}.shopping-item-form__amount{display:grid;grid-template-columns:1fr 130px;gap:10px}.shopping-item-form__amount label{display:grid;gap:5px}.shopping-item-form__amount label>span{color:var(--text-secondary);font-size:11px;font-weight:700}.shopping-item-form__amount :deep(.ui-select__trigger){width:100%;height:36px}.shopping-item-form__error{margin:0;color:var(--danger);font-size:10px}.shopping-item-form>footer{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--border-color);padding-top:12px}@media(max-width:480px){.shopping-item-form__amount{grid-template-columns:1fr}}
</style>
