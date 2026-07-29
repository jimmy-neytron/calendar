<template>
  <section class="budget-page">
    <header class="budget-toolbar">
      <div>
        <span>Бюджет</span>
        <h1>{{ selectedMonthLabel }}</h1>
      </div>

      <div class="budget-toolbar__actions">
        <div class="month-picker">
          <UiIconButton icon="left" label="Предыдущий месяц" @click="shiftMonth(-1)" />
          <input :value="selectedMonth" type="month" aria-label="Месяц бюджета" @input="setMonth($event.target.value)" />
          <UiIconButton icon="right" label="Следующий месяц" @click="shiftMonth(1)" />
        </div>
        <UiIconButton icon="settings" label="Настройки бюджета" @click="openGlobalSetup" />
      </div>
    </header>

    <div v-if="isLoading" class="budget-loading panel">
      <span /><span /><span />
    </div>

    <template v-else>
      <section class="balance-panel panel" :class="{ negative: remainingAmount < 0 }">
        <div class="balance-panel__main">
          <span class="balance-label">{{ remainingAmount < 0 ? 'Не хватает по плану' : 'Свободно после плана' }}</span>
          <strong>{{ formatMoney(Math.abs(remainingAmount)) }}</strong>
          <div class="balance-progress">
            <i :style="{ width: `${Math.min(100, allocatedPercent)}%` }" />
          </div>
          <small>{{ allocatedPercent }}% дохода распределено</small>
        </div>

        <div class="balance-panel__numbers">
          <article><span>Доход</span><strong>{{ formatMoney(budget.income) }}</strong></article>
          <article><span>План</span><strong>{{ formatMoney(plannedTotal) }}</strong></article>
        </div>

        <div class="balance-panel__actions">
          <UiButton icon="edit" @click="isMonthModalOpen = true">План месяца</UiButton>
          <UiButton variant="secondary" icon="chart" @click="isActualsModalOpen = true">Внести факт</UiButton>
        </div>
      </section>

      <section class="budget-cards">
        <article class="simple-card simple-card--required panel">
          <header class="required-card__header">
            <div class="required-card__heading">
              <span class="simple-card__icon"><UiIcon name="calendar" /></span>
              <div>
                <small>Регулярные платежи</small>
                <strong>Обязательные</strong>
              </div>
            </div>
            <span class="auto-badge"><UiIcon name="refresh" /> Авто</span>
          </header>
          <div class="simple-card__value required-card__total">
            <strong>{{ formatMoney(requiredPaymentsTotal) }}</strong>
            <span>на {{ requiredPayments.length }} {{ requiredPaymentWord }}</span>
          </div>
          <div v-if="nextRequiredPayment" class="next-payment">
            <small>Ближайший платёж</small>
            <div class="next-payment__content">
              <span>{{ shortDate(nextRequiredPayment.date) }}</span>
              <strong>{{ nextRequiredPayment.title }}</strong>
              <b>{{ formatMoney(nextRequiredPayment.amount) }}</b>
            </div>
          </div>
          <div v-else class="simple-empty">Платежей нет</div>
          <UiButton class="required-card__button" variant="secondary" icon="right" @click="isRequiredModalOpen = true">
            Все платежи
          </UiButton>
        </article>

        <article class="simple-card simple-card--tracked panel">
          <header>
            <span class="simple-card__icon"><UiIcon name="chart" /></span>
            <span>{{ flexibleCategories.length }} категорий</span>
          </header>
          <div class="simple-card__value">
            <small>Траты под контролем</small>
            <strong>{{ formatMoney(flexibleTotal) }}</strong>
          </div>
          <div v-if="categoryPreview.length" class="category-preview">
            <div v-for="category in categoryPreview" :key="category.id">
              <i :style="{ background: category.color }" />
              <span>{{ category.name }}</span>
              <strong>{{ formatMoney(category.amount) }}</strong>
            </div>
          </div>
          <div v-else class="simple-empty">Категории не выбраны</div>
          <UiButton variant="secondary" @click="isMonthModalOpen = true">Настроить категории</UiButton>
        </article>

        <article class="simple-card simple-card--fact panel">
          <header>
            <span class="simple-card__icon"><UiIcon name="check" /></span>
            <span>{{ hasActuals ? 'Заполнено' : 'По желанию' }}</span>
          </header>
          <div class="simple-card__value">
            <small>План и факт</small>
            <strong>{{ hasActuals ? formatMoney(actualTotal) : '—' }}</strong>
            <span>план {{ formatMoney(plannedTotal) }}</span>
          </div>
          <div class="fact-visual">
            <div>
              <i :style="{ width: `${actualProgress}%` }" :class="{ over: actualTotal > plannedTotal }" />
            </div>
            <span v-if="hasActuals" :class="{ over: actualTotal > plannedTotal }">
              {{ actualResultLabel }}
            </span>
            <span v-else>Факт пока не внесён</span>
          </div>
          <UiButton variant="secondary" @click="isActualsModalOpen = true">
            {{ hasActuals ? 'Изменить факт' : 'Заполнить факт' }}
          </UiButton>
        </article>
      </section>
    </template>

    <BudgetSetupModal
      v-model="isSetupModalOpen"
      :settings="setupSettings"
      :rules="activeRules"
      :categories="setupCategories"
      :saving="isSavingSetup"
      :is-editing="isSetupComplete"
      @save="saveSetup"
    />

    <BudgetMonthModal
      v-model="isMonthModalOpen"
      :month-label="selectedMonthLabel"
      :income="budget.income"
      :categories="budget.categories"
      :templates="categoryTemplates"
      :required-total="requiredPaymentsTotal"
      :required-count="requiredPayments.length"
      :saving="isSavingMonth"
      @save="saveMonth"
    />

    <BudgetActualsModal
      v-model="isActualsModalOpen"
      :month-label="selectedMonthLabel"
      :categories="budget.categories"
      :saving="isSavingActuals"
      @save="saveActuals"
    />

    <BudgetRequiredPaymentsModal
      v-model="isRequiredModalOpen"
      :month-label="selectedMonthLabel"
      :payments="requiredPayments"
      :total="requiredPaymentsTotal"
      @toggle="togglePayment"
      @edit-template="openTemplateFromRequired"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BudgetActualsModal from '../../components/budget/BudgetActualsModal.vue'
