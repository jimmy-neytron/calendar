<template>
  <UiModal
    :model-value="modelValue"
    :title="`План на ${monthLabel}`"
    eyebrow="Только текущий месяц"
    width="780px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form class="month-form" @submit.prevent="submit">
      <div class="month-intro">
        <span><UiIcon name="sparkles" /></span>
        <div>
          <strong>Обязательные расходы уже в календаре</strong>
          <p>Настрой только желаемые траты месяца.</p>
        </div>
      </div>

      <div class="month-summary">
        <UiInput
          v-model="income"
          type="number"
          label="Доход в этом месяце"
          min="0"
          step="100"
          inputmode="decimal"
        />
        <article>
          <span>Обязательные автоматически</span>
          <strong>{{ formatMoney(requiredTotal) }}</strong>
          <small>{{ requiredCount }} событий в календаре</small>
        </article>
      </div>

      <section class="month-categories">
        <header>
          <div>
            <small>Под моим контролем</small>
            <h3>Желаемые траты</h3>
          </div>
          <strong>{{ formatMoney(flexibleTotal) }}</strong>
        </header>

        <div v-if="availableTemplates.length" class="template-chips">
          <span>Вернуть из шаблона:</span>
          <UiButton
            v-for="template in availableTemplates"
            :key="template.id"
            type="button"
            size="sm"
            variant="secondary"
            @click="addTemplate(template)"
          >
            + {{ template.name }}
          </UiButton>
        </div>

        <div v-if="categories.length" class="month-list">
          <article v-for="category in categories" :key="category.key">
            <i :style="{ background: category.color }" />
            <UiInput v-model="category.name" label="Категория" placeholder="Продукты" />
            <UiInput v-model="category.amount" type="number" label="План, ₽" min="0" step="100" />
            <UiIconButton
              icon="trash"
              label="Убрать категорию из месяца"
              variant="danger"
              @click="remove(category.key)"
            />
          </article>
        </div>

        <UiButton type="button" class="month-add" variant="secondary" icon="plus" @click="addEmpty">
          Категория на этот месяц
        </UiButton>
      </section>

      <div class="month-result" :class="{ negative: remaining < 0 }">
        <span>{{ remaining < 0 ? 'Не хватает по плану' : 'Останется после плана' }}</span>
        <strong>{{ formatMoney(Math.abs(remaining)) }}</strong>
      </div>

      <p v-if="error" class="month-error">{{ error }}</p>

      <footer>
        <UiButton variant="secondary" @click="$emit('update:modelValue', false)">Отмена</UiButton>
        <UiButton type="submit" :loading="saving">Сохранить план месяца</UiButton>
      </footer>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toAmount } from '../../composables/budget/useBudgetForm'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiModal from '../ui/UiModal.vue'

interface Category {
  id?: string
  templateId?: string | null
  name: string
  amount: string | number
  color?: string
  payments?: Array<{ recurringRuleId?: string | null }>
}

interface Template {
  id: string
  name: string
  defaultAmount: number
  color?: string
}

const props = defineProps<{
  modelValue: boolean
  monthLabel: string
  income: number
  categories: Category[]
  templates: Template[]
  requiredTotal: number
  requiredCount: number
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [payload: { income: number; categories: Category[] }]
}>()

const income = ref<string | number>('')
const categories = ref<Array<Category & { key: string }>>([])
const error = ref('')
const flexibleTotal = computed(() => categories.value.reduce((sum, item) => sum + toAmount(item.amount), 0))
const remaining = computed(() => toAmount(income.value) - props.requiredTotal - flexibleTotal.value)
const availableTemplates = computed(() => props.templates.filter((template) => (
  !categories.value.some((category) => category.templateId === template.id)
)))

watch(() => props.modelValue, (opened) => {
  if (!opened) return
  income.value = props.income
  error.value = ''
  categories.value = props.categories
    .filter((category) => !category.payments?.some((payment) => payment.recurringRuleId))
    .map((category) => ({ ...category, key: category.id || createKey() }))
})

function addTemplate(template: Template) {
  categories.value.push({
    key: createKey(),
    templateId: template.id,
    name: template.name,
    amount: template.defaultAmount,
    color: template.color,
  })
}

function addEmpty() {
  categories.value.push({
    key: createKey(),
    name: '',
    amount: '',
    color: '#60a5fa',
  })
}

function remove(key: string) {
  categories.value = categories.value.filter((item) => item.key !== key)
}

