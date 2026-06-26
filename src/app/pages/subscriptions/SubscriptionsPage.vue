<template>
  <section class="subscriptions-page">
    <header class="subscriptions-hero panel">
      <div class="subscriptions-hero__copy">
        <span class="subscriptions-eyebrow">Подписки</span>
        <h1>Тарифы и лимиты пространства</h1>
        <p>
          На бесплатном плане остаются только дни рождения и идеи.
          Бюджет, учёт времени, спорт и фильмы открываются на платных тарифах.
        </p>
      </div>

      <div class="subscriptions-hero__badge">
        <UiIcon :name="currentPlan.icon" />
        <strong>{{ currentPlan.name }}</strong>
        <small>Текущий тариф</small>
      </div>
    </header>

    <section class="plans-grid">
      <article
        v-for="plan in plansWithState"
        :key="plan.id"
        class="plan-card"
        :class="{ 'plan-card--featured': plan.featured, 'plan-card--current': plan.current }"
      >
        <header class="plan-card__header">
          <span class="plan-card__icon">
            <UiIcon :name="plan.icon" />
          </span>
          <div>
            <small>{{ plan.eyebrow }}</small>
            <h2>{{ plan.name }}</h2>
          </div>
          <strong v-if="plan.badge" class="plan-card__badge">{{ plan.badge }}</strong>
        </header>

        <div class="plan-card__price">
          <strong>{{ plan.price }}</strong>
          <span>{{ plan.period }}</span>
        </div>

        <p>{{ plan.description }}</p>

        <ul class="plan-card__features">
          <li v-for="feature in plan.features" :key="feature">
            <UiIcon name="check" />
            <span>{{ feature }}</span>
          </li>
        </ul>

        <UiButton
          class="plan-card__button"
          :variant="plan.featured ? 'primary' : 'secondary'"
          :loading="savingPlan === plan.id"
          :disabled="plan.current || savingPlan !== ''"
          @click="selectPlan(plan.id)"
        >
          {{ plan.current ? 'Текущий план' : 'Выбрать план' }}
        </UiButton>
      </article>
    </section>

    <section class="comparison panel">
      <header class="comparison__header">
        <span>Сравнение</span>
        <h2>Что входит в каждый тариф</h2>
      </header>

      <div class="subscriptions-summary">
        <article>
          <small>Пространства</small>
          <strong>{{ currentPlan.workspaceLimit }}</strong>
          <span>доступно</span>
        </article>
        <article>
          <small>Бюджет</small>
          <strong>{{ featureBadge('budget') }}</strong>
          <span>раздел</span>
        </article>
        <article>
          <small>Учёт времени</small>
          <strong>{{ featureBadge('timeTracking') }}</strong>
          <span>раздел</span>
        </article>
        <article>
          <small>Спорт и фильмы</small>
          <strong>{{ extraFeaturesBadge }}</strong>
          <span>разделы</span>
        </article>
      </div>

      <div class="comparison-table">
        <div class="comparison-table__row comparison-table__row--head">
          <strong>Возможность</strong>
          <span>Free</span>
          <span>Plus</span>
          <span>Pro</span>
        </div>
        <div
          v-for="row in comparisonRows"
          :key="row.title"
          class="comparison-table__row"
        >
          <strong>{{ row.title }}</strong>
          <span v-for="value in row.values" :key="`${row.title}-${value}`">{{ value }}</span>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import { authStore } from '../../stores/auth.store.js'
import {
  getSubscriptionPlan,
  isSubscriptionFeatureEnabled,
  normalizeSubscriptionTier,
} from '../../utils/constants/subscriptionConstants.js'