import BudgetMonthModal from '../../components/budget/BudgetMonthModal.vue'
import BudgetRequiredPaymentsModal from '../../components/budget/BudgetRequiredPaymentsModal.vue'
import BudgetSetupModal from '../../components/budget/BudgetSetupModal.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import UiIconButton from '../../components/ui/UiIconButton.vue'
import { useNotification } from '../../composables/ui/useNotification.js'
import { budgetStore } from '../../stores/budget.store.js'
import { calendarStore } from '../../stores/calendar.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'

const route = useRoute()
const { notify } = useNotification()
const budget = budgetStore.currentBudget
const selectedMonth = budgetStore.selectedMonth
const budgetSettings = budgetStore.budgetSettings
const categoryTemplates = budgetStore.categoryTemplates
const isSetupComplete = budgetStore.isSetupComplete
const plannedTotal = budgetStore.plannedTotal
const requiredPaymentsTotal = budgetStore.requiredPaymentsTotal
const remainingAmount = budgetStore.remainingAmount
const allocatedPercent = budgetStore.allocatedPercent
const actualTotal = budgetStore.actualTotal
const hasActuals = budgetStore.hasActuals

const activeRules = computed(() => budgetStore.recurringRules.value.filter((rule) => rule.active))
const requiredPayments = computed(() => budgetStore.payments.value
  .filter((payment) => payment.recurringRuleId)
  .map((payment) => ({
    ...payment,
    date: payment.dueDate,
    amount: Number(payment.plannedAmount || 0),
    paid: payment.status === 'paid',
  })))
const flexibleCategories = computed(() => budget.value.categories.filter((category) => (
  !category.payments?.some((payment) => payment.recurringRuleId)
)))
const flexibleTotal = computed(() => Math.max(0, plannedTotal.value - requiredPaymentsTotal.value))
const categoryPreview = computed(() => flexibleCategories.value.slice(0, 4))
const nextRequiredPayment = computed(() => requiredPayments.value.find((payment) => !payment.paid)
  || requiredPayments.value[0]
  || null)
