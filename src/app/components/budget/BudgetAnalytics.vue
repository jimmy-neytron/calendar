<template>
  <section class="budget-analytics panel" aria-labelledby="budget-analytics-title">
    <header class="budget-analytics__header">
      <div>
        <span>Аналитика месяца</span>
        <h2 id="budget-analytics-title">Как распределён бюджет</h2>
      </div>
      <span class="budget-analytics__status" :class="statusClass">{{ statusText }}</span>
    </header>

    <div v-if="hasData" class="budget-analytics__content">
      <div class="budget-analytics__overview">
        <div
          class="budget-analytics__ring"
          :style="{ '--progress': `${safeAllocatedPercent * 3.6}deg` }"
          role="img"
          :aria-label="`Распределено ${safeAllocatedPercent}% дохода`"
        >
          <div>
            <strong>{{ safeAllocatedPercent }}%</strong>
            <span>распределено</span>
          </div>
        </div>

        <div class="budget-analytics__metrics">
          <article>
            <span class="budget-analytics__dot budget-analytics__dot--required" />
            <div>
              <small>Обязательные расходы</small>
              <strong>{{ formatMoney(requiredTotal) }}</strong>
            </div>
            <b>{{ requiredShare }}%</b>
          </article>
          <article>
            <span class="budget-analytics__dot budget-analytics__dot--flexible" />
            <div>
              <small>Другие расходы</small>
              <strong>{{ formatMoney(flexibleTotal) }}</strong>
            </div>
            <b>{{ flexibleShare }}%</b>
          </article>
          <article>
            <span class="budget-analytics__dot budget-analytics__dot--paid" />
            <div>
              <small>Уже оплачено</small>
              <strong>{{ formatMoney(paidTotal) }}</strong>
            </div>
            <b>{{ paidProgress }}%</b>
          </article>
        </div>
      </div>

      <div class="budget-analytics__categories">
        <div class="budget-analytics__categories-title">
          <strong>Распределение по разделам</strong>
          <small>от общего плана</small>
        </div>

        <div class="budget-analytics__bars">
          <article v-for="category in rankedCategories" :key="category.id">
            <div>
              <span class="budget-analytics__category-name">
                <i :style="{ background: category.color || '#60a5fa' }" />
                {{ category.name }}
              </span>
              <strong>{{ formatMoney(category.amount) }}</strong>
            </div>
            <div class="budget-analytics__bar">
              <span
                :style="{
                  width: `${category.share}%`,
                  background: category.color || '#60a5fa',
                }"
              />
            </div>
            <small>{{ category.share }}% плана</small>
          </article>
        </div>

        <p v-if="hiddenCategoriesCount" class="budget-analytics__more">
          Ещё {{ hiddenCategoriesCount }} {{ categoryWord }}
        </p>
      </div>
    </div>

    <div v-else class="budget-analytics__empty">
      <span>↗</span>
      <div>
        <strong>Аналитика появится после планирования</strong>
        <p>Укажи доход и добавь хотя бы один раздел бюджета.</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  income: { type: Number, default: 0 },
  plannedTotal: { type: Number, default: 0 },
  requiredTotal: { type: Number, default: 0 },
  allocatedPercent: { type: Number, default: 0 },
  categories: { type: Array, default: () => [] },
})