const plans = [
  {
    id: 'free',
    name: 'Free',
    eyebrow: 'Старт',
    price: '$0',
    period: 'навсегда',
    description: 'Базовый план для личного пространства и быстрых заметок.',
    icon: 'calendar',
    badge: 'Сейчас',
    features: [
      'Календарь и события',
      'Дни рождения',
      'Идеи',
      '1 пространство',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    eyebrow: 'Для семьи',
    price: '$4.99',
    period: 'в месяц',
    description: 'Подходит, если нужно больше рабочих разделов и общих сценариев.',
    icon: 'star',
    featured: true,
    badge: 'Популярно',
    features: [
      'Бюджет',
      'Учёт времени',
      'Спорт',
      'Фильмы',
      'До 3 пространств',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    eyebrow: 'Максимум',
    price: '$9.99',
    period: 'в месяц',
    description: 'Для активного семейного или командного планирования без ограничений по разделам.',
    icon: 'wallet',
    badge: 'Скоро',
    features: [
      'Все возможности Plus',
      'До 10 пространств',
      'Полный набор premium-разделов',
      'Приоритетные сценарии',
    ],
  },
]

const comparisonRows = [
  { title: 'Пространства', values: ['1', '3', '10'] },
  { title: 'Бюджет', values: ['-', '✓', '✓'] },
  { title: 'Учёт времени', values: ['-', '✓', '✓'] },
  { title: 'Спорт', values: ['-', '✓', '✓'] },
  { title: 'Фильмы', values: ['-', '✓', '✓'] },
]

const savingPlan = ref('')
const currentTier = computed(() => normalizeSubscriptionTier(authStore.currentUser.value?.subscriptionTier))
const currentPlan = computed(() => getSubscriptionPlan(currentTier.value))
const plansWithState = computed(() => plans.map((plan) => ({
  ...plan,
  current: plan.id === currentTier.value,
})))

const extraFeaturesBadge = computed(() => (
  isSubscriptionFeatureEnabled(currentTier.value, 'sport') && isSubscriptionFeatureEnabled(currentTier.value, 'movies')
    ? 'Есть'
    : 'Нет'
))

async function selectPlan(planId) {
  if (savingPlan.value) return
  if (normalizeSubscriptionTier(planId) === currentTier.value) return

  savingPlan.value = planId
  try {
    await authStore.updateCurrentUser({ subscriptionTier: planId })
  } finally {
    savingPlan.value = ''
  }
}

function featureBadge(feature) {
  return isSubscriptionFeatureEnabled(currentTier.value, feature) ? 'Есть' : 'Нет'
}
</script>

<style scoped>
.subscriptions-page {
  display: grid;
  gap: 14px;
  width: min(100%, 1120px);
  margin: 0 auto;
}

.subscriptions-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 190px;
  align-items: end;
  gap: 18px;
  padding: 22px;
  border-color: color-mix(in srgb, var(--accent) 18%, var(--border-color));
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 7%, var(--panel-bg)), var(--panel-bg));
}

.subscriptions-eyebrow,
.comparison__header span,
.plan-card small,
.subscriptions-summary small {
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.subscriptions-hero h1 {
  margin: 4px 0 7px;
  font-size: clamp(24px, 3vw, 34px);
}

.subscriptions-hero p {
  max-width: 700px;
  margin: 0;
  color: var(--text-secondary);
}

.subscriptions-hero__badge {
  display: grid;
  justify-items: end;
  gap: 4px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 13px;
  background: var(--card-soft);
  text-align: right;
}

.subscriptions-hero__badge svg {
  color: var(--accent);
  font-size: 21px;
}

.subscriptions-hero__badge strong {
  font-size: 20px;
}

.subscriptions-hero__badge small {
  color: var(--text-muted);
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.plan-card {
  display: grid;
  align-content: start;
  gap: 15px;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  background: var(--card-solid);
  box-shadow: var(--shadow-sm);
}

.plan-card--featured {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border-color));
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, var(--card-solid)), var(--card-solid));
}

.plan-card--current {
  outline: 2px solid color-mix(in srgb, var(--accent) 24%, transparent);
  outline-offset: 0;
}

.plan-card__header {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.plan-card__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--control-bg));
  font-size: 20px;
}

.plan-card h2 {
  margin: 2px 0 0;
}

.plan-card__badge {
  border-radius: var(--radius-pill);
  padding: 5px 8px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 9%, var(--control-bg));
  font-size: 9px;
}

.plan-card__price {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.plan-card__price strong {
  font-size: 34px;
  letter-spacing: 0;
}

.plan-card__price span,
.plan-card p {
  color: var(--text-secondary);
}

.plan-card p {
  min-height: 48px;
  margin: 0;
  line-height: 1.45;
}

.plan-card__features {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.plan-card__features li {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: start;
  gap: 7px;
  color: var(--text-secondary);
}

.plan-card__features li svg {
  margin-top: 1px;
  color: var(--success);
}

.plan-card__button {
  width: 100%;
  margin-top: 6px;
}

.comparison {
  display: grid;
  gap: 13px;
  padding: 18px;
}

.comparison__header h2 {
  margin: 3px 0 0;
}

.subscriptions-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.subscriptions-summary article {
  display: grid;
  gap: 4px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px 13px;
  background: var(--card-soft);
}

.subscriptions-summary strong {
  font-size: 22px;
}

.subscriptions-summary span {
  color: var(--text-secondary);
  font-size: 11px;
}

.comparison-table {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-soft);
}

.comparison-table__row {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) repeat(3, minmax(90px, 1fr));
  min-width: 680px;
}

.comparison-table__row + .comparison-table__row {
  border-top: 1px solid var(--border-color);
}

.comparison-table__row > * {
  padding: 11px 13px;
}

.comparison-table__row > span {
  border-left: 1px solid var(--border-color);
  color: var(--text-secondary);
  text-align: center;
}

.comparison-table__row--head {
  background: var(--control-bg);
}

.comparison-table__row--head span,
.comparison-table__row--head strong {
  color: var(--text-primary);
  font-weight: 850;
}

@media (max-width: 980px) {
  .plans-grid,
  .subscriptions-summary {
    grid-template-columns: 1fr;
  }

  .subscriptions-hero {
    grid-template-columns: 1fr;
  }

  .subscriptions-hero__badge {
    justify-items: start;
    text-align: left;
  }

  .comparison {
    overflow-x: auto;
  }
}
</style>
