import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { useLocalStorage } from '../composables/storage/useLocalStorage.js'
import { createStorage } from '../composables/storage/useStorage.js'
import { readBudgetSetting } from '../composables/preferences/useBudgetSettings.js'
import { SyncedCollectionRepository } from '../repositories/SyncedCollectionRepository.js'
import { generateId } from '../utils/helpers/idGenerator.js'
import { calendarStore } from './calendar.store.js'
import { workspaceStore } from './workspace.store.js'
import { CALENDAR_LINK_CHANGE_EVENT, LINKED_ENTITY_TYPES } from '../utils/constants/linkedEntityTypes.js'
import {
  createBudgetMonthRecord,
  disabledBudgetResult,
  findDuplicateBudgetName as findDuplicateName,
  formatBudgetAmount as formatAmount,
  getBudgetCategoryColor as categoryColor,
  getBudgetDueDate as getDueDate,
  getCurrentBudgetMonth as getCurrentMonth,
  normalizeBudgetDateKey as normalizeDateKey,
  normalizeBudgetReminder as normalizeReminder,
  toBudgetAmount as toAmount,
  toBudgetMonthKey as toMonthKey,
  toBudgetPaymentView as toPaymentView,
} from './budget/budget.helpers.js'

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
const settingsRepository = new SyncedCollectionRepository(
  `${APP_CONFIG.storageKey}:budget-settings`,
  [],
  'budget_settings'
)
const categoryTemplateRepository = new SyncedCollectionRepository(
  `${APP_CONFIG.storageKey}:budget-category-templates`,
  [],
  'budget_category_templates'
)
const { state: selectedMonth } = useLocalStorage(
  `${APP_CONFIG.storageKey}:budget-selected-month`,
  getCurrentMonth()
)
const legacyStorage = createStorage()
let monthCreatePromise = null
let isSyncingCalendar = false

const workspaceMonths = computed(() => monthRepository.items.value
  .filter((item) => item.workspaceId === workspaceStore.activeWorkspaceId.value))
const workspacePayments = computed(() => paymentRepository.items.value
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
  return workspacePayments.value
    .filter((item) => item.budgetMonthId === monthId)
    .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
})
const recurringRules = computed(() => ruleRepository.items.value
  .filter((item) => item.workspaceId === workspaceStore.activeWorkspaceId.value)
  .sort((a, b) => Number(a.dueDay) - Number(b.dueDay)))
const budgetSettings = computed(() => settingsRepository.items.value.find((item) => (
  item.workspaceId === workspaceStore.activeWorkspaceId.value
)) || null)
const categoryTemplates = computed(() => categoryTemplateRepository.items.value
  .filter((item) => item.workspaceId === workspaceStore.activeWorkspaceId.value && item.active !== false)
  .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)))
const isSetupComplete = computed(() => Boolean(budgetSettings.value?.setupCompleted))

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
    actualAmount: category.actualAmount === null || category.actualAmount === undefined
      ? null
      : toAmount(category.actualAmount),
    templateId: category.templateId || null,
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
const actualTotal = computed(() => categories.value
  .reduce((total, category) => total + toAmount(category.actualAmount), 0))
const hasActuals = computed(() => categories.value.some((category) => (
  category.actualAmount !== null && category.actualAmount !== undefined
)))

function setSelectedMonth(month) {
  if (/^\d{4}-\d{2}$/.test(String(month || ''))) selectedMonth.value = month
}