const safeIncome = computed(() => Math.max(0, Number(props.income || 0)))
const safePlannedTotal = computed(() => Math.max(0, Number(props.plannedTotal || 0)))
const safeAllocatedPercent = computed(() => Math.max(0, Math.min(100, Number(props.allocatedPercent || 0))))
const flexibleTotal = computed(() => Math.max(0, safePlannedTotal.value - Number(props.requiredTotal || 0)))
const paidTotal = computed(() => props.categories.reduce((total, category) => (
  total + (category.payments || [])
    .filter((payment) => payment.paid)
    .reduce((sum, payment) => sum + Number(payment.actualAmount ?? payment.amount ?? 0), 0)
), 0))
const requiredShare = computed(() => percentOf(props.requiredTotal, safeIncome.value))
const flexibleShare = computed(() => percentOf(flexibleTotal.value, safeIncome.value))
const paidProgress = computed(() => percentOf(paidTotal.value, safePlannedTotal.value))
const hasData = computed(() => safeIncome.value > 0 || safePlannedTotal.value > 0)
const statusClass = computed(() => ({
  'is-empty': !safeIncome.value,
  'is-good': safeIncome.value > 0 && safePlannedTotal.value <= safeIncome.value,
  'is-over': safePlannedTotal.value > safeIncome.value,
}))
const statusText = computed(() => {
  if (!safeIncome.value) return 'Укажи доход'
  if (safePlannedTotal.value > safeIncome.value) {
    return `Перерасход ${formatMoney(safePlannedTotal.value - safeIncome.value)}`
  }
  if (safeAllocatedPercent.value < 70) return 'Есть запас'
  if (safeAllocatedPercent.value < 95) return 'Хороший баланс'
  return 'Почти всё распределено'
})
const rankedCategories = computed(() => props.categories
  .map((category) => ({
    ...category,
    amount: Math.max(0, Number(category.amount || 0)),
    share: percentOf(category.amount, safePlannedTotal.value),
  }))
  .filter((category) => category.amount > 0)
  .sort((first, second) => second.amount - first.amount)
  .slice(0, 5))
const hiddenCategoriesCount = computed(() => Math.max(
  0,
  props.categories.filter((category) => Number(category.amount || 0) > 0).length - rankedCategories.value.length
))
const categoryWord = computed(() => pluralize(hiddenCategoriesCount.value, ['раздел', 'раздела', 'разделов']))

function percentOf(value, total) {
  return total ? Math.max(0, Math.round((Number(value || 0) / total) * 100)) : 0
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
</script>

<style scoped>
.budget-analytics {
  display: grid;
  gap: 16px;
  padding: 18px;
  animation: analytics-enter .35s var(--ease-out) both;
}

.budget-analytics__header,
.budget-analytics__categories-title,
.budget-analytics__bars article > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.budget-analytics__header > div > span {
  color: var(--info);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.budget-analytics__header h2 {
  margin: 3px 0 0;
}

.budget-analytics__status {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 6px 10px;
  color: var(--text-secondary);
  background: var(--field-bg);
  font-size: 9px;
  font-weight: 800;
  white-space: nowrap;
}

.budget-analytics__status.is-good {
  border-color: color-mix(in srgb, var(--success) 28%, var(--border-color));
  color: var(--success);
  background: color-mix(in srgb, var(--success) 8%, var(--field-bg));
}

.budget-analytics__status.is-over {
  border-color: color-mix(in srgb, var(--danger) 32%, var(--border-color));
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 8%, var(--field-bg));
}

.budget-analytics__content {
  display: grid;
  grid-template-columns: minmax(300px, .85fr) minmax(360px, 1.15fr);
  gap: 14px;
}

.budget-analytics__overview,
.budget-analytics__categories {
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--control-bg);
}

.budget-analytics__overview {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  padding: 16px;
}

.budget-analytics__ring {
  display: grid;
  place-items: center;
  width: 124px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: conic-gradient(var(--success) var(--progress), var(--field-bg-focus) 0);
  transition: background .25s var(--ease-out);
}

.budget-analytics__ring::before {
  grid-area: 1 / 1;
  width: 94px;
  aspect-ratio: 1;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  background: var(--panel-bg);
  content: '';
}

.budget-analytics__ring > div {
  z-index: 1;
  grid-area: 1 / 1;
  display: grid;
  text-align: center;
}

.budget-analytics__ring strong {
  font-size: 23px;
  line-height: 1;
}

.budget-analytics__ring span {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 8px;
}

.budget-analytics__metrics {
  display: grid;
}

.budget-analytics__metrics article {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid var(--border-color);
}

