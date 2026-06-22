import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { useLocalStorage } from '../composables/storage/useLocalStorage.js'
import { createStorage } from '../composables/storage/useStorage.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { calendarStore } from './calendar.store.js'
import { workspaceStore } from './workspace.store.js'

const monthRepository = new SyncedCollectionRepository(
  `${APP_CONFIG.storageKey}:budget-months`,
  [],
  'budget_months'
)
const categoryRepository = new SyncedCollectionRepository(
  `${APP_CONFIG.storageKey}:budget-categories`,
  [],
  'budget_categories'
)
const ruleRepository = new SyncedCollectionRepository(
  `${APP_CONFIG.storageKey}:budget-recurring-rules`,
  [],
  'budget_recurring_rules'
)
const paymentRepository = new SyncedCollectionRepository(
  `${APP_CONFIG.storageKey}:budget-payments`,
  [],
  'budget_payments'
)
const { state: selectedMonth } = useLocalStorage(
  `${APP_CONFIG.storageKey}:budget-selected-month`,
  getCurrentMonth()
)
const legacyStorage = createStorage()
let monthCreatePromise = null

const workspaceMonths = computed(() => monthRepository.items.value
  .filter((item) => item.workspaceId === workspaceStore.activeWorkspaceId.value))
const currentMonthRecord = computed(() => workspaceMonths.value.find((item) => (
  toMonthKey(item.month) === selectedMonth.value
)) || null)
const categories = computed(() => {
  const monthId = currentMonthRecord.value?.id
  if (!monthId) return []
  return categoryRepository.items.value
    .filter((item) => item.workspaceId === workspaceStore.activeWorkspaceId.value && item.budgetMonthId === monthId)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
})
const payments = computed(() => {
  const monthId = currentMonthRecord.value?.id
  if (!monthId) return []
  return paymentRepository.items.value
    .filter((item) => item.workspaceId === workspaceStore.activeWorkspaceId.value && item.budgetMonthId === monthId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
})
const recurringRules = computed(() => ruleRepository.items.value
  .filter((item) => item.workspaceId === workspaceStore.activeWorkspaceId.value)
  .sort((a, b) => Number(a.dueDay) - Number(b.dueDay)))

const currentBudget = computed(() => ({
  id: currentMonthRecord.value?.id || '',
  workspaceId: workspaceStore.activeWorkspaceId.value || '',
  month: selectedMonth.value,
  income: toAmount(currentMonthRecord.value?.plannedIncome),
  status: currentMonthRecord.value?.status || 'draft',
  categories: categories.value.map((category) => ({
    id: category.id,
    name: category.name,
    amount: toAmount(category.plannedAmount),
    color: category.color,
    payments: payments.value
      .filter((payment) => payment.categoryId === category.id)
      .map(toPaymentView),
  })),
  ungroupedPayments: payments.value.filter((payment) => !payment.categoryId).map(toPaymentView),
}))

const plannedTotal = computed(() => categories.value
  .reduce((total, category) => total + toAmount(category.plannedAmount), 0))
const remainingAmount = computed(() => currentBudget.value.income - plannedTotal.value)
const allocatedPercent = computed(() => currentBudget.value.income
  ? Math.round((plannedTotal.value / currentBudget.value.income) * 100)
  : 0)
const requiredPaymentsTotal = computed(() => payments.value
  .filter((payment) => payment.recurringRuleId)
  .reduce((total, payment) => total + toAmount(payment.plannedAmount), 0))

function setSelectedMonth(month) {
  if (/^\d{4}-\d{2}$/.test(String(month || ''))) selectedMonth.value = month
}

async function updateSettings(updates) {
  const month = await ensureCurrentMonth()
  if (!month.ok) return month
  return monthRepository.updateAndWait(month.item.id, {
    ...month.item,
    plannedIncome: updates.income === undefined
      ? month.item.plannedIncome
      : toAmount(updates.income),
    status: updates.status || month.item.status || 'draft',
    updatedAt: new Date().toISOString(),
  })
}

async function addCategory(name, amount = 0, options = {}) {
  const title = String(name || '').trim()
  if (!title) return { ok: false, message: 'Укажи название раздела' }
  if (categories.value.some((category) => category.name.toLowerCase() === title.toLowerCase())) {
    return { ok: false, message: 'Такой раздел уже существует' }
  }
  const month = await ensureCurrentMonth()
  if (!month.ok) return month

  const now = new Date().toISOString()
  const category = {
    id: generateId(),
    workspaceId: workspaceStore.activeWorkspaceId.value,
    budgetMonthId: month.item.id,
    name: title,
    plannedAmount: toAmount(amount),
    color: options.color || '#60a5fa',
    sortOrder: categories.value.length,
    createdAt: now,
    updatedAt: now,
  }
  const result = await categoryRepository.createAndWait(category)
  return result.ok ? { ok: true, category } : result
}

function updateCategory(id, updates) {
  const category = categoryRepository.findById(id)
  if (!category) return { ok: false, message: 'Раздел не найден' }
  return categoryRepository.update(id, {
    ...category,
    name: updates.name === undefined ? category.name : String(updates.name).trim(),
    plannedAmount: updates.amount === undefined ? category.plannedAmount : toAmount(updates.amount),
    updatedAt: new Date().toISOString(),
  })
}

async function removeCategory(id) {
  const linkedPayments = payments.value.filter((payment) => payment.categoryId === id)
  if (linkedPayments.some((payment) => payment.recurringRuleId)) {
    return {
      ok: false,
      message: 'Этот раздел создаётся обязательными платежами. Удали соответствующие правила выше.',
    }
  }
  for (const payment of linkedPayments) {
    const result = await removePayment(id, payment.id)
    if (!result.ok) return result
  }
  return categoryRepository.deleteAndWait(id)
}

async function addRecurringRule(data) {
  const title = String(data.title || '').trim()
  if (!title) return { ok: false, message: 'Укажи название обязательного платежа' }
  const dueDay = Math.max(1, Math.min(31, Number(data.dueDay || 1)))
  const now = new Date().toISOString()
  const rule = {
    id: generateId(),
    workspaceId: workspaceStore.activeWorkspaceId.value,
    title,
    categoryName: String(data.categoryName || 'Обязательные платежи').trim(),
    defaultAmount: toAmount(data.defaultAmount),
    dueDay,
    reminder: normalizeReminder(data.reminder),
    calendarEnabled: data.calendarEnabled !== false,
    active: data.active !== false,
    createdAt: now,
    updatedAt: now,
  }
  const result = await ruleRepository.createAndWait(rule)
  return result.ok ? { ok: true, rule } : result
}

function updateRecurringRule(id, updates) {
  const rule = ruleRepository.findById(id)
  if (!rule) return { ok: false, message: 'Правило не найдено' }
  return ruleRepository.update(id, {
    ...rule,
    ...updates,
    defaultAmount: updates.defaultAmount === undefined
      ? rule.defaultAmount
      : toAmount(updates.defaultAmount),
    dueDay: updates.dueDay === undefined
      ? rule.dueDay
      : Math.max(1, Math.min(31, Number(updates.dueDay))),
    updatedAt: new Date().toISOString(),
  })
}

async function removeRecurringRule(id) {
  const rule = ruleRepository.findById(id)
  if (!rule) return { ok: false, message: 'Обязательный платёж не найден' }

  const linkedPayments = paymentRepository.items.value.filter((payment) => payment.recurringRuleId === id)
  const linkedCategoryIds = new Set(linkedPayments.map((payment) => payment.categoryId).filter(Boolean))
  const linkedPaymentIds = new Set(linkedPayments.map((payment) => payment.id))
  const remainingPayments = paymentRepository.items.value.filter((payment) => !linkedPaymentIds.has(payment.id))
  const emptyCategoryIds = [...linkedCategoryIds].filter((categoryId) => (
    !remainingPayments.some((payment) => payment.categoryId === categoryId)
  ))

  const deletionResults = await Promise.all(linkedPayments.map(removeLinkedPayment))
  const failedDeletion = deletionResults.find((result) => !result.ok)
  if (failedDeletion) return failedDeletion

  const categoryResults = await Promise.all(
    emptyCategoryIds.map((categoryId) => categoryRepository.deleteAndWait(categoryId))
  )
  const failedCategory = categoryResults.find((result) => !result.ok)
  if (failedCategory) return failedCategory

  const ruleResult = await ruleRepository.deleteAndWait(id)
  if (!ruleResult.ok) return ruleResult

  return {
    ok: true,
    deletedPayments: linkedPayments.length,
    deletedEvents: linkedPayments.filter((payment) => payment.calendarEventId).length,
    deletedCategories: emptyCategoryIds.length,
  }
}

async function removeLinkedPayment(payment) {
  const eventId = payment.calendarEventId

  if (eventId) {
    const unlinked = await paymentRepository.updateAndWait(payment.id, {
      ...payment,
      calendarEventId: null,
      updatedAt: new Date().toISOString(),
    })
    if (!unlinked.ok) return unlinked

    const eventResult = await calendarStore.deleteEventAndWait(eventId)
    if (!eventResult.ok) {
      await paymentRepository.updateAndWait(payment.id, {
        ...payment,
        calendarEventId: eventId,
        updatedAt: new Date().toISOString(),
      })
      return { ok: false, message: 'Не удалось удалить связанное событие календаря' }
    }
  }

  return paymentRepository.deleteAndWait(payment.id)
}

async function prepareMonth({ income = 0, includeRules = true } = {}) {
  const monthResult = await ensureCurrentMonth()
  if (!monthResult.ok) return monthResult
  await updateSettings({ income, status: 'active' })

  const createdPayments = []
  if (includeRules) {
    const activeRules = recurringRules.value.filter((item) => item.active)
    const requiredByCategory = activeRules.reduce((map, rule) => {
      const name = rule.categoryName || 'Обязательные платежи'
      map.set(name, (map.get(name) || 0) + toAmount(rule.defaultAmount))
      return map
    }, new Map())
    const categoryByName = new Map()
    for (const [categoryName, requiredAmount] of requiredByCategory) {
      const category = await ensureCategory(categoryName, requiredAmount)
      if (!category.ok) return category
      if (toAmount(category.item.plannedAmount) === 0) {
        updateCategory(category.item.id, { amount: requiredAmount })
      }
      categoryByName.set(categoryName, category.item)
    }

    for (const rule of activeRules) {
      const category = categoryByName.get(rule.categoryName || 'Обязательные платежи')
      const payment = await ensureRulePayment(rule, category)
      if (!payment.ok) return payment
      if (!payment.existing) createdPayments.push(payment.payment)
    }
  }
  return { ok: true, month: monthResult.item, payments: createdPayments }
}

async function unapplyRulesFromMonth() {
  const appliedPayments = payments.value.filter((payment) => payment.recurringRuleId)
  if (!appliedPayments.length) return { ok: true, deletedPayments: 0, deletedEvents: 0 }

  const requiredAmountByCategory = appliedPayments.reduce((map, payment) => {
    if (!payment.categoryId) return map
    map.set(
      payment.categoryId,
      (map.get(payment.categoryId) || 0) + toAmount(payment.plannedAmount)
    )
    return map
  }, new Map())

  for (const payment of appliedPayments) {
    const result = await removeLinkedPayment(payment)
    if (!result.ok) return result
  }

  for (const [categoryId, requiredAmount] of requiredAmountByCategory) {
    const category = categoryRepository.findById(categoryId)
    if (!category) continue

    const remainingCategoryPayments = paymentRepository.items.value.filter((payment) => (
      payment.budgetMonthId === currentMonthRecord.value?.id
      && payment.categoryId === categoryId
    ))
    const remainingAmount = Math.max(0, toAmount(category.plannedAmount) - requiredAmount)

    if (!remainingCategoryPayments.length && remainingAmount === 0) {
      const result = await categoryRepository.deleteAndWait(categoryId)
      if (!result.ok) return result
      continue
    }

    const result = await categoryRepository.updateAndWait(categoryId, {
      ...category,
      plannedAmount: remainingAmount,
      updatedAt: new Date().toISOString(),
    })
    if (!result.ok) return result
  }

  return {
    ok: true,
    deletedPayments: appliedPayments.length,
    deletedEvents: appliedPayments.filter((payment) => payment.calendarEventId).length,
  }
}

async function addPayment(categoryId, data) {
  const month = await ensureCurrentMonth()
  if (!month.ok) return month
  const category = categoryId ? categoryRepository.findById(categoryId) : null
  const title = String(data.title || '').trim()
  const dueDate = String(data.date || '')
  if (!title) return { ok: false, message: 'Укажи название платежа' }
  if (!dueDate.startsWith(`${selectedMonth.value}-`)) {
    return { ok: false, message: 'Дата платежа должна быть в выбранном месяце бюджета' }
  }

  const now = new Date().toISOString()
  const payment = {
    id: generateId(),
    workspaceId: workspaceStore.activeWorkspaceId.value,
    budgetMonthId: month.item.id,
    categoryId: category?.id || null,
    recurringRuleId: data.recurringRuleId || null,
    title,
    plannedAmount: toAmount(data.amount),
    actualAmount: null,
    dueDate,
    status: 'planned',
    paidAt: null,
    reminder: normalizeReminder(data.reminder),
    calendarEnabled: data.calendarEnabled !== false,
    calendarEventId: null,
    createdAt: now,
    updatedAt: now,
  }
  const paymentResult = await paymentRepository.createAndWait(payment)
  if (!paymentResult.ok) return paymentResult

  if (!payment.calendarEnabled) return { ok: true, payment: toPaymentView(payment) }
  const eventResult = await createPaymentEvent(payment, category)
  if (!eventResult.ok) {
    await paymentRepository.deleteAndWait(payment.id)
    return eventResult
  }
  const linked = await paymentRepository.updateAndWait(payment.id, {
    ...payment,
    calendarEventId: eventResult.event.id,
    updatedAt: new Date().toISOString(),
  })
  if (!linked.ok) {
    await calendarStore.deleteEventAndWait(eventResult.event.id)
    return linked
  }
  return {
    ok: true,
    payment: toPaymentView(linked.item),
    event: eventResult.event,
  }
}

async function setPaymentStatus(paymentId, status, actualAmount = null) {
  const payment = paymentRepository.findById(paymentId)
  if (!payment) return { ok: false, message: 'Платёж не найден' }
  if (!['planned', 'paid', 'skipped'].includes(status)) {
    return { ok: false, message: 'Неизвестный статус платежа' }
  }
  const paidAt = status === 'paid' ? new Date().toISOString() : null
  const result = await paymentRepository.updateAndWait(paymentId, {
    ...payment,
    status,
    actualAmount: status === 'paid'
      ? toAmount(actualAmount ?? payment.actualAmount ?? payment.plannedAmount)
      : null,
    paidAt,
    updatedAt: new Date().toISOString(),
  })
  if (!result.ok) return result
  if (payment.calendarEventId) {
    calendarStore.updateEvent(payment.calendarEventId, {
      completedAt: paidAt,
      importance: status === 'paid' ? 'normal' : 'important',
    })
  }
  return { ok: true, payment: toPaymentView(result.item) }
}

async function togglePaymentPaid(categoryId, paymentId) {
  const payment = paymentRepository.findById(paymentId)
  if (!payment) return { ok: false, message: 'Платёж не найден' }
  return setPaymentStatus(paymentId, payment.status === 'paid' ? 'planned' : 'paid')
}

async function removePayment(categoryId, paymentId) {
  const payment = paymentRepository.findById(paymentId)
  if (!payment) return { ok: false, message: 'Платёж не найден' }
  if (payment.recurringRuleId) {
    return {
      ok: false,
      message: 'Обязательный платёж управляется правилом выше. Отключи или удали правило.',
    }
  }
  if (payment.calendarEventId) {
    const eventResult = await calendarStore.deleteEventAndWait(payment.calendarEventId)
    if (!eventResult.ok) return { ok: false, message: 'Не удалось удалить событие календаря' }
  }
  return paymentRepository.deleteAndWait(paymentId)
}

async function restorePaymentEvent(categoryId, paymentId) {
  const payment = paymentRepository.findById(paymentId)
  if (!payment) return { ok: false, message: 'Платёж не найден' }
  if (payment.calendarEventId) return { ok: true, existing: true }
  const category = payment.categoryId ? categoryRepository.findById(payment.categoryId) : null
  const eventResult = await createPaymentEvent(payment, category)
  if (!eventResult.ok) return eventResult
  const linked = await paymentRepository.updateAndWait(paymentId, {
    ...payment,
    calendarEnabled: true,
    calendarEventId: eventResult.event.id,
    updatedAt: new Date().toISOString(),
  })
  return linked.ok ? { ok: true, event: eventResult.event } : linked
}

async function syncCalendarLinks() {
  const eventIds = new Set(calendarStore.events.value.map((event) => event.id))
  const linkedEventByPayment = new Map(calendarStore.events.value
    .filter((event) => event.linkedEntityType === 'budget-payment' && event.linkedEntityId)
    .map((event) => [event.linkedEntityId, event]))

  for (const payment of payments.value) {
    const linkedEvent = linkedEventByPayment.get(payment.id)
    const nextEventId = linkedEvent?.id || null
    const storedEventExists = payment.calendarEventId && eventIds.has(payment.calendarEventId)
    if (storedEventExists && (!linkedEvent || linkedEvent.id === payment.calendarEventId)) continue
    if (!payment.calendarEventId && !nextEventId) continue
    await paymentRepository.updateAndWait(payment.id, {
      ...payment,
      calendarEventId: nextEventId,
      updatedAt: new Date().toISOString(),
    })
  }
}

async function syncPaymentFromCalendar(event) {
  if (event.linkedEntityType !== 'budget-payment' || !event.linkedEntityId) return
  const payment = paymentRepository.findById(event.linkedEntityId)
  if (!payment) return
  const updates = {}
  if (event.date !== payment.dueDate) updates.dueDate = event.date
  if (event.completedAt && payment.status !== 'paid') {
    updates.status = 'paid'
    updates.paidAt = event.completedAt
    updates.actualAmount = payment.actualAmount ?? payment.plannedAmount
  }
  if (!Object.keys(updates).length) return
  await paymentRepository.updateAndWait(payment.id, {
    ...payment,
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

async function handleLinkedCalendarEventChange(change) {
  const event = change?.event
  if (event?.linkedEntityType !== 'budget-payment' || !event.linkedEntityId) return
  const payment = paymentRepository.findById(event.linkedEntityId)
  if (!payment) return
  if (change.action === 'delete') {
    await paymentRepository.updateAndWait(payment.id, {
      ...payment,
      calendarEventId: null,
      updatedAt: new Date().toISOString(),
    })
    return
  }
  await syncPaymentFromCalendar(event)
}

async function loadWorkspace(workspaceId) {
  const results = await Promise.all([
    monthRepository.loadWorkspace(workspaceId),
    categoryRepository.loadWorkspace(workspaceId),
    ruleRepository.loadWorkspace(workspaceId),
    paymentRepository.loadWorkspace(workspaceId),
  ])
  if (results.some((result) => result === null)) return null
  await migrateLegacyBudget(workspaceId)
  await cleanupDraftAutoPayments()
  return results
}

async function cleanupDraftAutoPayments() {
  const draftMonthIds = new Set(monthRepository.items.value
    .filter((month) => (
      month.workspaceId === workspaceStore.activeWorkspaceId.value
      && month.status === 'draft'
    ))
    .map((month) => month.id))
  const draftPayments = paymentRepository.items.value.filter((payment) => (
    draftMonthIds.has(payment.budgetMonthId) && payment.recurringRuleId
  ))
  if (!draftPayments.length) return

  const categoryIds = new Set(draftPayments.map((payment) => payment.categoryId).filter(Boolean))
  for (const payment of draftPayments) {
    await removeLinkedPayment(payment)
  }
  for (const categoryId of categoryIds) {
    const hasPayments = paymentRepository.items.value.some((payment) => payment.categoryId === categoryId)
    if (!hasPayments) await categoryRepository.deleteAndWait(categoryId)
  }
}

async function migrateLegacyBudget(workspaceId) {
  const legacyKey = `${APP_CONFIG.storageKey}:budgets`
  const legacyBudgets = legacyStorage.get(legacyKey)
  if (!Array.isArray(legacyBudgets)) return
  const workspaceBudgets = legacyBudgets.filter((budget) => budget.workspaceId === workspaceId)
  if (!workspaceBudgets.length) return

  for (const legacyBudget of workspaceBudgets) {
    const monthKey = /^\d{4}-\d{2}$/.test(legacyBudget.month)
      ? legacyBudget.month
      : getCurrentMonth()
    const existingMonth = monthRepository.items.value.find((month) => (
      month.workspaceId === workspaceId && toMonthKey(month.month) === monthKey
    ))
    if (existingMonth) continue

    const now = new Date().toISOString()
    const month = {
      id: generateId(),
      workspaceId,
      month: `${monthKey}-01`,
      plannedIncome: toAmount(legacyBudget.income),
      status: 'active',
      createdAt: legacyBudget.updatedAt || now,
      updatedAt: legacyBudget.updatedAt || now,
    }
    const monthResult = await monthRepository.createAndWait(month)
    if (!monthResult.ok) return

    for (const [index, legacyCategory] of (legacyBudget.categories || []).entries()) {
      const category = {
        id: legacyCategory.id || generateId(),
        workspaceId,
        budgetMonthId: month.id,
        name: String(legacyCategory.name || 'Без категории'),
        plannedAmount: toAmount(legacyCategory.amount),
        color: legacyCategory.color || '#60a5fa',
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      }
      const categoryResult = await categoryRepository.createAndWait(category)
      if (!categoryResult.ok) return

      for (const legacyPayment of legacyCategory.payments || []) {
        const payment = {
          id: legacyPayment.id || generateId(),
          workspaceId,
          budgetMonthId: month.id,
          categoryId: category.id,
          recurringRuleId: null,
          title: String(legacyPayment.title || legacyCategory.name),
          plannedAmount: toAmount(legacyPayment.amount),
          actualAmount: legacyPayment.paid ? toAmount(legacyPayment.amount) : null,
          dueDate: legacyPayment.date,
          status: legacyPayment.paid ? 'paid' : 'planned',
          paidAt: legacyPayment.paid ? legacyPayment.updatedAt || now : null,
          reminder: normalizeReminder(legacyPayment.reminder),
          calendarEnabled: Boolean(legacyPayment.calendarEventId),
          calendarEventId: legacyPayment.calendarEventId || null,
          createdAt: legacyPayment.createdAt || now,
          updatedAt: now,
        }
        const paymentResult = await paymentRepository.createAndWait(payment)
        if (!paymentResult.ok) return
        if (payment.calendarEventId) {
          calendarStore.updateEvent(payment.calendarEventId, {
            linkedEntityType: 'budget-payment',
            linkedEntityId: payment.id,
            completedAt: payment.paidAt,
          })
        }
      }
    }
  }

  const remaining = legacyBudgets.filter((budget) => budget.workspaceId !== workspaceId)
  if (remaining.length) legacyStorage.set(legacyKey, remaining)
  else legacyStorage.remove(legacyKey)
}

async function ensureCurrentMonth() {
  if (currentMonthRecord.value) return { ok: true, item: currentMonthRecord.value }
  if (monthCreatePromise) return monthCreatePromise
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId) return { ok: false, message: 'Пространство не выбрано' }
  monthCreatePromise = (async () => {
    const now = new Date().toISOString()
    const month = {
      id: generateId(),
      workspaceId,
      month: `${selectedMonth.value}-01`,
      plannedIncome: 0,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    }
    const result = await monthRepository.createAndWait(month)
    return result.ok ? { ok: true, item: month } : result
  })()
  const result = await monthCreatePromise
  monthCreatePromise = null
  return result
}

async function ensureCategory(name, amount = 0) {
  const existing = categories.value.find((category) => (
    category.name.toLowerCase() === String(name).trim().toLowerCase()
  ))
  if (existing) return { ok: true, item: existing }
  const result = await addCategory(name, amount)
  return result.ok ? { ok: true, item: result.category } : result
}

async function ensureRulePayment(rule, preparedCategory = null) {
  const existing = payments.value.find((payment) => payment.recurringRuleId === rule.id)
  if (existing) return { ok: true, existing: true, payment: toPaymentView(existing) }

  const category = preparedCategory
    ? { ok: true, item: preparedCategory }
    : await ensureCategory(rule.categoryName || 'Обязательные платежи', rule.defaultAmount)
  if (!category.ok) return category

  const currentCategoryAmount = toAmount(category.item.plannedAmount)
  const otherRuleAmount = payments.value
    .filter((payment) => (
      payment.categoryId === category.item.id
      && payment.recurringRuleId
    ))
    .reduce((total, payment) => total + toAmount(payment.plannedAmount), 0)
  const requiredAmount = otherRuleAmount + toAmount(rule.defaultAmount)
  if (currentCategoryAmount < requiredAmount) {
    updateCategory(category.item.id, { amount: requiredAmount })
  }

  return addPayment(category.item.id, {
    title: rule.title,
    amount: rule.defaultAmount,
    date: getDueDate(selectedMonth.value, rule.dueDay),
    reminder: rule.reminder,
    recurringRuleId: rule.id,
    calendarEnabled: rule.calendarEnabled,
  })
}

async function createPaymentEvent(payment, category) {
  const result = await calendarStore.addEventAndWait({
    title: payment.title,
    date: payment.dueDate,
    startTime: '09:00',
    endTime: '09:30',
    memberIds: [],
    category: 'home',
    location: '',
    notes: `${formatAmount(payment.plannedAmount)} · ${category?.name || 'Бюджет'}`,
    allDay: false,
    repeat: 'none',
    reminder: payment.reminder || '1d',
    importance: 'important',
    linkedEntityType: 'budget-payment',
    linkedEntityId: payment.id,
    completedAt: null,
  })
  if (!result.ok) {
    return {
      ok: false,
      message: Object.values(result.errors || {})[0] || 'Не удалось создать событие календаря',
    }
  }
  return result
}

function toPaymentView(payment) {
  return {
    ...payment,
    amount: toAmount(payment.plannedAmount),
    date: payment.dueDate,
    paid: payment.status === 'paid',
  }
}

function getDueDate(month, dueDay) {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  return `${month}-${String(Math.min(Number(dueDay), lastDay)).padStart(2, '0')}`
}

function normalizeReminder(value) {
  return ['none', '1h', '1d'].includes(value) ? value : '1d'
}

function toMonthKey(value) {
  return String(value || '').slice(0, 7)
}

function parseMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber - 1, 1)
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
  }).format(toAmount(value))
}

export const budgetStore = {
  selectedMonth,
  currentBudget,
  recurringRules,
  payments,
  plannedTotal,
  requiredPaymentsTotal,
  remainingAmount,
  allocatedPercent,
  setSelectedMonth,
  updateSettings,
  addCategory,
  updateCategory,
  removeCategory,
  addRecurringRule,
  updateRecurringRule,
  removeRecurringRule,
  prepareMonth,
  unapplyRulesFromMonth,
  addPayment,
  setPaymentStatus,
  togglePaymentPaid,
  removePayment,
  restorePaymentEvent,
  syncCalendarLinks,
  syncPaymentFromCalendar,
  loadWorkspace,
  syncError: paymentRepository.lastError,
  pendingSyncCount: paymentRepository.pendingCount,
}

if (typeof window !== 'undefined') {
  window.addEventListener('calendar-linked-event-change', (event) => {
    handleLinkedCalendarEventChange(event.detail)
  })
}