const actualProgress = computed(() => plannedTotal.value
  ? Math.min(100, Math.round((actualTotal.value / plannedTotal.value) * 100))
  : 0)
const actualResultLabel = computed(() => {
  const difference = actualTotal.value - plannedTotal.value
  if (difference === 0) return 'Точно по плану'
  return difference > 0
    ? `Выше на ${formatMoney(difference)}`
    : `Ниже на ${formatMoney(Math.abs(difference))}`
})
const requiredPaymentWord = computed(() => pluralize(requiredPayments.value.length, ['платёж', 'платежа', 'платежей']))
const setupCategories = computed(() => categoryTemplates.value.length
  ? categoryTemplates.value
  : flexibleCategories.value.map((category) => ({
    name: category.name,
    defaultAmount: category.amount,
    color: category.color,
  })))
const setupSettings = computed(() => budgetSettings.value || { defaultIncome: budget.value.income })
const selectedMonthLabel = computed(() => new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric',
}).format(parseMonth(selectedMonth.value)))

const isLoading = ref(true)
const isSetupModalOpen = ref(false)
const isMonthModalOpen = ref(false)
const isActualsModalOpen = ref(false)
const isRequiredModalOpen = ref(false)
const isSavingSetup = ref(false)
const isSavingMonth = ref(false)
const isSavingActuals = ref(false)
const isChangingMonth = ref(false)

function setMonth(month) {
  budgetStore.setSelectedMonth(month)
}

function shiftMonth(delta) {
  const date = parseMonth(selectedMonth.value)
  date.setMonth(date.getMonth() + delta)
  setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
}

function openGlobalSetup() {
  isSetupModalOpen.value = true
}

function openTemplateFromRequired() {
  isRequiredModalOpen.value = false
  isSetupModalOpen.value = true
}

async function saveSetup(payload) {
  if (isSavingSetup.value) return
  isSavingSetup.value = true
  const result = await budgetStore.saveGlobalSetup(payload)
  isSavingSetup.value = false
  notify(result.ok ? 'Шаблон бюджета сохранён' : result.message, result.ok ? 'success' : 'warning')
  if (result.ok) isSetupModalOpen.value = false
}

async function saveMonth(payload) {
  if (isSavingMonth.value) return
  isSavingMonth.value = true
  const result = await budgetStore.saveMonthPlan(payload)
  isSavingMonth.value = false
  notify(result.ok ? 'План месяца сохранён' : result.message, result.ok ? 'success' : 'warning')
  if (result.ok) isMonthModalOpen.value = false
}

async function saveActuals(entries) {
  if (isSavingActuals.value) return
  isSavingActuals.value = true
  const result = await budgetStore.saveActuals(entries)
  isSavingActuals.value = false
  notify(result.ok ? 'Фактические траты сохранены' : result.message, result.ok ? 'success' : 'warning')
  if (result.ok) isActualsModalOpen.value = false
}

async function togglePayment(payment) {
  const result = await budgetStore.togglePaymentPaid(payment.categoryId, payment.id)
  if (!result.ok) notify(result.message, 'warning')
}

function shortDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return '—'
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date)
}

function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function pluralize(value, words) {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return words[2]
  if (last === 1) return words[0]
  if (last >= 2 && last <= 4) return words[1]
  return words[2]
}