async function updateSettings(updates) {
  if (!readBudgetSetting()) return disabledBudgetResult()
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

async function saveGlobalSetup(data) {
  if (!readBudgetSetting()) return disabledBudgetResult()
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId) return { ok: false, message: 'Пространство не выбрано' }

  const income = toAmount(data.defaultIncome)
  const rules = Array.isArray(data.rules) ? data.rules : []
  const templates = Array.isArray(data.categories) ? data.categories : []
  const now = new Date().toISOString()
  const wasSetupComplete = isSetupComplete.value

  const duplicateRule = findDuplicateName(rules)
  if (duplicateRule) return { ok: false, message: `Обязательный расход «${duplicateRule}» указан дважды` }
  const duplicateCategory = findDuplicateName(templates)
  if (duplicateCategory) return { ok: false, message: `Категория «${duplicateCategory}» указана дважды` }

  const settings = budgetSettings.value
  const settingsPayload = {
    id: settings?.id || generateId(),
    workspaceId,
    defaultIncome: income,
    currency: 'RUB',
    setupCompleted: true,
    createdAt: settings?.createdAt || now,
    updatedAt: now,
  }
  const settingsResult = settings
    ? await settingsRepository.updateAndWait(settings.id, settingsPayload)
    : await settingsRepository.createAndWait(settingsPayload)
  if (!settingsResult.ok) return settingsResult

  const templateResult = await reconcileCategoryTemplates(templates, workspaceId, now)
  if (!templateResult.ok) return templateResult
  const rulesResult = await reconcileRecurringRules(rules, workspaceId, now)
  if (!rulesResult.ok) return rulesResult

  const monthResult = await ensureSelectedMonthFromTemplate({ overwriteDefaults: !wasSetupComplete })
  if (!monthResult.ok) return monthResult
  return { ok: true, month: monthResult.month }
}

async function saveMonthPlan(data) {
  if (!readBudgetSetting()) return disabledBudgetResult()
  const monthResult = await ensureSelectedMonthFromTemplate()
  if (!monthResult.ok) return monthResult

  const incomeResult = await updateSettings({ income: data.income, status: 'active' })
  if (!incomeResult.ok) return incomeResult

  const requestedCategories = Array.isArray(data.categories) ? data.categories : []
  const flexibleCategories = currentBudget.value.categories.filter((category) => (
    !category.payments?.some((payment) => payment.recurringRuleId)
  ))
  const requestedIds = new Set(requestedCategories.map((category) => category.id).filter(Boolean))

  for (const category of flexibleCategories) {
    if (requestedIds.has(category.id)) continue
    const result = await removeCategory(category.id)
    if (!result.ok) return result
  }

  for (const [index, item] of requestedCategories.entries()) {
    const name = String(item.name || '').trim()
    if (!name) return { ok: false, message: 'Укажи название категории' }
    if (item.id && categoryRepository.findById(item.id)) {
      const existing = categoryRepository.findById(item.id)
      const result = await categoryRepository.updateAndWait(item.id, {
        ...existing,
        name,
        plannedAmount: toAmount(item.amount),
        sortOrder: index,
        updatedAt: new Date().toISOString(),
      })
      if (!result.ok) return result
      continue
    }
    const result = await addCategory(name, item.amount, {
      color: item.color,
      templateId: item.templateId,
    })
    if (!result.ok) return result
  }

  return { ok: true }
}

async function saveActuals(entries) {
  if (!readBudgetSetting()) return disabledBudgetResult()
  for (const entry of Array.isArray(entries) ? entries : []) {
    const category = categoryRepository.findById(entry.id)
    if (!category || category.budgetMonthId !== currentMonthRecord.value?.id) continue
    const result = await categoryRepository.updateAndWait(category.id, {
      ...category,
      actualAmount: entry.actualAmount === '' || entry.actualAmount === null
        ? null
        : toAmount(entry.actualAmount),
      updatedAt: new Date().toISOString(),
    })
    if (!result.ok) return result
  }
  return { ok: true }
}

async function addCategory(name, amount = 0, options = {}) {
  if (!readBudgetSetting()) return disabledBudgetResult()
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
    actualAmount: null,
    templateId: options.templateId || null,
    color: options.color || '#60a5fa',
    sortOrder: categories.value.length,
    createdAt: now,
    updatedAt: now,
  }
  const result = await categoryRepository.createAndWait(category)
  return result.ok ? { ok: true, category } : result
}

