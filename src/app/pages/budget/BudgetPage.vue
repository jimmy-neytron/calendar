<template>
  <section class="budget-page">
    <header class="budget-hero panel">
      <div>
        <span>Финансовый план</span>
        <h1>Бюджет без таблиц и тревоги</h1>
        <p>Распредели ближайший доход по своим разделам и сразу увидь свободный остаток.</p>
      </div>
      <div class="budget-hero__balance" :class="{ 'budget-hero__balance--negative': remainingAmount < 0 }">
        <small>{{ remainingAmount < 0 ? 'Перерасход плана' : 'Останется свободно' }}</small>
        <strong>{{ formatMoney(Math.abs(remainingAmount)) }}</strong>
      </div>
    </header>

    <section class="budget-setup panel">
      <div class="budget-setup__field">
        <span>Месяц бюджета</span>
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
      </div>

      <UiInput
        :model-value="budget.income"
        type="number"
        :label="`Доход на ${selectedMonthLabel}`"
        placeholder="Например, 75 000"
        @update:model-value="setIncome"
      />
    </section>

    <section class="budget-summary">
      <article class="budget-stat panel">
        <span>Доход</span>
        <strong>{{ formatMoney(budget.income) }}</strong>
        <small>{{ selectedMonthLabel }}</small>
      </article>
      <article class="budget-stat panel">
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

    <section class="budget-plan panel">
      <header class="budget-plan__header">
        <div>
          <span>Разделы бюджета</span>
          <h2>Куда пойдут деньги</h2>
          <p>Добавляй любые свои статьи: квартира, продукты, накопления, отпуск или что угодно ещё.</p>
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
            <span class="budget-category__number">{{ index + 1 }}</span>
            <input
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
            <UiButton size="sm" variant="secondary" icon="calendar" @click="openPaymentPlanner(category)">
              Платёж
            </UiButton>
            <UiIconButton
              icon="trash"
              label="Удалить раздел"
              size="sm"
              variant="danger"
              @click="removeCategory(category)"
            />
          </div>

          <div v-if="category.payments?.length" class="budget-payments">
            <article
              v-for="payment in category.payments"
              :key="payment.id"
              class="budget-payment"
              :class="{ 'budget-payment--paid': payment.paid }"
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
                  {{ formatDate(payment.date) }} · {{ formatMoney(payment.amount) }}
                </small>
              </div>
              <span>{{ payment.paid ? 'Оплачено' : 'В календаре' }}</span>
              <UiIconButton
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
      <span>Бюджет + календарь</span>
      Платежи создаются как события календаря и удаляются вместе с записью бюджета.
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
        <p>В календаре появится разовое событие в 09:00. Для следующего месяца платёж планируется заново.</p>
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
import UiButton from '../../components/ui/UiButton.vue'
import UiIconButton from '../../components/ui/UiIconButton.vue'
import UiInput from '../../components/ui/UiInput.vue'
import UiModal from '../../components/ui/UiModal.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import { useNotification } from '../../composables/ui/useNotification.js'
import { budgetStore } from '../../stores/budget.store.js'
import { DateHelper } from '../../utils/date/dateHelper.js'

const suggestions = ['Жильё', 'Продукты', 'Транспорт', 'Накопления']
const { notify } = useNotification()
const budget = budgetStore.currentBudget
const selectedMonth = budgetStore.selectedMonth
const plannedTotal = budgetStore.plannedTotal
const remainingAmount = budgetStore.remainingAmount
const allocatedPercent = budgetStore.allocatedPercent
const categoryForm = reactive({ name: '', amount: '' })
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

function setIncome(value) {
  budgetStore.updateSettings({ income: value })
}

function createCategory() {
  const result = budgetStore.addCategory(categoryForm.name, categoryForm.amount)
  if (!result.ok) return notify(result.message, 'warning')
  categoryForm.name = ''
  categoryForm.amount = ''
}

function addSuggestion(name) {
  budgetStore.addCategory(name)
}