function parseMonth(month) {
  const [year, monthIndex] = String(month || '').split('-').map(Number)
  const date = new Date(year, monthIndex - 1, 1)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

watch(selectedMonth, async () => {
  if (isLoading.value || !isSetupComplete.value || isChangingMonth.value) return
  isChangingMonth.value = true
  const result = await budgetStore.ensureSelectedMonthFromTemplate()
  isChangingMonth.value = false
  if (!result.ok) notify(result.message, 'warning')
})

watch(calendarStore.events, (events) => {
  budgetStore.syncCalendarLinks()
  events
    .filter((event) => event.linkedEntityType === 'budget-payment')
    .forEach((event) => budgetStore.syncPaymentFromCalendar(event))
}, { immediate: true })

onMounted(async () => {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  if (!workspaceId) {
    isLoading.value = false
    return
  }
  const result = await budgetStore.loadWorkspace(workspaceId)
  isLoading.value = false
  if (result === null) {
    notify('Не удалось загрузить бюджет', 'warning')
    return
  }
  if (!isSetupComplete.value) isSetupModalOpen.value = true
  if (route.query.payment) isRequiredModalOpen.value = true
})
</script>

<style scoped>
.budget-page{display:grid;gap:12px;width:min(100%,1080px);margin:0 auto;padding-bottom:16px}.budget-toolbar{display:flex;align-items:end;justify-content:space-between;gap:14px;padding:2px}.budget-toolbar>div:first-child>span{color:var(--success);font-size:9px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.budget-toolbar h1{margin:3px 0 0;font-size:clamp(25px,3vw,34px);text-transform:capitalize}.budget-toolbar__actions{display:flex;align-items:center;gap:6px}.month-picker{display:grid;grid-template-columns:34px minmax(135px,1fr) 34px;align-items:center;gap:5px}.month-picker input{width:100%;height:34px;border:1px solid var(--border-color);border-radius:999px;padding:0 11px;color:var(--text-primary);background:var(--control-bg);outline:0}.budget-loading{display:grid;gap:10px;min-height:360px;padding:22px}.budget-loading span{border-radius:15px;background:var(--control-bg);animation:pulse 1.3s ease-in-out infinite}.budget-loading span:first-child{height:150px}.budget-loading span:not(:first-child){height:80px}.balance-panel{display:grid;grid-template-columns:minmax(260px,1.1fr) minmax(210px,.65fr) auto;align-items:center;gap:24px;padding:22px;background:radial-gradient(circle at 92% 0,color-mix(in srgb,var(--success) 15%,transparent),transparent 250px),var(--panel-bg)}.balance-panel__main{display:grid;gap:4px}.balance-label{color:var(--text-secondary);font-size:10px;font-weight:750}.balance-panel__main>strong{color:var(--success);font-size:clamp(30px,5vw,45px);line-height:1}.balance-panel__main>small{color:var(--text-muted);font-size:8px}.balance-progress{height:6px;margin-top:6px;border-radius:999px;background:var(--field-bg);overflow:hidden}.balance-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--success),#6ee7b7)}.balance-panel.negative{background:radial-gradient(circle at 92% 0,color-mix(in srgb,var(--danger) 14%,transparent),transparent 250px),var(--panel-bg)}.balance-panel.negative .balance-panel__main>strong{color:var(--danger)}.balance-panel.negative .balance-progress i{background:var(--danger)}.balance-panel__numbers{display:grid;grid-template-columns:1fr 1fr;gap:7px}.balance-panel__numbers article{display:grid;gap:2px;border-left:2px solid var(--border-color);padding-left:10px}.balance-panel__numbers span{color:var(--text-muted);font-size:8px;text-transform:uppercase}.balance-panel__numbers strong{font-size:14px}.balance-panel__actions{display:grid;gap:7px}.budget-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.simple-card{display:grid;grid-template-rows:auto auto minmax(92px,1fr) auto;gap:13px;min-height:310px;padding:16px}.simple-card>header{display:flex;align-items:center;justify-content:space-between;gap:8px}.simple-card>header>span:last-child{color:var(--text-muted);font-size:8px;font-weight:800;text-transform:uppercase}.simple-card__icon{display:grid!important;place-items:center;width:40px;height:40px;border-radius:13px;font-size:18px}.simple-card--required .simple-card__icon{color:var(--warning);background:color-mix(in srgb,var(--warning) 10%,var(--control-bg))}.simple-card--tracked .simple-card__icon{color:var(--info);background:color-mix(in srgb,var(--info) 10%,var(--control-bg))}.simple-card--fact .simple-card__icon{color:#a78bfa;background:color-mix(in srgb,#a78bfa 10%,var(--control-bg))}.auto-badge{display:flex!important;align-items:center;gap:4px;border-radius:999px;padding:5px 7px;color:var(--success)!important;background:color-mix(in srgb,var(--success) 8%,var(--control-bg));font-size:8px!important}.simple-card__value{display:grid;gap:2px}.simple-card__value small,.simple-card__value span{color:var(--text-muted);font-size:9px}.simple-card__value strong{font-size:23px}.next-payment{display:grid;grid-template-columns:auto minmax(0,1fr);align-content:center;gap:3px 8px;border:1px solid var(--border-color);border-radius:12px;padding:10px;background:var(--card-soft)}.next-payment>span{grid-row:1/3;align-self:center;border-radius:9px;padding:7px;color:var(--warning);background:color-mix(in srgb,var(--warning) 9%,var(--control-bg));font-size:9px;font-weight:850}.next-payment>strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.next-payment>b{font-size:10px}.category-preview{display:grid;align-content:center;gap:7px}.category-preview>div{display:grid;grid-template-columns:7px minmax(0,1fr) auto;align-items:center;gap:7px}.category-preview i{width:7px;height:7px;border-radius:50%}.category-preview span{overflow:hidden;color:var(--text-secondary);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.category-preview strong{font-size:10px}.fact-visual{display:grid;align-content:center;gap:8px}.fact-visual>div{height:8px;border-radius:999px;background:var(--field-bg);overflow:hidden}.fact-visual i{display:block;height:100%;border-radius:inherit;background:#a78bfa}.fact-visual i.over{background:var(--danger)}.fact-visual>span{color:var(--text-muted);font-size:9px}.fact-visual>span.over{color:var(--danger)}.simple-empty{display:grid;place-items:center;border:1px dashed var(--border-color);border-radius:12px;color:var(--text-muted);font-size:9px}.simple-card>:deep(.ui-button){width:100%}@keyframes pulse{50%{opacity:.45}}
@media(max-width:900px){.balance-panel{grid-template-columns:1fr 1fr}.balance-panel__actions{grid-column:1/-1;grid-template-columns:1fr 1fr}.budget-cards{grid-template-columns:1fr 1fr}.simple-card--fact{grid-column:1/-1;min-height:250px}}@media(max-width:620px){.budget-toolbar{display:grid}.budget-toolbar__actions{display:grid;grid-template-columns:1fr auto}.balance-panel{grid-template-columns:1fr;padding:17px}.balance-panel__actions{grid-column:auto}.budget-cards{grid-template-columns:1fr}.simple-card,.simple-card--fact{grid-column:auto;min-height:280px}.balance-panel__actions :deep(.ui-button){width:100%}}

.simple-card--required {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 100% 0, color-mix(in srgb, var(--warning) 11%, transparent), transparent 170px),
    var(--panel-bg);
}