function updateCategory(id, updates) {
  if (!readBudgetSetting()) return disabledBudgetResult()
  const category = categoryRepository.findById(id)
  if (!category) return { ok: false, message: 'Раздел не найден' }
  return categoryRepository.update(id, {
    ...category,
    name: updates.name === undefined ? category.name : String(updates.name).trim(),
    plannedAmount: updates.amount === undefined ? category.plannedAmount : toAmount(updates.amount),
    actualAmount: updates.actualAmount === undefined
      ? category.actualAmount
      : updates.actualAmount === null || updates.actualAmount === ''
        ? null
        : toAmount(updates.actualAmount),
    updatedAt: new Date().toISOString(),
  })
}

async function removeCategory(id) {
  if (!readBudgetSetting()) return disabledBudgetResult()
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
  if (!readBudgetSetting()) return disabledBudgetResult()
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
  if (!readBudgetSetting()) return disabledBudgetResult()
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
  if (!readBudgetSetting()) return disabledBudgetResult()
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

    const eventResult = await runCalendarSync(() => calendarStore.deleteEventAndWait(eventId))
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
  if (!readBudgetSetting()) return disabledBudgetResult()
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
  if (!readBudgetSetting()) return disabledBudgetResult()
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
  if (!readBudgetSetting()) return disabledBudgetResult()
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
    await runCalendarSync(() => calendarStore.deleteEventAndWait(eventResult.event.id))
    return linked
  }
  return {
    ok: true,
    payment: toPaymentView(linked.item),
    event: eventResult.event,
  }
}

async function setPaymentStatus(paymentId, status, actualAmount = null) {
  if (!readBudgetSetting()) return disabledBudgetResult()
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
    runCalendarSyncNow(() => calendarStore.updateEvent(payment.calendarEventId, {
      completedAt: paidAt,
      importance: status === 'paid' ? 'normal' : 'important',
    }))
  }
  return { ok: true, payment: toPaymentView(result.item) }
}

async function togglePaymentPaid(categoryId, paymentId) {
  if (!readBudgetSetting()) return disabledBudgetResult()
  const payment = paymentRepository.findById(paymentId)
  if (!payment) return { ok: false, message: 'Платёж не найден' }
  return setPaymentStatus(paymentId, payment.status === 'paid' ? 'planned' : 'paid')
}

async function removePayment(categoryId, paymentId) {
  if (!readBudgetSetting()) return disabledBudgetResult()
  const payment = paymentRepository.findById(paymentId)
  if (!payment) return { ok: false, message: 'Платёж не найден' }
  if (payment.recurringRuleId) {
    return {
      ok: false,
      message: 'Обязательный платёж управляется правилом выше. Отключи или удали правило.',
    }
  }
  if (payment.calendarEventId) {
    const eventResult = await runCalendarSync(() => calendarStore.deleteEventAndWait(payment.calendarEventId))
    if (!eventResult.ok) return { ok: false, message: 'Не удалось удалить событие календаря' }
  }
  return paymentRepository.deleteAndWait(paymentId)
}

async function restorePaymentEvent(categoryId, paymentId) {
  if (!readBudgetSetting()) return disabledBudgetResult()
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
  if (!readBudgetSetting()) return
  const eventIds = new Set(calendarStore.events.value.map((event) => event.id))
  const linkedEventByPayment = new Map(calendarStore.events.value
    .filter((event) => event.linkedEntityType === LINKED_ENTITY_TYPES.BUDGET_PAYMENT && event.linkedEntityId)
    .map((event) => [event.linkedEntityId, event]))

  for (const payment of workspacePayments.value) {
    const linkedEvent = linkedEventByPayment.get(payment.id)
    const nextEventId = linkedEvent?.id || null
    const storedEventExists = payment.calendarEventId && eventIds.has(payment.calendarEventId)
    if (storedEventExists) {
      const storedEvent = calendarStore.events.value.find((event) => event.id === payment.calendarEventId)
      if (storedEvent && (storedEvent.linkedEntityType !== LINKED_ENTITY_TYPES.BUDGET_PAYMENT || storedEvent.linkedEntityId !== payment.id)) {
        runCalendarSyncNow(() => calendarStore.updateEvent(storedEvent.id, {
          linkedEntityType: LINKED_ENTITY_TYPES.BUDGET_PAYMENT,
          linkedEntityId: payment.id,
        }))
      }
      if (!linkedEvent || linkedEvent.id === payment.calendarEventId) continue
    }
    if (!payment.calendarEventId && !nextEventId) continue
    await paymentRepository.updateAndWait(payment.id, {
      ...payment,
      calendarEventId: nextEventId,
      updatedAt: new Date().toISOString(),
    })
  }
}