.budget-analytics__metrics article:last-child {
  border-bottom: 0;
}

.budget-analytics__metrics small,
.budget-analytics__metrics strong {
  display: block;
}

.budget-analytics__metrics small {
  color: var(--text-muted);
  font-size: 8px;
}

.budget-analytics__metrics strong {
  margin-top: 2px;
  font-size: 11px;
}

.budget-analytics__metrics b {
  color: var(--text-secondary);
  font-size: 10px;
}

.budget-analytics__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.budget-analytics__dot--required { background: var(--info); }
.budget-analytics__dot--flexible { background: var(--accent); }
.budget-analytics__dot--paid { background: var(--success); }

.budget-analytics__categories {
  display: grid;
  gap: 13px;
  padding: 15px;
}

.budget-analytics__categories-title strong {
  font-size: 11px;
}

.budget-analytics__categories-title small,
.budget-analytics__bars article > small,
.budget-analytics__more {
  color: var(--text-muted);
  font-size: 8px;
}

.budget-analytics__bars {
  display: grid;
  gap: 11px;
}

.budget-analytics__bars article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 62px;
  gap: 5px 10px;
}

.budget-analytics__bars article > div:first-child {
  grid-column: 1 / -1;
}

.budget-analytics__bars article strong {
  font-size: 10px;
}

.budget-analytics__category-name {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  overflow: hidden;
  font-size: 10px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.budget-analytics__category-name i {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.budget-analytics__bar {
  height: 6px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--field-bg-focus);
}

.budget-analytics__bar span {
  display: block;
  min-width: 3px;
  height: 100%;
  border-radius: inherit;
  transition: width .35s var(--ease-out);
}

.budget-analytics__bars article > small {
  text-align: right;
}

.budget-analytics__more {
  margin: 0;
  text-align: right;
}

.budget-analytics__empty {
  display: flex;
  min-height: 110px;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px dashed var(--border-color);
  border-radius: 14px;
  color: var(--text-secondary);
  background: var(--control-bg);
}

.budget-analytics__empty > span {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: var(--info);
  background: color-mix(in srgb, var(--info) 9%, var(--field-bg));
}

.budget-analytics__empty p {
  margin: 3px 0 0;
  color: var(--text-muted);
  font-size: 9px;
}

@keyframes analytics-enter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

@media (min-width: 821px) and (max-width: 1180px) {
  .budget-analytics {
    gap: 9px;
    padding: 12px;
  }

  .budget-analytics__header h2 {
    margin-top: 1px;
    font-size: 16px;
  }

  .budget-analytics__status {
    padding: 4px 8px;
    font-size: 8px;
  }

  .budget-analytics__content {
    grid-template-columns: minmax(280px, .8fr) minmax(330px, 1.2fr);
    gap: 8px;
  }

  .budget-analytics__overview {
    grid-template-columns: 94px minmax(0, 1fr);
    gap: 10px;
    padding: 10px;
  }

  .budget-analytics__ring {
    width: 88px;
  }

  .budget-analytics__ring::before {
    width: 66px;
  }

  .budget-analytics__ring strong {
    font-size: 18px;
  }

  .budget-analytics__metrics article {
    gap: 6px;
    padding: 5px 0;
  }

  .budget-analytics__categories {
    gap: 8px;
    padding: 10px;
  }

  .budget-analytics__bars {
    gap: 6px;
  }

  .budget-analytics__bars article {
    gap-block: 3px;
  }

  .budget-analytics__bar {
    height: 4px;
  }
}

@media (max-width: 820px) {
  .budget-analytics__content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .budget-analytics {
    padding: 14px;
  }

  .budget-analytics__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .budget-analytics__overview {
    grid-template-columns: 1fr;
  }

  .budget-analytics__ring {
    margin: 0 auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .budget-analytics,
  .budget-analytics__bar span {
    animation-duration: .01ms;
    transition-duration: .01ms;
  }
}
</style>
