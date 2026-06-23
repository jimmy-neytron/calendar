<template>
  <section class="budget-page">
    <header class="budget-command panel">
      <div class="budget-command__heading">
        <span class="budget-kicker">Бюджет</span>
        <h1>План на {{ selectedMonthLabel }}</h1>
        <p>Доход, обязательные платежи и остальные расходы — в одном понятном плане.</p>
      </div>

      <div class="budget-command__balance" :class="{ 'budget-command__balance--negative': remainingAmount < 0 }">
        <small>{{ remainingAmount < 0 ? 'Превышение бюджета' : 'Свободно после планирования' }}</small>
        <strong>{{ formatMoney(Math.abs(remainingAmount)) }}</strong>
      </div>

      <div class="budget-command__controls">
        <div class="budget-period">
          <span>Месяц</span>
          <div class="budget-period__actions">
            <div class="budget-month-picker">
              <UiIconButton icon="left" label="Предыдущий месяц" @click="shiftMonth(-1)" />
              <input
                :value="selectedMonth"
                type="month"
                aria-label="Месяц бюджета"
                @input="setMonth($event.target.value)"
              />
              <UiIconButton icon="right" label="Следующий месяц" @click="shiftMonth(1)" />
            </div>
            <UiButton
              size="sm"
              variant="secondary"
              icon="calendar"
              :disabled="isCurrentMonth"
              @click="goToCurrentMonth"
            >
              Текущий месяц
            </UiButton>
          </div>
        </div>

        <UiInput
          :model-value="budget.income"
          type="number"
          label="Доход за месяц"
          placeholder="Например, 75 000"
          @update:model-value="setIncome"
        />
      </div>
    </header>

    <section class="budget-summary">
      <article class="budget-stat budget-stat--income panel">
        <span>Доход</span>
        <strong>{{ formatMoney(budget.income) }}</strong>
        <small>{{ selectedMonthLabel }}</small>
      </article>
      <article class="budget-stat budget-stat--planned panel">
        <span>Запланировано</span>
        <strong>{{ formatMoney(plannedTotal) }}</strong>
        <small>{{ budget.categories.length }} {{ categoryWord }}</small>
      </article>
      <article class="budget-stat panel" :class="{ 'budget-stat--danger': remainingAmount < 0 }">
        <span>{{ remainingAmount < 0 ? 'Не хватает' : 'Свободный остаток' }}</span>
        <strong>{{ formatMoney(Math.abs(remainingAmount)) }}</strong>
        <small>{{ allocatedPercent }}% дохода распределено</small>
      </article>
    </section>

    <BudgetAnalytics
      :income="budget.income"
      :planned-total="plannedTotal"
      :required-total="requiredPaymentsTotal"
      :allocated-percent="allocatedPercent"
      :categories="budget.categories"
    />

    <section class="budget-rules panel">
      <header>
        <div>
          <span>Обязательные расходы · с календарём</span>
          <h2>То, что нужно оплачивать каждый месяц</h2>
          <p>Например, квартира, интернет или кредит. Нажми «Применить» — расходы появятся в бюджете выбранного месяца и в календаре.</p>
        </div>
        <div class="budget-rules__actions">
          <UiButton
            v-if="hasAppliedRules"
            variant="secondary"
            :disabled="isApplyingRules"
            @click="unapplyRulesFromMonth"
          >
            Отменить для {{ selectedMonthLabel }}
          </UiButton>
          <UiButton
            v-if="!allRulesApplied"
            :disabled="!activeRecurringRules.length"
            :loading="isApplyingRules"
            @click="applyRulesToMonth"
          >
            Применить к {{ selectedMonthLabel }}
          </UiButton>
        </div>
      </header>

      <form class="budget-rule-create" @submit.prevent="createRecurringRule">
        <UiInput v-model="ruleForm.title" label="Платёж" placeholder="Квартира" />
        <UiInput v-model="ruleForm.defaultAmount" type="number" label="Обычная сумма" placeholder="0" />
        <UiInput v-model="ruleForm.dueDay" type="number" label="Число месяца" placeholder="5" />
        <UiInput v-model="ruleForm.categoryName" label="Раздел" placeholder="Жильё" />
        <UiButton type="submit" icon="＋">Добавить правило</UiButton>
      </form>

      <div v-if="recurringRules.length" class="budget-rule-list">
        <article v-for="rule in recurringRules" :key="rule.id">
          <span class="budget-rule__date"><b>{{ rule.dueDay }}</b><small>число</small></span>
          <div>
            <strong>{{ rule.title }}</strong>
            <small>{{ rule.categoryName }} · {{ formatMoney(rule.defaultAmount) }} · напомнить {{ reminderLabel(rule.reminder) }}</small>
          </div>
          <button
            type="button"
            class="budget-rule__status"
            :class="{ active: rule.active }"
            @click="budgetStore.updateRecurringRule(rule.id, { active: !rule.active })"
          >
            {{ rule.active ? 'Активно' : 'Пауза' }}
          </button>
          <UiButton
            class="budget-rule__delete"
            size="sm"
            variant="danger"
            icon="trash"
            @click="removeRecurringRule(rule)"
          >
            Удалить
          </UiButton>
        </article>
      </div>
      <p v-else class="budget-rules__empty">Добавь постоянный расход — например, квартиру или интернет. Потом его можно применить к нужному месяцу.</p>
    </section>

    <section class="budget-plan panel">
      <header class="budget-plan__header">
        <div>
          <span>План расходов · без календаря</span>
          <h2>На что планируешь потратить деньги</h2>
          <p>Добавь продукты, транспорт, накопления и другие расходы на месяц. Они останутся только в бюджете. Чтобы расход появился в календаре, нажми «Платёж» у нужного раздела.</p>
        </div>
        <div class="budget-progress" :class="{ 'budget-progress--over': allocatedPercent > 100 }">
          <span :style="{ width: `${Math.min(allocatedPercent, 100)}%` }" />
        </div>
      </header>

      <form class="budget-category-create" @submit.prevent="createCategory">
        <UiInput
          v-model="categoryForm.name"
          label="Новый раздел"
          placeholder="Например, Продукты"
        />
        <UiInput
          v-model="categoryForm.amount"
          type="number"
          label="Плановая сумма"
          placeholder="0"
        />
        <UiButton type="submit" icon="＋">Добавить</UiButton>
      </form>

      <div v-if="budget.categories.length" class="budget-categories">
        <article
          v-for="(category, index) in budget.categories"
          :key="category.id"
          class="budget-category-card"
        >
          <div class="budget-category">
            <span class="budget-category__number" :style="{ '--category-color': category.color }">{{ index + 1 }}</span>
            <strong
              v-if="isRequiredCategory(category)"
              class="budget-category__name budget-category__name--locked"
            >
              {{ category.name }}
            </strong>
            <input
              v-else
              class="budget-category__name"
              :value="category.name"
              aria-label="Название раздела"
              @change="updateCategoryName(category.id, $event.target.value)"
            />
            <label class="budget-category__amount">
              <input
                :value="category.amount"
                type="number"
                min="0"
                step="100"
                aria-label="Плановая сумма"
                @input="budgetStore.updateCategory(category.id, { amount: $event.target.value })"
              />
              <span>₽</span>
            </label>
            <small>{{ categoryShare(category.amount) }}% дохода</small>
            <UiButton
              v-if="!isRequiredCategory(category)"
              size="sm"
              variant="secondary"
              icon="calendar"
              @click="openPaymentPlanner(category)"
            >
              Платёж
            </UiButton>
            <span v-else class="budget-category__required">Обязательное</span>
            <UiIconButton
              v-if="!isRequiredCategory(category)"
              icon="trash"
              label="Удалить раздел"
              size="sm"
              variant="danger"
              @click="removeCategory(category)"
            />
            <span
              v-else
              class="budget-category__managed"
              title="Раздел управляется ежемесячными обязательствами"
            >
              Авто
            </span>
          </div>

          <div v-if="category.payments?.length" class="budget-payments">
            <article
              v-for="payment in category.payments"
              :key="payment.id"
              class="budget-payment"
              :class="{
                'budget-payment--paid': payment.paid,
                'budget-payment--highlighted': payment.id === highlightedPaymentId,
                'budget-payment--required': payment.recurringRuleId,
              }"
            >
              <button
                type="button"
                class="budget-payment__check"
                :aria-label="payment.paid ? 'Вернуть платёж в план' : 'Отметить платёж оплаченным'"
                @click="budgetStore.togglePaymentPaid(category.id, payment.id)"
              >
                {{ payment.paid ? '✓' : '' }}
              </button>
              <div>
                <strong>{{ payment.title }}</strong>
                <small>
                  <span class="budget-payment__date">{{ formatDate(payment.date) }}</span>
                  <span>{{ formatMoney(payment.amount) }}</span>
                </small>
              </div>
              <span
                v-if="!payment.recurringRuleId || !payment.calendarEventId"
                :class="{ missing: !payment.calendarEventId }"
              >
                {{ payment.paid ? 'Оплачено' : payment.calendarEventId ? 'В календаре' : 'Нет в календаре' }}
              </span>
              <UiButton
                v-if="!payment.calendarEventId"
                size="sm"
                variant="secondary"
                @click="restorePayment(category, payment)"
              >
                Вернуть
              </UiButton>
              <UiIconButton
                v-if="!payment.recurringRuleId"
                icon="trash"
                label="Удалить платёж"
                size="sm"
                variant="danger"
                @click="removePayment(category, payment)"
              />
            </article>
          </div>
        </article>
      </div>

      <div v-else class="budget-empty">
        <span>₽</span>
        <strong>Добавь первый раздел</strong>
        <p>Начни с обязательных расходов или накоплений.</p>
        <div>
          <button v-for="suggestion in suggestions" :key="suggestion" type="button" @click="addSuggestion(suggestion)">
            + {{ suggestion }}
          </button>
        </div>
      </div>
    </section>

    <footer class="budget-note">
      <span>Как работает календарь</span>
      Обязательные расходы попадают туда после применения к месяцу. Обычные расходы — только после нажатия кнопки «Платёж».
    </footer>

    <UiModal v-model="isPaymentPlannerOpen" title="Запланировать платёж" eyebrow="Бюджет и календарь" width="520px">
      <form class="payment-planner" @submit.prevent="createPayment">
        <div class="payment-planner__category">
          <span>Раздел</span>
          <strong>{{ planningCategory?.name }}</strong>
        </div>
        <UiInput v-model="paymentForm.title" label="Что оплатить" placeholder="Квартира, коммуналка, интернет…" />
        <div class="payment-planner__grid">
          <UiInput v-model="paymentForm.amount" type="number" label="Сумма" placeholder="0" />
          <label class="payment-planner__date">
            <span>Дата оплаты</span>
            <input
              v-model="paymentForm.date"
              type="date"
              :min="`${selectedMonth}-01`"
              :max="selectedMonthEnd"
            />
          </label>
        </div>
        <div class="payment-planner__grid">
          <label>
            <span>Напоминание</span>
            <UiSelect v-model="paymentForm.reminder">
              <option value="none">Без напоминания</option>
              <option value="1h">За час</option>
              <option value="1d">За день</option>
            </UiSelect>
          </label>
        </div>
        <p>Этот расход появится в календаре один раз — в выбранную дату в 09:00. На следующий месяц его нужно добавить заново.</p>
        <footer>
          <UiButton variant="secondary" @click="isPaymentPlannerOpen = false">Отмена</UiButton>
          <UiButton type="submit" :loading="isPaymentSaving">Добавить в календарь</UiButton>
        </footer>
      </form>
    </UiModal>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BudgetAnalytics from '../../components/budget/BudgetAnalytics.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiIconButton from '../../components/ui/UiIconButton.vue'