.simple-card--required::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 2px;
  background: linear-gradient(transparent, var(--warning), transparent);
  content: '';
  opacity: .65;
}

.required-card__heading {
  display: flex;
  align-items: center;
  gap: 10px;
}

.required-card__heading > div {
  display: grid;
  gap: 2px;
}

.required-card__heading small {
  color: var(--text-muted);
  font-size: 8px;
}

.required-card__heading strong {
  font-size: 12px;
}

.required-card__total {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.required-card__total strong {
  font-size: 27px;
  letter-spacing: -.025em;
}

.required-card__total span {
  white-space: nowrap;
}

.next-payment {
  display: grid;
  grid-template-columns: 1fr;
  align-content: center;
  gap: 9px;
  border-color: color-mix(in srgb, var(--warning) 16%, var(--border-color));
  padding: 12px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--warning) 5%, var(--card-soft)), var(--card-soft));
}

.next-payment > small {
  color: var(--text-muted);
  font-size: 8px;
  font-weight: 750;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.next-payment__content {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
}

.next-payment__content > span {
  border-radius: 9px;
  padding: 7px 8px;
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 10%, var(--control-bg));
  font-size: 9px;
  font-weight: 850;
}

.next-payment__content > strong {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.next-payment__content > b {
  font-size: 10px;
  white-space: nowrap;
}

.simple-card--required :deep(.required-card__button) {
  justify-content: space-between;
  border-color: color-mix(in srgb, var(--warning) 18%, var(--border-color));
  padding-inline: 14px;
  background: color-mix(in srgb, var(--warning) 5%, var(--control-bg));
}

.simple-card--required :deep(.required-card__button .ui-button__icon) {
  order: 2;
  color: var(--warning);
}
</style>
