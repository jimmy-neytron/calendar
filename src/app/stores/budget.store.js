import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { useLocalStorage } from '../composables/storage/useLocalStorage.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { workspaceStore } from './workspace.store.js'
import { calendarStore } from './calendar.store.js'

const { state: budgets } = useLocalStorage(`${APP_CONFIG.storageKey}:budgets`, [])
const { state: selectedMonth } = useLocalStorage(
  `${APP_CONFIG.storageKey}:budget-selected-month`,
  getCurrentMonth()
)

const currentBudget = computed(() => {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  const budget = budgets.value.find((item) => (
    item.workspaceId === workspaceId && item.month === selectedMonth.value
  ))
  const legacyBudget = selectedMonth.value === getCurrentMonth()
    ? budgets.value.find((item) => item.workspaceId === workspaceId && !item.month)
    : null
  return normalizeBudget(budget || legacyBudget || createEmptyBudget(workspaceId, selectedMonth.value))
})

const plannedTotal = computed(() => currentBudget.value.categories
  .reduce((total, category) => total + toAmount(category.amount), 0))
const remainingAmount = computed(() => toAmount(currentBudget.value.income) - plannedTotal.value)
const allocatedPercent = computed(() => {
  const income = toAmount(currentBudget.value.income)
  if (!income) return 0
  return Math.round((plannedTotal.value / income) * 100)
})

function updateSettings(updates) {
  updateCurrentBudget((budget) => ({
    ...budget,
    ...updates,
    income: updates.income === undefined ? budget.income : toAmount(updates.income),
    updatedAt: new Date().toISOString(),
  }))
}

function setSelectedMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) return
  selectedMonth.value = month
}

function addCategory(name, amount = 0) {
  const title = String(name || '').trim()
  if (!title) return { ok: false, message: 'Укажи название раздела' }
  if (currentBudget.value.categories.some((category) => category.name.toLowerCase() === title.toLowerCase())) {
    return { ok: false, message: 'Такой раздел уже существует' }
  }

  const category = {
    id: generateId(),
    name: title,
    amount: toAmount(amount),
    payments: [],
  }
  updateCurrentBudget((budget) => ({
    ...budget,
    categories: [...budget.categories, category],
    updatedAt: new Date().toISOString(),
  }))
  return { ok: true, category }
}

function updateCategory(id, updates) {
  updateCurrentBudget((budget) => ({
    ...budget,
    categories: budget.categories.map((category) => category.id === id
      ? {
          ...category,
          ...updates,
          name: updates.name === undefined ? category.name : String(updates.name).trim(),
          amount: updates.amount === undefined ? category.amount : toAmount(updates.amount),
        }
      : category),
    updatedAt: new Date().toISOString(),
  }))
}

async function removeCategory(id) {
  const category = currentBudget.value.categories.find((item) => item.id === id)
  if (!category) return { ok: false, message: 'Раздел не найден' }

  const deletionResults = await Promise.all((category.payments || [])
    .filter((payment) => payment.calendarEventId)
    .map((payment) => calendarStore.deleteEventAndWait(payment.calendarEventId)))
  if (deletionResults.some((result) => !result.ok)) {
    return { ok: false, message: 'Не удалось удалить связанные события календаря' }
  }

  updateCurrentBudget((budget) => ({
    ...budget,
    categories: budget.categories.filter((category) => category.id !== id),
    updatedAt: new Date().toISOString(),
  }))
  return { ok: true }
}

async function addPayment(categoryId, data) {
  const category = currentBudget.value.categories.find((item) => item.id === categoryId)
  if (!category) return { ok: false, message: 'Раздел бюджета не найден' }

  const title = String(data.title || '').trim()
  const date = String(data.date || '')
  if (!title) return { ok: false, message: 'Укажи название платежа' }
  if (!date) return { ok: false, message: 'Выбери дату платежа' }
  if (!date.startsWith(`${selectedMonth.value}-`)) {
    return { ok: false, message: 'Дата платежа должна быть в выбранном месяце бюджета' }
  }

  const amount = toAmount(data.amount)
  const reminder = ['none', '1h', '1d'].includes(data.reminder) ? data.reminder : '1d'
  const eventResult = await calendarStore.addEventAndWait({
    title: `Оплатить: ${title} · ${formatAmount(amount)}`,
    date,
    startTime: '09:00',
    endTime: '09:30',
    memberIds: [],
    category: 'home',
    notes: `Платёж из бюджета · ${category.name}`,
    allDay: false,
    repeat: 'none',
    repeatUntil: '',
    repeatEndType: 'never',
    repeatCount: 0,
    repeatInterval: 1,
    repeatUnit: 'month',
    repeatWeekdays: [],
    importance: 'important',
    reminder,
  })
  if (!eventResult.ok) {
    return {
      ok: false,
      message: Object.values(eventResult.errors || {})[0] || 'Не удалось создать событие в календаре',
    }
  }

  const payment = {
    id: generateId(),
    title,
    amount,
    date,
    reminder,
    paid: false,
    calendarEventId: eventResult.event.id,
    createdAt: new Date().toISOString(),
  }
  updateCurrentBudget((budget) => ({
    ...budget,
    categories: budget.categories.map((item) => item.id === categoryId
      ? { ...item, payments: [...(item.payments || []), payment] }
      : item),
    updatedAt: new Date().toISOString(),
  }))
  return { ok: true, payment, event: eventResult.event }
}