import UiInput from '../../components/ui/UiInput.vue'
import UiModal from '../../components/ui/UiModal.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import { useNotification } from '../../composables/ui/useNotification.js'
import { budgetStore } from '../../stores/budget.store.js'
import { DateHelper } from '../../utils/date/dateHelper.js'
import { calendarStore } from '../../stores/calendar.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'

const suggestions = ['Жильё', 'Продукты', 'Транспорт', 'Накопления']
const route = useRoute()
const { notify } = useNotification()
const budget = budgetStore.currentBudget
const selectedMonth = budgetStore.selectedMonth
const plannedTotal = budgetStore.plannedTotal
const remainingAmount = budgetStore.remainingAmount
const allocatedPercent = budgetStore.allocatedPercent
const requiredPaymentsTotal = budgetStore.requiredPaymentsTotal
const recurringRules = budgetStore.recurringRules
const activeRecurringRules = computed(() => recurringRules.value.filter((rule) => rule.active))
const appliedRuleIds = computed(() => new Set(
  budget.value.categories.flatMap((category) => category.payments || [])
    .map((payment) => payment.recurringRuleId)
    .filter(Boolean)
))
const hasAppliedRules = computed(() => appliedRuleIds.value.size > 0)
const allRulesApplied = computed(() => (
  activeRecurringRules.value.length > 0
  && activeRecurringRules.value.every((rule) => appliedRuleIds.value.has(rule.id))
))
const highlightedPaymentId = computed(() => String(route.query.payment || ''))
const categoryForm = reactive({ name: '', amount: '' })
const isApplyingRules = ref(false)
const ruleForm = reactive({
  title: '',
  defaultAmount: '',
  dueDay: 1,
  categoryName: 'Обязательные платежи',
  reminder: '1d',
  calendarEnabled: true,
})
const isPaymentPlannerOpen = ref(false)
const isPaymentSaving = ref(false)
const planningCategory = ref(null)
const paymentForm = reactive({
  title: '',
  amount: '',
  date: DateHelper.toKey(new Date()),
  reminder: '1d',
})