function submit() {
  if (toAmount(income.value) <= 0) {
    error.value = 'Укажи доход этого месяца'
    return
  }
  if (categories.value.some((item) => !item.name.trim())) {
    error.value = 'Заполни названия категорий'
    return
  }
  error.value = ''
  emit('save', {
    income: toAmount(income.value),
    categories: categories.value.map(({ key, ...item }) => item),
  })
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function createKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
</script>

<style scoped>
.month-form{display:grid;gap:16px}.month-intro{display:grid;grid-template-columns:40px minmax(0,1fr);gap:11px;border:1px solid color-mix(in srgb,var(--success) 28%,var(--border-color));border-radius:14px;padding:12px;background:color-mix(in srgb,var(--success) 7%,var(--control-bg))}.month-intro>span{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;color:var(--success);background:color-mix(in srgb,var(--success) 11%,var(--field-bg));font-size:18px}.month-intro strong,.month-intro p{display:block}.month-intro p{margin:3px 0 0;color:var(--text-secondary);font-size:10px;line-height:1.45}.month-summary{display:grid;grid-template-columns:1fr 1fr;gap:9px}.month-summary>label,.month-summary>article{display:grid;gap:5px;border:1px solid var(--border-color);border-radius:13px;padding:12px;background:var(--card-soft)}.month-summary span,.month-summary small{color:var(--text-muted);font-size:9px;font-weight:750}.month-summary label>div,.month-list article>div{display:flex;align-items:center;border:1px solid var(--border-color);border-radius:9px;background:var(--field-bg);overflow:hidden}.month-summary input,.month-list input{width:100%;height:36px;border:0;padding:0 10px;color:var(--text-primary);background:transparent;outline:0}.month-summary b,.month-list b{padding-right:10px;color:var(--text-muted)}.month-summary article strong{font-size:20px}.month-categories{display:grid;gap:10px}.month-categories>header{display:flex;align-items:end;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:1px solid var(--border-color)}.month-categories header small{color:var(--info);font-size:8px;font-weight:850;text-transform:uppercase;letter-spacing:.11em}.month-categories h3{margin:3px 0 0}.month-categories header>strong{font-size:18px}.template-chips{display:flex;align-items:center;flex-wrap:wrap;gap:5px;color:var(--text-muted);font-size:9px}.template-chips button{min-height:27px;border:1px solid var(--border-color);border-radius:999px;padding:0 9px;color:var(--text-secondary);background:var(--control-bg);font-size:9px}.month-list{display:grid;gap:7px}.month-list article{display:grid;grid-template-columns:7px minmax(140px,1fr) minmax(120px,.6fr) 32px;align-items:center;gap:8px;border:1px solid var(--border-color);border-radius:12px;padding:8px;background:var(--card-soft)}.month-list article>i{width:7px;height:32px;border-radius:8px}.month-list article>input{border:1px solid var(--border-color);border-radius:9px;background:var(--field-bg)}.month-list article>button{display:grid;place-items:center;width:32px;height:36px;border:0;border-radius:9px;color:var(--text-muted);background:transparent}.month-list article>button:hover{color:var(--danger);background:color-mix(in srgb,var(--danger) 8%,transparent)}.month-add{display:flex;align-items:center;justify-content:center;gap:6px;min-height:36px;border:1px dashed var(--border-color);border-radius:11px;color:var(--text-secondary);background:var(--control-bg);font-size:10px}.month-result{display:flex;align-items:center;justify-content:space-between;border-radius:12px;padding:12px;color:var(--success);background:color-mix(in srgb,var(--success) 8%,var(--control-bg))}.month-result span{font-size:10px;font-weight:750}.month-result strong{font-size:19px}.month-result.negative{color:var(--danger);background:color-mix(in srgb,var(--danger) 8%,var(--control-bg))}.month-error{margin:0;color:var(--danger);font-size:10px}.month-form>footer{display:flex;justify-content:flex-end;gap:7px;padding-top:4px}@media(max-width:620px){.month-summary{grid-template-columns:1fr}.month-list article{grid-template-columns:7px 1fr 32px}.month-list article>div{grid-column:2/3}.month-form>footer{display:grid;grid-template-columns:1fr 1fr}.month-form>footer :deep(.ui-button){width:100%}}
.month-summary :deep(.ui-input__control),.month-list :deep(.ui-input__control){height:36px;border:1px solid var(--border-color);border-radius:var(--radius-md);background:var(--field-bg)}.month-list article>:deep(.ui-icon-button){align-self:end}.template-chips :deep(.ui-button){border-radius:999px}
</style>