function togglePaymentPaid(categoryId, paymentId) {
  updateCurrentBudget((budget) => ({
    ...budget,
    categories: budget.categories.map((category) => category.id === categoryId
      ? {
          ...category,
          payments: (category.payments || []).map((payment) => payment.id === paymentId
            ? { ...payment, paid: !payment.paid }
            : payment),
        }
      : category),
    updatedAt: new Date().toISOString(),
  }))
}

async function removePayment(categoryId, paymentId) {
  const category = currentBudget.value.categories.find((item) => item.id === categoryId)
  const payment = category?.payments?.find((item) => item.id === paymentId)
  if (!payment) return { ok: false, message: 'Платёж не найден' }

  if (payment.calendarEventId) {
    const result = await calendarStore.deleteEventAndWait(payment.calendarEventId)
    if (!result.ok) return { ok: false, message: 'Не удалось удалить событие из календаря' }
  }

  updateCurrentBudget((budget) => ({
    ...budget,
    categories: budget.categories.map((item) => item.id === categoryId
      ? { ...item, payments: (item.payments || []).filter((entry) => entry.id !== paymentId) }
      : item),
    updatedAt: new Date().toISOString(),
  }))
  return { ok: true }
}

function disableRecurringPayments() {
  const recurringPayments = currentBudget.value.categories.flatMap((category) => (
    (category.payments || [])
      .filter((payment) => payment.repeat === 'monthly')
      .map((payment) => ({ categoryId: category.id, payment }))
  ))
  if (!recurringPayments.length) return

  recurringPayments.forEach(({ payment }) => {
    if (payment.calendarEventId) {
      calendarStore.updateEvent(payment.calendarEventId, {
        repeat: 'none',
        repeatUntil: '',
        repeatEndType: 'never',
      })
    }
  })

  updateCurrentBudget((budget) => ({
    ...budget,
    categories: budget.categories.map((category) => ({
      ...category,
      payments: (category.payments || []).map((payment) => {
        if (payment.repeat !== 'monthly') return payment
        const { repeat, ...oneTimePayment } = payment
        return oneTimePayment
      }),
    })),
    updatedAt: new Date().toISOString(),
  }))
}

function resetBudget() {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  budgets.value = [
    ...budgets.value.filter((budget) => !(
      budget.workspaceId === workspaceId
      && (
        budget.month === selectedMonth.value
        || (!budget.month && selectedMonth.value === getCurrentMonth())
      )
    )),
    createEmptyBudget(workspaceId, selectedMonth.value),
  ]
}

function updateCurrentBudget(transform) {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId) return
  const existing = budgets.value.find((budget) => (
    budget.workspaceId === workspaceId && budget.month === selectedMonth.value
  ))
    || (selectedMonth.value === getCurrentMonth()
      ? budgets.value.find((budget) => budget.workspaceId === workspaceId && !budget.month)
      : null)
    || createEmptyBudget(workspaceId, selectedMonth.value)
  const normalized = normalizeBudget(existing)
  const nextBudget = transform(normalized)
  budgets.value = [
    ...budgets.value.filter((budget) => !(
      budget.workspaceId === workspaceId
      && (
        budget.month === selectedMonth.value
        || (!budget.month && selectedMonth.value === getCurrentMonth())
      )
    )),
    { ...nextBudget, month: selectedMonth.value },
  ]
}

function createEmptyBudget(workspaceId, month = selectedMonth.value) {
  return {
    workspaceId: workspaceId || '',
    month,
    income: 0,
    categories: [],
    updatedAt: new Date().toISOString(),
  }
}

function normalizeBudget(budget) {
  return {
    ...createEmptyBudget(budget.workspaceId, budget.month || selectedMonth.value),
    ...budget,
    month: budget.month || selectedMonth.value,
    categories: Array.isArray(budget.categories)
      ? budget.categories.map((category) => ({
          ...category,
          amount: toAmount(category.amount),
          payments: Array.isArray(category.payments) ? category.payments : [],
        }))
      : [],
  }
}

function getCurrentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function toAmount(value) {
  const amount = Number(String(value ?? 0).replace(',', '.'))
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100) / 100) : 0
}

function formatAmount(value) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)
}

export const budgetStore = {
  selectedMonth,
  currentBudget,
  plannedTotal,
  remainingAmount,
  allocatedPercent,
  setSelectedMonth,
  updateSettings,
  addCategory,
  updateCategory,
  removeCategory,
  addPayment,
  togglePaymentPaid,
  removePayment,
  disableRecurringPayments,
  resetBudget,
}
