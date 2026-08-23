import { formatRubles, toNonNegativeAmount } from '../../utils/formatters/currencyFormatter.js'

const CATEGORY_COLORS = ['#60a5fa', '#34d399', '#f59e0b', '#a78bfa', '#fb7185', '#22d3ee']
const REMINDERS = new Set(['none', '1h', '1d'])

export const toBudgetAmount = toNonNegativeAmount
export const formatBudgetAmount = formatRubles

export function getBudgetDueDate(month, dueDay) {
  const [year, monthNumber] = String(month || '').split('-').map(Number)
  if (!year || monthNumber < 1 || monthNumber > 12) return ''
  const lastDay = new Date(year, monthNumber, 0).getDate()
  const normalizedDay = Math.max(1, Math.min(toBudgetAmount(dueDay), lastDay))
  return `${year}-${String(monthNumber).padStart(2, '0')}-${String(normalizedDay).padStart(2, '0')}`
}

export function normalizeBudgetReminder(value) {
  return REMINDERS.has(value) ? value : '1d'
}

export function normalizeBudgetDateKey(value) {
  const dateKey = String(value || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return ''
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? dateKey
    : ''
}

export function toBudgetMonthKey(value) {
  const monthKey = String(value || '').slice(0, 7)
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) ? monthKey : ''
}

export function getCurrentBudgetMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function createBudgetMonthRecord({
  id,
  workspaceId,
  month,
  plannedIncome = 0,
  status = 'draft',
  createdAt,
  updatedAt = createdAt,
}) {
  const monthKey = toBudgetMonthKey(month)
  if (!id || !workspaceId || !monthKey) return null

  return {
    id,
    workspaceId,
    month: `${monthKey}-01`,
    plannedIncome: toBudgetAmount(plannedIncome),
    status,
    createdAt,
    updatedAt,
  }
}

export function findDuplicateBudgetName(items) {
  const names = new Set()
  for (const item of items || []) {
    const originalName = String(item?.name || item?.title || '').trim()
    const normalizedName = originalName.toLowerCase()
    if (!normalizedName) continue
    if (names.has(normalizedName)) return originalName
    names.add(normalizedName)
  }
  return ''
}

export function getBudgetCategoryColor(index) {
  return CATEGORY_COLORS[Math.abs(Number(index || 0)) % CATEGORY_COLORS.length]
}

export function toBudgetPaymentView(payment) {
  return {
    ...payment,
    amount: toBudgetAmount(payment?.plannedAmount),
    date: normalizeBudgetDateKey(payment?.dueDate),
    paid: payment?.status === 'paid',
  }
}

export function disabledBudgetResult() {
  return { ok: false, message: 'Бюджет выключен в настройках' }
}