async function syncPaymentFromCalendar(event) {
  if (!readBudgetSetting()) return
  const payment = findPaymentByCalendarEvent(event)
  if (!payment) return
  const updates = {}
  if (payment.calendarEventId !== event.id) updates.calendarEventId = event.id
  if (event.date !== payment.dueDate) updates.dueDate = event.date
  const targetMonth = await ensureBudgetMonthForDate(event.date)
  if (targetMonth.ok && targetMonth.item.id !== payment.budgetMonthId) {
    updates.budgetMonthId = targetMonth.item.id
    if (!categoryBelongsToMonth(payment.categoryId, targetMonth.item.id)) updates.categoryId = null
  }
  if (event.completedAt && payment.status !== 'paid') {
    updates.status = 'paid'
    updates.paidAt = event.completedAt
    updates.actualAmount = payment.actualAmount ?? payment.plannedAmount
  }
  if (!event.completedAt && payment.status === 'paid') {
    updates.status = 'planned'
    updates.paidAt = null
    updates.actualAmount = null
  }
  if (!Object.keys(updates).length) return
  await paymentRepository.updateAndWait(payment.id, {
    ...payment,
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

async function handleLinkedCalendarEventChange(change) {
  if (isSyncingCalendar || !readBudgetSetting()) return
  const event = change?.event
  const payment = findPaymentByCalendarEvent(event)
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
  if (!readBudgetSetting()) return []
  const results = await Promise.all([
    monthRepository.loadWorkspace(workspaceId),
    categoryRepository.loadWorkspace(workspaceId),
    ruleRepository.loadWorkspace(workspaceId),
    paymentRepository.loadWorkspace(workspaceId),
    settingsRepository.loadWorkspace(workspaceId),
    categoryTemplateRepository.loadWorkspace(workspaceId),
  ])
  if (results.some((result) => result === null)) return null
  await migrateLegacyBudget(workspaceId)
  await cleanupDraftAutoPayments()
  if (isSetupComplete.value) {
    const monthResult = await ensureSelectedMonthFromTemplate()
    if (!monthResult.ok) return null
  }
  await syncCalendarLinks()
  await Promise.all(calendarStore.events.value
    .filter((event) => event.linkedEntityType === LINKED_ENTITY_TYPES.BUDGET_PAYMENT || findPaymentByCalendarEvent(event))
    .map((event) => syncPaymentFromCalendar(event)))
  return results
}

async function reconcileCategoryTemplates(items, workspaceId, now) {
  const existingTemplates = categoryTemplateRepository.items.value
    .filter((item) => item.workspaceId === workspaceId)
  const retainedIds = new Set(items.map((item) => item.id).filter(Boolean))

  for (const existing of existingTemplates) {
    if (retainedIds.has(existing.id)) continue
    const result = await categoryTemplateRepository.updateAndWait(existing.id, {
      ...existing,
      active: false,
      updatedAt: now,
    })
    if (!result.ok) return result
  }

  for (const [index, item] of items.entries()) {
    const name = String(item.name || '').trim()
    if (!name) return { ok: false, message: 'Укажи название категории' }
    const existing = item.id
      ? categoryTemplateRepository.findById(item.id)
      : existingTemplates.find((template) => template.name.toLowerCase() === name.toLowerCase())
    const payload = {
      id: existing?.id || generateId(),
      workspaceId,
      name,
      defaultAmount: toAmount(item.defaultAmount ?? item.amount),
      color: item.color || existing?.color || categoryColor(index),
      sortOrder: index,
      active: true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }
    const result = existing
      ? await categoryTemplateRepository.updateAndWait(existing.id, payload)
      : await categoryTemplateRepository.createAndWait(payload)
    if (!result.ok) return result
  }
  return { ok: true }
}

async function reconcileRecurringRules(items, workspaceId, now) {
  const existingRules = recurringRules.value
  const retainedIds = new Set(items.map((item) => item.id).filter(Boolean))

  for (const existing of existingRules) {
    if (retainedIds.has(existing.id)) continue
    const result = await ruleRepository.updateAndWait(existing.id, {
      ...existing,
      active: false,
      updatedAt: now,
    })
    if (!result.ok) return result
  }

  for (const item of items) {
    const title = String(item.title || '').trim()
    if (!title) return { ok: false, message: 'Укажи название обязательного расхода' }
    const existing = item.id
      ? ruleRepository.findById(item.id)
      : existingRules.find((rule) => rule.title.toLowerCase() === title.toLowerCase())
    const payload = {
      id: existing?.id || generateId(),
      workspaceId,
      title,
      categoryName: String(item.categoryName || 'Обязательные расходы').trim(),
      defaultAmount: toAmount(item.defaultAmount ?? item.amount),
      dueDay: Math.max(1, Math.min(31, Number(item.dueDay || 1))),
      reminder: normalizeReminder(item.reminder || '1d'),
      calendarEnabled: item.calendarEnabled !== false,
      active: true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }
    const result = existing
      ? await ruleRepository.updateAndWait(existing.id, payload)
      : await ruleRepository.createAndWait(payload)
    if (!result.ok) return result
  }
  return { ok: true }
}

async function ensureSelectedMonthFromTemplate({ overwriteDefaults = false } = {}) {
  if (!isSetupComplete.value) return { ok: false, message: 'Сначала настрой бюджет' }
  const monthResult = await ensureCurrentMonth()
  if (!monthResult.ok) return monthResult

  const month = monthResult.item
  const shouldApplyDefaults = overwriteDefaults || month.status === 'draft'
  const income = shouldApplyDefaults ? budgetSettings.value.defaultIncome : month.plannedIncome
  const settingsResult = await updateSettings({ income, status: 'active' })
  if (!settingsResult.ok) return settingsResult

  if (shouldApplyDefaults) {
    for (const template of categoryTemplates.value) {
      const existing = categories.value.find((category) => (
        category.templateId === template.id
        || (!category.templateId && category.name.toLowerCase() === template.name.toLowerCase())
      ))
      if (existing) continue
      const result = await addCategory(template.name, template.defaultAmount, {
        color: template.color,
        templateId: template.id,
      })
      if (!result.ok) return result
    }
  }

  const prepared = await prepareMonth({ income, includeRules: true })
  if (!prepared.ok) return prepared
  return { ok: true, month: monthResult.item, payments: prepared.payments }
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
    const month = createBudgetMonthRecord({
      id: generateId(),
      workspaceId,
      month: monthKey,
      plannedIncome: legacyBudget.income,
      status: 'active',
      createdAt: legacyBudget.updatedAt || now,
      updatedAt: legacyBudget.updatedAt || now,
    })
    if (!month) return
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
          runCalendarSyncNow(() => calendarStore.updateEvent(payment.calendarEventId, {
            linkedEntityType: LINKED_ENTITY_TYPES.BUDGET_PAYMENT,
            linkedEntityId: payment.id,
            completedAt: payment.paidAt,
          }))
        }
      }
    }
  }

  const remaining = legacyBudgets.filter((budget) => budget.workspaceId !== workspaceId)
  if (remaining.length) legacyStorage.set(legacyKey, remaining)
  else legacyStorage.remove(legacyKey)
}