const selectedMonthLabel = computed(() => new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric',
}).format(parseMonth(selectedMonth.value)))
const isCurrentMonth = computed(() => selectedMonth.value === getCurrentMonth())
const selectedMonthEnd = computed(() => {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  return `${selectedMonth.value}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
})
const categoryWord = computed(() => pluralize(budget.value.categories.length, ['раздел', 'раздела', 'разделов']))

function setMonth(month) {
  budgetStore.setSelectedMonth(month)
}

function shiftMonth(delta) {
  const date = parseMonth(selectedMonth.value)
  date.setMonth(date.getMonth() + delta)
  setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
}

function goToCurrentMonth() {
  setMonth(getCurrentMonth())
}

function setIncome(value) {
  budgetStore.updateSettings({ income: value })
}

async function createCategory() {
  const result = await budgetStore.addCategory(categoryForm.name, categoryForm.amount)
  if (!result.ok) return notify(result.message, 'warning')
  categoryForm.name = ''
  categoryForm.amount = ''
}

async function addSuggestion(name) {
  const result = await budgetStore.addCategory(name)
  if (!result.ok) notify(result.message, 'warning')
}

async function createRecurringRule() {
  const result = await budgetStore.addRecurringRule(ruleForm)
  notify(
    result.ok ? 'Обязательный платёж сохранён как шаблон' : result.message,
    result.ok ? 'success' : 'warning'
  )
  if (!result.ok) return
  ruleForm.title = ''
  ruleForm.defaultAmount = ''
  ruleForm.dueDay = 1
}

async function applyRulesToMonth() {
  if (isApplyingRules.value) return
  isApplyingRules.value = true
  const result = await budgetStore.prepareMonth({
    income: budget.value.income,
    includeRules: true,
  })
  isApplyingRules.value = false
  notify(
    result.ok
      ? result.payments.length
        ? `Добавлено платежей: ${result.payments.length}`
        : 'Все обязательные платежи уже применены'
      : result.message,
    result.ok ? 'success' : 'warning'
  )
}

async function unapplyRulesFromMonth() {
  if (isApplyingRules.value) return
  isApplyingRules.value = true
  const result = await budgetStore.unapplyRulesFromMonth()
  isApplyingRules.value = false
  notify(
    result.ok
      ? 'Обязательные расходы удалены из выбранного месяца и календаря'
      : result.message,
    result.ok ? 'info' : 'warning'
  )
}

async function removeRecurringRule(rule) {
  const result = await budgetStore.removeRecurringRule(rule.id)
  notify(result.ok ? 'Правило удалено' : result.message, result.ok ? 'info' : 'warning')
}

function updateCategoryName(id, name) {
  const title = String(name || '').trim()
  if (!title) return
  budgetStore.updateCategory(id, { name: title })
}

function isRequiredCategory(category) {
  return category.payments?.some((payment) => payment.recurringRuleId)
}

function openPaymentPlanner(category) {
  planningCategory.value = category
  paymentForm.title = ''
  paymentForm.amount = category.amount || ''
  paymentForm.date = getDefaultPaymentDate()
  paymentForm.reminder = '1d'
  isPaymentPlannerOpen.value = true
}

function getDefaultPaymentDate() {
  const today = new Date()
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const day = selectedMonth.value === getCurrentMonth()
    ? Math.min(today.getDate(), lastDay)
    : 1
  return `${selectedMonth.value}-${String(day).padStart(2, '0')}`
}

function getCurrentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function parseMonth(month) {
  const [year, monthIndex] = month.split('-').map(Number)
  return new Date(year, monthIndex - 1, 1)
}

async function createPayment() {
  if (!planningCategory.value || isPaymentSaving.value) return
  isPaymentSaving.value = true
  const result = await budgetStore.addPayment(planningCategory.value.id, paymentForm)
  isPaymentSaving.value = false
  notify(result.ok ? 'Платёж добавлен в календарь' : result.message, result.ok ? 'success' : 'warning')
  if (result.ok) isPaymentPlannerOpen.value = false
}

async function removePayment(category, payment) {
  const result = await budgetStore.removePayment(category.id, payment.id)
  notify(result.ok ? 'Платёж и событие удалены' : result.message, result.ok ? 'info' : 'warning')
}

async function restorePayment(category, payment) {
  const result = await budgetStore.restorePaymentEvent(category.id, payment.id)
  notify(result.ok ? 'Событие возвращено в календарь' : result.message, result.ok ? 'success' : 'warning')
}

async function removeCategory(category) {
  const result = await budgetStore.removeCategory(category.id)
  notify(result.ok ? 'Раздел удалён' : result.message, result.ok ? 'info' : 'warning')
}

function categoryShare(amount) {
  const income = Number(budget.value.income || 0)
  return income ? Math.round((Number(amount || 0) / income) * 100) : 0
}

function formatDate(date) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(DateHelper.parseKey(date))
}

function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function reminderLabel(reminder) {
  return reminder === '1h' ? 'за час' : reminder === '1d' ? 'за день' : 'не нужно'
}

function pluralize(value, words) {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return words[2]
  if (last === 1) return words[0]
  if (last >= 2 && last <= 4) return words[1]
  return words[2]
}

watch(calendarStore.events, (events) => {
  budgetStore.syncCalendarLinks()
  events
    .filter((event) => event.linkedEntityType === 'budget-payment')
    .forEach((event) => budgetStore.syncPaymentFromCalendar(event))
}, { immediate: true })

onMounted(async () => {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId) return
  const result = await budgetStore.loadWorkspace(workspaceId)
  if (result === null) {
    notify('Сначала примени миграцию бюджета в Supabase', 'warning')
  }
})
</script>

<style scoped>
.budget-page{display:grid;gap:12px;width:min(100%,1100px);margin:0 auto}.budget-hero{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:24px;background:radial-gradient(circle at 90% 10%,color-mix(in srgb,var(--success) 14%,transparent),transparent 260px),var(--panel-bg)}.budget-hero>div:first-child>span,.budget-plan__header>div>span{color:var(--success);font-size:9px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.budget-hero h1{margin:5px 0 7px}.budget-hero p,.budget-plan__header p{max-width:650px;margin:0;color:var(--text-secondary)}.budget-hero__balance{min-width:220px;border:1px solid color-mix(in srgb,var(--success) 30%,var(--border-color));border-radius:16px;padding:15px;background:color-mix(in srgb,var(--success) 8%,var(--control-bg));text-align:right}.budget-hero__balance small,.budget-hero__balance strong{display:block}.budget-hero__balance small{color:var(--text-muted);font-size:9px;text-transform:uppercase}.budget-hero__balance strong{margin-top:4px;color:var(--success);font-size:25px}.budget-hero__balance--negative{border-color:color-mix(in srgb,var(--danger) 35%,var(--border-color));background:color-mix(in srgb,var(--danger) 7%,var(--control-bg))}.budget-hero__balance--negative strong{color:var(--danger)}
.budget-setup{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(240px,.7fr);align-items:end;gap:18px;padding:16px}.budget-setup__field{display:grid;gap:6px}.budget-setup__field>span{color:var(--text-secondary);font-size:11px;font-weight:700}.budget-month-picker{display:grid;grid-template-columns:34px minmax(0,1fr) 34px;align-items:center;gap:6px}.budget-month-picker input{width:100%;min-height:36px;border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0 11px;color:var(--text-primary);background:var(--field-bg);outline:0}.budget-month-picker input:focus{border-color:var(--accent-border);box-shadow:0 0 0 2px var(--accent-soft)}
.budget-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.budget-stat{display:grid;gap:3px;padding:15px}.budget-stat span{color:var(--text-muted);font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.budget-stat strong{font-size:22px}.budget-stat small{color:var(--text-muted)}.budget-stat--danger{border-color:color-mix(in srgb,var(--danger) 32%,var(--border-color))}.budget-stat--danger strong{color:var(--danger)}
.budget-rules{display:grid;gap:14px;padding:18px}.budget-rules>header{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}.budget-rules>header span{color:var(--info);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.budget-rules h2{margin:3px 0 4px}.budget-rules p{margin:0;color:var(--text-muted)}.budget-rule-create{display:grid;grid-template-columns:minmax(160px,1fr) 150px 120px minmax(150px,.7fr) auto;align-items:end;gap:7px;border-top:1px solid var(--border-color);padding-top:14px}.budget-rule-list{display:grid;gap:8px;padding:2px}.budget-rule-list article{min-width:0;display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;align-items:center;gap:10px;border:1px solid var(--border-color);border-radius:12px;padding:9px 10px;background:var(--control-bg)}.budget-rule-list article>span{display:grid;place-items:center;width:32px;height:32px;border-radius:9px;color:var(--info);background:color-mix(in srgb,var(--info) 9%,var(--field-bg));font-weight:850}.budget-rule-list article>div{min-width:0}.budget-rule-list strong,.budget-rule-list small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.budget-rule-list small{margin-top:2px;color:var(--text-muted);font-size:9px}.budget-rule__status{border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:5px 9px;color:var(--text-muted);background:var(--field-bg);font-size:8px;font-weight:800}.budget-rule__status.active{color:var(--success);border-color:color-mix(in srgb,var(--success) 30%,var(--border-color));background:color-mix(in srgb,var(--success) 8%,var(--field-bg))}.budget-rule__delete{justify-self:end}.budget-rules .budget-rules__empty{border:1px dashed var(--border-color);border-radius:11px;padding:18px;text-align:center}
.budget-plan{display:grid;gap:16px;padding:19px}.budget-plan__header{display:grid;grid-template-columns:minmax(0,1fr) 220px;align-items:end;gap:18px}.budget-plan__header h2{margin:3px 0 5px}.budget-progress{height:9px;border-radius:var(--radius-pill);background:var(--control-bg);overflow:hidden}.budget-progress span{display:block;height:100%;border-radius:inherit;background:var(--success);transition:width .24s var(--ease-out)}.budget-progress--over span{background:var(--danger)}
.budget-category-create{display:grid;grid-template-columns:minmax(200px,1fr) minmax(160px,.5fr) auto;align-items:end;gap:8px;border-top:1px solid var(--border-color);padding-top:15px}.budget-categories{display:grid;gap:10px;padding:2px}.budget-category-card{min-width:0;border:1px solid var(--border-color);border-radius:13px;background:var(--control-bg);box-shadow:0 1px 0 color-mix(in srgb,var(--border-strong) 32%,transparent)}.budget-category{display:grid;grid-template-columns:30px minmax(140px,1fr) 150px 80px auto 34px;align-items:center;gap:9px;padding:9px 10px}.budget-category__number{display:grid;place-items:center;width:26px;height:26px;border-radius:8px;color:var(--text-muted);background:var(--field-bg-focus);font-size:10px;font-weight:800}.budget-category__name,.budget-category__amount input{min-width:0;border:0;color:var(--text-primary);background:transparent;outline:0}.budget-category__name{font-weight:750}.budget-category__amount{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;border:1px solid var(--border-color);border-radius:9px;padding:0 9px;background:var(--field-bg)}.budget-category__amount input{width:100%;min-height:32px;text-align:right}.budget-category__amount span{color:var(--text-muted)}.budget-category>small{color:var(--text-muted);text-align:right}.budget-category__required{border-radius:var(--radius-pill);padding:5px 8px;color:var(--success);background:color-mix(in srgb,var(--success) 9%,var(--field-bg));font-size:8px;font-weight:800;white-space:nowrap}.budget-category__managed{display:grid;place-items:center;min-height:22px;border-radius:var(--radius-pill);color:var(--info);background:color-mix(in srgb,var(--info) 9%,var(--field-bg));font-size:7px;font-weight:850;text-transform:uppercase}.budget-payments{display:grid;gap:1px;margin:0 1px 1px;border-top:1px solid var(--border-color);border-radius:0 0 11px 11px;background:var(--border-color);overflow:hidden}.budget-payment{display:grid;grid-template-columns:24px minmax(0,1fr) auto auto 34px;align-items:center;gap:9px;padding:8px 10px;background:var(--card-soft)}.budget-payment__check{display:grid;place-items:center;width:22px;height:22px;border:1px solid var(--border-strong);border-radius:7px;color:var(--text-inverse);background:var(--control-bg);font-size:11px;font-weight:900}.budget-payment>div{min-width:0}.budget-payment strong,.budget-payment small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.budget-payment small{margin-top:2px;color:var(--text-muted);font-size:9px}.budget-payment>span{border-radius:var(--radius-pill);padding:4px 7px;color:var(--info);background:color-mix(in srgb,var(--info) 8%,var(--control-bg));font-size:8px;font-weight:800}.budget-payment>span.missing{color:var(--warning);background:color-mix(in srgb,var(--warning) 9%,var(--control-bg))}.budget-payment__managed{display:grid;place-items:center;min-height:22px;padding:0!important;color:var(--info)!important;background:color-mix(in srgb,var(--info) 9%,var(--field-bg))!important;font-size:7px!important;text-transform:uppercase}.budget-payment--paid{opacity:.62}.budget-payment--paid .budget-payment__check{border-color:var(--success);background:var(--success)}.budget-payment--paid strong{text-decoration:line-through}.budget-payment--paid>span{color:var(--success);background:color-mix(in srgb,var(--success) 8%,var(--control-bg))}.budget-empty{display:grid;place-items:center;gap:5px;min-height:230px;border:1px dashed var(--border-color);border-radius:15px;color:var(--text-muted);text-align:center}.budget-empty>span{display:grid;place-items:center;width:44px;height:44px;border-radius:13px;color:var(--success);background:color-mix(in srgb,var(--success) 9%,var(--control-bg));font-size:20px;font-weight:900}.budget-empty p{margin:0}.budget-empty div{display:flex;flex-wrap:wrap;justify-content:center;gap:5px;margin-top:7px}.budget-empty button{border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:5px 9px;color:var(--text-secondary);background:var(--control-bg);font-size:9px}.budget-note{display:flex;align-items:center;gap:8px;padding:3px 4px;color:var(--text-muted);font-size:9px}.budget-note span{border-radius:var(--radius-pill);padding:3px 6px;color:var(--info);background:color-mix(in srgb,var(--info) 8%,var(--control-bg));font-weight:800}.payment-planner{display:grid;gap:13px}.payment-planner__category{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--border-color);border-radius:11px;padding:9px 11px;background:var(--control-bg)}.payment-planner__category span,.payment-planner label>span{color:var(--text-muted);font-size:10px;font-weight:700}.payment-planner__grid{display:grid;grid-template-columns:1fr;gap:8px}.payment-planner label{display:grid;gap:5px}.payment-planner__date input{width:100%;min-height:36px;border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0 11px;color:var(--text-primary);background:var(--field-bg);outline:0}.payment-planner__date input:focus{border-color:var(--accent-border);box-shadow:0 0 0 2px var(--accent-soft)}.payment-planner p{margin:0;color:var(--text-muted);font-size:9px;line-height:1.5}.payment-planner footer{display:flex;justify-content:flex-end;gap:7px;margin-top:4px}
.budget-payment--highlighted{position:relative;z-index:1;background:color-mix(in srgb,var(--success) 10%,var(--card-soft));box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--success) 55%,transparent);animation:budgetHighlight 1.4s var(--ease-out) both}@keyframes budgetHighlight{0%{transform:scale(.985)}45%{transform:scale(1.005)}100%{transform:none}}

/* Polished budget experience */
.budget-page {
  position: relative;
  padding-bottom: 12px;
}

.budget-page::before {
  position: absolute;
  z-index: -1;
  top: 40px;
  right: 4%;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--success) 4%, transparent);
  filter: blur(70px);
  content: '';
  pointer-events: none;
}

.budget-hero,
.budget-setup,
.budget-stat,
.budget-rules,
.budget-plan {
  animation: budgetSectionEnter .48s var(--ease-out) both;
}

.budget-setup { animation-delay: .04s; }
.budget-summary { animation: budgetSectionEnter .48s .08s var(--ease-out) both; }
.budget-rules { animation-delay: .12s; }
.budget-plan { animation-delay: .16s; }

.budget-hero {
  min-height: 150px;
  border-color: color-mix(in srgb, var(--success) 18%, var(--border-color));
  background:
    radial-gradient(circle at 88% 16%, color-mix(in srgb, var(--success) 16%, transparent), transparent 230px),
    linear-gradient(135deg, color-mix(in srgb, var(--success) 3%, var(--panel-bg)), var(--panel-bg));
  box-shadow: var(--shadow-sm);
}

.budget-hero h1 {
  max-width: 620px;
  font-size: clamp(24px, 3vw, 34px);
  letter-spacing: -.025em;
}

.budget-hero__balance {
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 10%, transparent);
  transition: transform .22s var(--ease-out), border-color .22s, box-shadow .22s;
}

.budget-hero__balance::after {
  position: absolute;
  top: -40px;
  right: -30px;
  width: 100px;
  height: 100px;
  border: 18px solid color-mix(in srgb, currentColor 6%, transparent);
  border-radius: 50%;
  content: '';
}

.budget-hero__balance:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.budget-month-picker input,
.budget-category__amount,
.payment-planner__date input {
  transition: border-color .18s, background .18s, box-shadow .18s, transform .18s;
}

.budget-month-picker input:hover,
.budget-category__amount:hover {
  border-color: var(--border-strong);
  background: var(--field-bg-focus);
}

.budget-summary {
  gap: 10px;
}

.budget-stat {
  position: relative;
  min-height: 102px;
  overflow: hidden;
  padding: 17px;
  transition: transform .2s var(--ease-out), border-color .2s, box-shadow .2s;
}

.budget-stat::after {
  position: absolute;
  right: -18px;
  bottom: -22px;
  width: 78px;
  height: 78px;
  border: 14px solid color-mix(in srgb, var(--stat-color, var(--info)) 8%, transparent);
  border-radius: 50%;
  content: '';
}

.budget-stat:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--stat-color, var(--info)) 28%, var(--border-color));
  box-shadow: var(--shadow-md);
}

.budget-stat--income { --stat-color: var(--success); }
.budget-stat--planned { --stat-color: var(--info); }
.budget-stat--danger { --stat-color: var(--danger); }

.budget-stat strong {
  position: relative;
  z-index: 1;
  letter-spacing: -.02em;
}

.budget-rules,
.budget-plan {
  border-color: color-mix(in srgb, var(--border-strong) 72%, transparent);
  box-shadow: var(--shadow-sm);
}

.budget-rules > header,
.budget-plan__header {
  position: relative;
  padding-bottom: 13px;
}

.budget-rules > header::after,
.budget-plan__header::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, var(--border-strong), transparent);
  content: '';
}

.budget-rule-create,
.budget-category-create {
  border-top: 0;
  border-radius: 13px;
  padding: 12px;
  background: color-mix(in srgb, var(--control-bg) 78%, transparent);
}

.budget-rule-list article,
.budget-category-card {
  position: relative;
  transition:
    transform .2s var(--ease-out),
    border-color .2s,
    box-shadow .2s,
    background .2s;
}

.budget-rule-list article::before,
.budget-category-card::before {
  position: absolute;
  top: 9px;
  bottom: 9px;
  left: -1px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--info);
  content: '';
  opacity: .65;
}

.budget-category-card::before {
  background: var(--success);
}

.budget-rule-list article:hover,
.budget-category-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-strong);
  box-shadow: 0 10px 28px color-mix(in srgb, #000 8%, transparent);
}

.budget-rule__date {
  height: 38px !important;
  display: grid !important;
  align-content: center;
  line-height: 1;
}

.budget-rule__date b,
.budget-rule__date small {
  display: block;
}

.budget-rule__date b {
  font-size: 15px;
}

.budget-rule__date small {
  margin-top: 2px;
  font-size: 6px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.budget-rule__status,
.budget-rule__delete,
.budget-category__required,
.budget-category__managed,
.budget-payment__managed {
  transition: transform .16s var(--ease-out), background .16s, border-color .16s, opacity .16s;
}

.budget-rule__status:hover,
.budget-rule__delete:hover {
  transform: translateY(-1px);
}

.budget-category {
  min-height: 54px;
}

.budget-category__number {
  position: relative;
  color: color-mix(in srgb, var(--category-color, var(--success)) 76%, var(--text-primary));
  background: color-mix(in srgb, var(--category-color, var(--success)) 12%, var(--field-bg));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--category-color, var(--success)) 22%, transparent);
}

.budget-category__name:focus {
  border-radius: 6px;
  padding: 4px 6px;
  background: var(--field-bg-focus);
  box-shadow: 0 0 0 2px var(--accent-soft);
}

.budget-category__name--locked {
  display: block;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.budget-payments {
  border-top-color: color-mix(in srgb, var(--border-strong) 65%, transparent);
}

.budget-payment--required {
  grid-template-columns: 24px minmax(0, 1fr);
}

.budget-payment--required:has(.missing) {
  grid-template-columns: 24px minmax(0, 1fr) auto auto;
}

.budget-payment {
  min-height: 48px;
  transition: background .18s, transform .18s var(--ease-out), opacity .18s;
}

.budget-payment:hover {
  position: relative;
  z-index: 1;
  background: var(--control-bg-hover);
  transform: translateX(2px);
}

.budget-payment__check {
  cursor: pointer;
  transition: transform .16s var(--ease-out), background .16s, border-color .16s;
}

.budget-payment__check:hover {
  transform: scale(1.08);
  border-color: var(--success);
}

.budget-payment small {
  display: flex;
  align-items: center;
  gap: 6px;
}

.budget-payment__date {
  border-radius: var(--radius-pill);
  padding: 2px 5px;
  color: var(--text-secondary);
  background: var(--field-bg);
}

.budget-payment--paid {
  opacity: .68;
  background: color-mix(in srgb, var(--success) 4%, var(--card-soft));
}

.budget-payment--paid:hover {
  opacity: .82;
}

.budget-empty {
  background:
    radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--success) 7%, transparent), transparent 130px),
    var(--card-soft);
}

.budget-empty button {
  transition: color .16s, border-color .16s, background .16s, transform .16s var(--ease-out);
}

.budget-empty button:hover {
  transform: translateY(-2px);
  border-color: var(--accent-border);
  color: var(--text-primary);
  background: var(--accent-soft);
}

.budget-note {
  justify-content: center;
  padding: 7px;
  text-align: center;
}

/* Compact command centre: the month, income and result should be visible at once. */
.budget-page::before,
.budget-stat::after {
  display: none;
}

.budget-command {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px 24px;
  padding: 20px;
  overflow: visible;
  animation: budgetSectionEnter .35s var(--ease-out) both;
}

.budget-command__heading {
  min-width: 0;
}

.budget-command__heading h1 {
  margin: 5px 0 6px;
  font-size: clamp(22px, 2.2vw, 30px);
  line-height: 1.08;
  text-transform: capitalize;
}

.budget-command__heading p {
  max-width: 620px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.budget-kicker {
  color: var(--accent);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.budget-command__balance {
  align-self: start;
  min-width: 210px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--success) 26%, var(--border));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--success) 7%, var(--card-soft));
  text-align: right;
}

.budget-command__balance small,
.budget-command__balance strong {
  display: block;
}

.budget-command__balance small {
  color: var(--text-secondary);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.budget-command__balance strong {
  margin-top: 4px;
  font-size: 21px;
  line-height: 1;
}

.budget-command__balance--negative {
  border-color: color-mix(in srgb, var(--danger) 36%, var(--border));
  background: color-mix(in srgb, var(--danger) 8%, var(--card-soft));
  color: var(--danger);
}

.budget-command__controls {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(340px, 1.25fr) minmax(220px, .75fr);
  gap: 12px;
  align-items: end;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.budget-period {
  display: grid;
  gap: 7px;
}

.budget-period > span {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
}

.budget-period__actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.budget-month-picker {
  flex: 1 1 260px;
  max-width: 340px;
}

.budget-period__actions :deep(.ui-button) {
  flex: 0 0 auto;
  white-space: nowrap;
}

.budget-period__actions :deep(.ui-button:disabled) {
  opacity: .5;
}

.budget-summary {
  gap: 10px;
}

.budget-stat {
  min-height: 82px;
  padding: 13px 15px;
}

.budget-stat strong {
  margin-top: 3px;
  font-size: 20px;
}

.budget-rules,
.budget-plan {
  padding: 18px;
}

.budget-rules__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.budget-rule-list article:hover,
.budget-category-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px color-mix(in srgb, #000 6%, transparent);
}

@keyframes budgetSectionEnter {
  from {
    opacity: 0;
    transform: translateY(12px) scale(.995);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .budget-command,
  .budget-hero,
  .budget-setup,
  .budget-summary,
  .budget-rules,
  .budget-plan,
  .budget-payment--highlighted {
    animation-duration: .01ms;
  }

  .budget-stat,
  .budget-rule-list article,
  .budget-category-card,
  .budget-payment {
    transition-duration: .01ms;
  }
}
@media (min-width: 621px) and (max-width: 1180px) {
  .budget-page {
    gap: 8px;
    width: 100%;
  }

  .budget-command {
    grid-template-columns: minmax(0, 1fr) 190px;
    gap: 10px 14px;
    padding: 13px;
  }

  .budget-command__heading h1 {
    margin: 2px 0 3px;
    font-size: 21px;
  }

  .budget-command__heading p {
    font-size: 10px;
    line-height: 1.35;
  }

  .budget-command__balance {
    min-width: 0;
    padding: 9px 11px;
  }

  .budget-command__balance strong {
    font-size: 18px;
  }

  .budget-command__controls {
    grid-template-columns: minmax(310px, 1.2fr) minmax(190px, .8fr);
    gap: 8px;
    padding-top: 9px;
  }

  .budget-period {
    gap: 3px;
  }

  .budget-period__actions {
    gap: 5px;
  }

  .budget-month-picker {
    max-width: 310px;
  }

  .budget-summary {
    gap: 7px;
  }

  .budget-stat {
    min-height: 65px;
    padding: 9px 11px;
  }

  .budget-stat strong {
    margin-top: 1px;
    font-size: 17px;
  }

  .budget-stat small {
    font-size: 8px;
  }

  .budget-rules,
  .budget-plan {
    gap: 10px;
    padding: 12px;
  }

  .budget-rules > header,
  .budget-plan__header {
    gap: 10px;
  }

  .budget-rules h2,
  .budget-plan__header h2 {
    margin-block: 1px 2px;
    font-size: 16px;
  }

  .budget-rules p,
  .budget-plan__header p {
    font-size: 9px;
    line-height: 1.35;
  }

  .budget-rule-create {
    grid-template-columns: minmax(140px, 1fr) 120px 100px minmax(130px, .8fr) auto;
    gap: 5px;
    padding: 8px;
  }

  .budget-rule-list {
    gap: 5px;
  }

  .budget-rule-list article {
    grid-template-columns: 30px minmax(0, 1fr) auto auto;
    gap: 7px;
    padding: 7px 8px;
  }

  .budget-rule__date {
    height: 32px !important;
  }

  .budget-category-create {
    grid-template-columns: minmax(180px, 1fr) minmax(130px, .45fr) auto;
    gap: 6px;
    padding: 8px;
  }

  .budget-categories {
    gap: 6px;
  }

  .budget-category {
    grid-template-columns: 26px minmax(120px, 1fr) minmax(105px, 135px) 58px auto 30px;
    gap: 6px;
    min-height: 44px;
    padding: 6px 8px;
  }

  .budget-category__number {
    width: 23px;
    height: 23px;
  }

  .budget-category__amount {
    padding-inline: 6px;
  }

  .budget-category__amount input {
    min-height: 28px;
  }

  .budget-payment {
    min-height: 40px;
    gap: 6px;
    padding: 6px 8px;
  }

  .budget-empty {
    min-height: 150px;
  }

  .budget-note {
    padding: 4px;
  }

  .budget-page :deep(.ui-input) {
    gap: 3px;
  }

  .budget-page :deep(.ui-input__label) {
    font-size: 9px;
  }

  .budget-page :deep(.ui-input__control) {
    min-height: 32px;
    padding-inline: 9px;
    font-size: 12px;
  }

  .budget-page :deep(.ui-button) {
    min-height: 32px;
  }
}
@media(max-width:900px){.budget-rule-create{grid-template-columns:repeat(2,minmax(0,1fr))}.budget-rule-create :deep(.ui-button){grid-column:1/-1}}
@media(max-width:800px){.budget-command{grid-template-columns:1fr}.budget-command__balance{min-width:0;text-align:left}.budget-command__controls{grid-template-columns:1fr}.budget-hero,.budget-setup,.budget-plan__header{grid-template-columns:1fr;display:grid}.budget-rules>header{align-items:stretch;display:grid}.budget-rules__actions{justify-content:flex-start}.budget-hero__balance{min-width:0;text-align:left}.budget-summary{grid-template-columns:repeat(3,minmax(0,1fr))}.budget-category{grid-template-columns:30px minmax(0,1fr) 130px auto 28px}.budget-category>small{display:none}}
@media(max-width:620px){.budget-command{padding:16px}.budget-command__controls{grid-template-columns:minmax(0,1fr)}.budget-period__actions{align-items:stretch;flex-direction:column}.budget-month-picker{max-width:none}.budget-period__actions :deep(.ui-button){width:100%}.budget-summary{grid-template-columns:1fr}.budget-rules,.budget-plan{padding:14px}}
@media(max-width:560px){.budget-page{padding:0}.budget-rule-create,.budget-category-create,.payment-planner__grid{grid-template-columns:1fr}.budget-rule-list article{grid-template-columns:32px minmax(0,1fr);align-items:start}.budget-rule__status{grid-column:2;justify-self:start}.budget-rule__delete{grid-column:2;justify-self:start}.budget-category{grid-template-columns:26px minmax(0,1fr) 28px}.budget-category__amount{grid-column:2/3}.budget-category>:deep(.ui-button){grid-column:2}.budget-category>button{grid-column:3;grid-row:1}.budget-payment{grid-template-columns:24px minmax(0,1fr) 28px}.budget-payment>span{display:none}.budget-note{align-items:flex-start}}
</style>
