import { computed, reactive } from 'vue'

export interface BudgetRuleFormItem {
  key: string
  id?: string
  title: string
  defaultAmount: string | number
  dueDay: string | number
  categoryName: string
  reminder: 'none' | '1h' | '1d'
  calendarEnabled: boolean
  active?: boolean
}

export interface BudgetCategoryFormItem {
  key: string
  id?: string
  templateId?: string | null
  name: string
  defaultAmount: string | number
  amount?: string | number
  color: string
  active?: boolean
}

interface BudgetSetupSource {
  settings?: { defaultIncome?: number } | null
  rules?: Array<Partial<BudgetRuleFormItem>>
  categories?: Array<Partial<BudgetCategoryFormItem>>
}

const CATEGORY_COLORS = ['#60a5fa', '#34d399', '#f59e0b', '#a78bfa', '#fb7185', '#22d3ee']

export function useBudgetForm() {
  const form = reactive({
    defaultIncome: '' as string | number,
    rules: [] as BudgetRuleFormItem[],
    categories: [] as BudgetCategoryFormItem[],
  })

  const requiredTotal = computed(() => sumAmounts(form.rules.map((item) => item.defaultAmount)))
  const flexibleTotal = computed(() => sumAmounts(form.categories.map((item) => item.defaultAmount)))
  const plannedTotal = computed(() => requiredTotal.value + flexibleTotal.value)
  const remaining = computed(() => toAmount(form.defaultIncome) - plannedTotal.value)

  function reset(source: BudgetSetupSource = {}) {
    form.defaultIncome = source.settings?.defaultIncome || ''
    form.rules = (source.rules || []).filter((item) => item.active !== false).map((item) => ({
      key: item.key || createKey(),
      id: item.id,
      title: item.title || '',
      defaultAmount: item.defaultAmount || '',
      dueDay: item.dueDay || 1,
      categoryName: item.categoryName || 'Обязательные расходы',
      reminder: item.reminder || '1d',
      calendarEnabled: item.calendarEnabled !== false,
    }))
    form.categories = (source.categories || []).filter((item) => item.active !== false).map((item, index) => ({
      key: item.key || createKey(),
      id: item.id,
      templateId: item.templateId || null,
      name: item.name || '',
      defaultAmount: item.defaultAmount ?? item.amount ?? '',
      amount: item.amount,
      color: item.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }))
  }

  function addRule() {
    form.rules.push({
      key: createKey(),
      title: '',
      defaultAmount: '',
      dueDay: 1,
      categoryName: 'Обязательные расходы',
      reminder: '1d',
      calendarEnabled: true,
    })
  }

  function addCategory(name = '', amount: string | number = '') {
    form.categories.push({
      key: createKey(),
      name,
      defaultAmount: amount,
      color: CATEGORY_COLORS[form.categories.length % CATEGORY_COLORS.length],
    })
  }

  function removeRule(key: string) {
    form.rules = form.rules.filter((item) => item.key !== key)
  }

  function removeCategory(key: string) {
    form.categories = form.categories.filter((item) => item.key !== key)
  }

  function validate() {
    if (toAmount(form.defaultIncome) <= 0) return 'Укажи обычный доход за месяц'
    if (form.rules.some((item) => !item.title.trim())) return 'Заполни названия обязательных расходов'
    if (form.categories.some((item) => !item.name.trim())) return 'Заполни названия категорий'
    return ''
  }

  return {
    form,
    requiredTotal,
    flexibleTotal,
    plannedTotal,
    remaining,
    reset,
    addRule,
    addCategory,
    removeRule,
    removeCategory,
    validate,
  }
}

export function toAmount(value: string | number | null | undefined) {
  const amount = Number(String(value ?? 0).replace(',', '.'))
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100) / 100) : 0
}

function sumAmounts(values: Array<string | number>) {
  return values.reduce<number>((total, value) => total + toAmount(value), 0)
}

function createKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