async function ensureCurrentMonth() {
  if (!readBudgetSetting()) return disabledBudgetResult()
  if (currentMonthRecord.value) return { ok: true, item: currentMonthRecord.value }
  if (monthCreatePromise) return monthCreatePromise
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId) return { ok: false, message: 'Пространство не выбрано' }
  monthCreatePromise = (async () => {
    const now = new Date().toISOString()
    const month = createBudgetMonthRecord({
      id: generateId(),
      workspaceId,
      month: selectedMonth.value,
      createdAt: now,
    })
    if (!month) return { ok: false, message: 'Некорректный месяц бюджета' }
    const result = await monthRepository.createAndWait(month)
    return result.ok ? { ok: true, item: month } : result
  })()
  const result = await monthCreatePromise
  monthCreatePromise = null
  return result
}

async function ensureBudgetMonthForDate(dateKey) {
  if (!readBudgetSetting()) return disabledBudgetResult()
  const monthKey = toMonthKey(dateKey)
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return { ok: false, message: 'Некорректная дата платежа' }
  const existingMonth = workspaceMonths.value.find((month) => toMonthKey(month.month) === monthKey)
  if (existingMonth) return { ok: true, item: existingMonth }

  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId) return { ok: false, message: 'Пространство не выбрано' }
  const now = new Date().toISOString()
  const month = createBudgetMonthRecord({
    id: generateId(),
    workspaceId,
    month: monthKey,
    createdAt: now,
  })
  if (!month) return { ok: false, message: 'Некорректная дата платежа' }
  const result = await monthRepository.createAndWait(month)
  return result.ok ? { ok: true, item: month } : result
}