function updateCategoryName(id, name) {
  const title = String(name || '').trim()
  if (!title) return
  budgetStore.updateCategory(id, { name: title })
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

function pluralize(value, words) {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return words[2]
  if (last === 1) return words[0]
  if (last >= 2 && last <= 4) return words[1]
  return words[2]
}

onMounted(() => budgetStore.disableRecurringPayments())
watch(selectedMonth, () => budgetStore.disableRecurringPayments())
</script>

<style scoped>
.budget-page{display:grid;gap:12px;width:min(100%,1100px);margin:0 auto}.budget-hero{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:24px;background:radial-gradient(circle at 90% 10%,color-mix(in srgb,var(--success) 14%,transparent),transparent 260px),var(--panel-bg)}.budget-hero>div:first-child>span,.budget-plan__header>div>span{color:var(--success);font-size:9px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.budget-hero h1{margin:5px 0 7px}.budget-hero p,.budget-plan__header p{max-width:650px;margin:0;color:var(--text-secondary)}.budget-hero__balance{min-width:220px;border:1px solid color-mix(in srgb,var(--success) 30%,var(--border-color));border-radius:16px;padding:15px;background:color-mix(in srgb,var(--success) 8%,var(--control-bg));text-align:right}.budget-hero__balance small,.budget-hero__balance strong{display:block}.budget-hero__balance small{color:var(--text-muted);font-size:9px;text-transform:uppercase}.budget-hero__balance strong{margin-top:4px;color:var(--success);font-size:25px}.budget-hero__balance--negative{border-color:color-mix(in srgb,var(--danger) 35%,var(--border-color));background:color-mix(in srgb,var(--danger) 7%,var(--control-bg))}.budget-hero__balance--negative strong{color:var(--danger)}
.budget-setup{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(240px,.7fr);align-items:end;gap:18px;padding:16px}.budget-setup__field{display:grid;gap:6px}.budget-setup__field>span{color:var(--text-secondary);font-size:11px;font-weight:700}.budget-month-picker{display:grid;grid-template-columns:34px minmax(0,1fr) 34px;align-items:center;gap:6px}.budget-month-picker input{width:100%;min-height:36px;border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0 11px;color:var(--text-primary);background:var(--field-bg);outline:0}.budget-month-picker input:focus{border-color:var(--accent-border);box-shadow:0 0 0 2px var(--accent-soft)}
.budget-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.budget-stat{display:grid;gap:3px;padding:15px}.budget-stat span{color:var(--text-muted);font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.budget-stat strong{font-size:22px}.budget-stat small{color:var(--text-muted)}.budget-stat--danger{border-color:color-mix(in srgb,var(--danger) 32%,var(--border-color))}.budget-stat--danger strong{color:var(--danger)}
.budget-plan{display:grid;gap:16px;padding:19px}.budget-plan__header{display:grid;grid-template-columns:minmax(0,1fr) 220px;align-items:end;gap:18px}.budget-plan__header h2{margin:3px 0 5px}.budget-progress{height:9px;border-radius:var(--radius-pill);background:var(--control-bg);overflow:hidden}.budget-progress span{display:block;height:100%;border-radius:inherit;background:var(--success);transition:width .24s var(--ease-out)}.budget-progress--over span{background:var(--danger)}
.budget-category-create{display:grid;grid-template-columns:minmax(200px,1fr) minmax(160px,.5fr) auto;align-items:end;gap:8px;border-top:1px solid var(--border-color);padding-top:15px}.budget-categories{display:grid;gap:8px}.budget-category-card{border:1px solid var(--border-color);border-radius:13px;background:var(--control-bg);overflow:hidden}.budget-category{display:grid;grid-template-columns:30px minmax(140px,1fr) 150px 80px auto 28px;align-items:center;gap:9px;padding:8px 10px}.budget-category__number{display:grid;place-items:center;width:26px;height:26px;border-radius:8px;color:var(--text-muted);background:var(--field-bg-focus);font-size:10px;font-weight:800}.budget-category__name,.budget-category__amount input{min-width:0;border:0;color:var(--text-primary);background:transparent;outline:0}.budget-category__name{font-weight:750}.budget-category__amount{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;border:1px solid var(--border-color);border-radius:9px;padding:0 9px;background:var(--field-bg)}.budget-category__amount input{width:100%;min-height:32px;text-align:right}.budget-category__amount span{color:var(--text-muted)}.budget-category>small{color:var(--text-muted);text-align:right}.budget-payments{display:grid;gap:1px;border-top:1px solid var(--border-color);background:var(--border-color)}.budget-payment{display:grid;grid-template-columns:24px minmax(0,1fr) auto 28px;align-items:center;gap:9px;padding:8px 10px;background:var(--card-soft)}.budget-payment__check{display:grid;place-items:center;width:22px;height:22px;border:1px solid var(--border-strong);border-radius:7px;color:var(--text-inverse);background:var(--control-bg);font-size:11px;font-weight:900}.budget-payment>div{min-width:0}.budget-payment strong,.budget-payment small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.budget-payment small{margin-top:2px;color:var(--text-muted);font-size:9px}.budget-payment>span{border-radius:var(--radius-pill);padding:4px 7px;color:var(--info);background:color-mix(in srgb,var(--info) 8%,var(--control-bg));font-size:8px;font-weight:800}.budget-payment--paid{opacity:.62}.budget-payment--paid .budget-payment__check{border-color:var(--success);background:var(--success)}.budget-payment--paid strong{text-decoration:line-through}.budget-payment--paid>span{color:var(--success);background:color-mix(in srgb,var(--success) 8%,var(--control-bg))}.budget-empty{display:grid;place-items:center;gap:5px;min-height:230px;border:1px dashed var(--border-color);border-radius:15px;color:var(--text-muted);text-align:center}.budget-empty>span{display:grid;place-items:center;width:44px;height:44px;border-radius:13px;color:var(--success);background:color-mix(in srgb,var(--success) 9%,var(--control-bg));font-size:20px;font-weight:900}.budget-empty p{margin:0}.budget-empty div{display:flex;flex-wrap:wrap;justify-content:center;gap:5px;margin-top:7px}.budget-empty button{border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:5px 9px;color:var(--text-secondary);background:var(--control-bg);font-size:9px}.budget-note{display:flex;align-items:center;gap:8px;padding:3px 4px;color:var(--text-muted);font-size:9px}.budget-note span{border-radius:var(--radius-pill);padding:3px 6px;color:var(--info);background:color-mix(in srgb,var(--info) 8%,var(--control-bg));font-weight:800}.payment-planner{display:grid;gap:13px}.payment-planner__category{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--border-color);border-radius:11px;padding:9px 11px;background:var(--control-bg)}.payment-planner__category span,.payment-planner label>span{color:var(--text-muted);font-size:10px;font-weight:700}.payment-planner__grid{display:grid;grid-template-columns:1fr;gap:8px}.payment-planner label{display:grid;gap:5px}.payment-planner__date input{width:100%;min-height:36px;border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0 11px;color:var(--text-primary);background:var(--field-bg);outline:0}.payment-planner__date input:focus{border-color:var(--accent-border);box-shadow:0 0 0 2px var(--accent-soft)}.payment-planner p{margin:0;color:var(--text-muted);font-size:9px;line-height:1.5}.payment-planner footer{display:flex;justify-content:flex-end;gap:7px;margin-top:4px}
@media(max-width:800px){.budget-hero,.budget-setup,.budget-plan__header{grid-template-columns:1fr;display:grid}.budget-hero__balance{min-width:0;text-align:left}.budget-summary{grid-template-columns:1fr}.budget-category{grid-template-columns:30px minmax(0,1fr) 130px auto 28px}.budget-category>small{display:none}}@media(max-width:560px){.budget-page{padding:0}.budget-category-create,.payment-planner__grid{grid-template-columns:1fr}.budget-category{grid-template-columns:26px minmax(0,1fr) 28px}.budget-category__amount{grid-column:2/3}.budget-category>:deep(.ui-button){grid-column:2}.budget-category>button{grid-column:3;grid-row:1}.budget-payment{grid-template-columns:24px minmax(0,1fr) 28px}.budget-payment>span{display:none}.budget-note{align-items:flex-start}}
</style>