async function runCalendarSync(callback) {
  isSyncingCalendar = true
  try {
    return await callback()
  } finally {
    isSyncingCalendar = false
  }
}

function runCalendarSyncNow(callback) {
  isSyncingCalendar = true
  try {
    return callback()
  } finally {
    isSyncingCalendar = false
  }
}
function findPaymentByCalendarEvent(event) {
  if (!event) return null
  if (event.linkedEntityType === LINKED_ENTITY_TYPES.BUDGET_PAYMENT && event.linkedEntityId) {
    return paymentRepository.findById(event.linkedEntityId)
      || workspacePayments.value.find((payment) => payment.calendarEventId === event.id)
      || null
  }
  return workspacePayments.value.find((payment) => payment.calendarEventId === event.id) || null
}

function categoryBelongsToMonth(categoryId, monthId) {
  if (!categoryId) return true
  const category = categoryRepository.findById(categoryId)
  return category?.budgetMonthId === monthId
}

async function ensureCategory(name, amount = 0) {
  if (!readBudgetSetting()) return disabledBudgetResult()
  const existing = categories.value.find((category) => (
    category.name.toLowerCase() === String(name).trim().toLowerCase()
  ))
  if (existing) return { ok: true, item: existing }
  const result = await addCategory(name, amount)
  return result.ok ? { ok: true, item: result.category } : result
}

async function ensureRulePayment(rule, preparedCategory = null) {
  if (!readBudgetSetting()) return disabledBudgetResult()
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
  if (!readBudgetSetting()) return disabledBudgetResult()
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
    linkedEntityType: LINKED_ENTITY_TYPES.BUDGET_PAYMENT,
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

export const budgetStore = {
  selectedMonth,
  currentBudget,
  budgetSettings,
  categoryTemplates,
  isSetupComplete,
  recurringRules,
  payments,
  plannedTotal,
  requiredPaymentsTotal,
  remainingAmount,
  allocatedPercent,
  actualTotal,
  hasActuals,
  setSelectedMonth,
  updateSettings,
  saveGlobalSetup,
  saveMonthPlan,
  saveActuals,
  ensureSelectedMonthFromTemplate,
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
  window.addEventListener(CALENDAR_LINK_CHANGE_EVENT, (event) => {
    handleLinkedCalendarEventChange(event.detail)
  })
}
