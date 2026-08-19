<template>
  <section class="rewards-page">
    <button class="rewards-back" type="button" @click="router.push({ name: 'challenges' })">← К челленджам</button>

    <UiPageHeader title="Награды" eyebrow="Достижения" description="Единая коллекция за регулярность, серии и завершённые цели.">
      <template #actions>
        <div class="collection-status">
          <div><span>Получено</span><strong>{{ unlockedCount }} / {{ rewards.length }}</strong></div>
          <div class="collection-status__track"><i :style="{ width: `${collectionProgress}%` }" /></div>
          <small>{{ collectionProgress }}% коллекции</small>
        </div>
      </template>
    </UiPageHeader>

    <nav class="rewards-filters" aria-label="Фильтр наград">
      <button
        v-for="item in filters"
        :key="item.value"
        type="button"
        :class="{ active: filter === item.value }"
        @click="filter = item.value"
      >
        {{ item.label }} <span>{{ item.count }}</span>
      </button>
    </nav>

    <div v-if="filteredRewards.length" class="rewards-grid">
      <article
        v-for="(reward, index) in filteredRewards"
        :key="reward.id"
        :class="['reward-card', `reward-card--${reward.tone}`, { unlocked: reward.unlocked }]"
      >
        <header>
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <small>{{ reward.rarity }}</small>
        </header>

        <div class="reward-card__copy">
          <span>{{ reward.category }}</span>
          <h2>{{ reward.title }}</h2>
          <p>{{ reward.description }}</p>
        </div>

        <footer>
          <div>
            <span>{{ reward.requirement }}</span>
            <strong>{{ reward.unlocked ? 'Получена' : reward.remainingLabel }}</strong>
          </div>
          <div class="reward-card__track"><i :style="{ width: `${reward.progress}%` }" /></div>
        </footer>
      </article>
    </div>

    <div v-else class="rewards-empty">
      <h2>В этом списке пока ничего нет</h2>
      <p>Выбери другой фильтр или продолжай выполнять челленджи.</p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import UiPageHeader from '../../components/ui/UiPageHeader.vue'
import { challengeStore } from '../../stores/challenge.store.js'
import { buildRewardsCollection } from '../../utils/challenges/challengeRewards.js'

const router = useRouter()
const filter = ref('all')
const rewards = computed(() => buildRewardsCollection(challengeStore.challenges.value))
const unlockedCount = computed(() => rewards.value.filter((reward) => reward.unlocked).length)
const collectionProgress = computed(() => rewards.value.length ? Math.round(unlockedCount.value / rewards.value.length * 100) : 0)
const filters = computed(() => [
  { value: 'all', label: 'Все', count: rewards.value.length },
  { value: 'unlocked', label: 'Полученные', count: unlockedCount.value },
  { value: 'locked', label: 'В процессе', count: rewards.value.length - unlockedCount.value },
])
const filteredRewards = computed(() => filter.value === 'all'
  ? rewards.value
  : rewards.value.filter((reward) => reward.unlocked === (filter.value === 'unlocked')))
</script>

<style scoped>
.rewards-page {
  display: grid;
  gap: 22px;
  padding: 24px;
}

.rewards-back {
  width: max-content;
  border: 0;
  padding: 0;
  color: var(--text-muted);
  background: transparent;
  font-size: 11px;
}

.rewards-back:hover {
  color: var(--text-primary);
}

.rewards-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 300px);
  align-items: end;
  gap: 48px;
  padding: 0 2px 24px;
  border-bottom: 1px solid var(--border-color);
}

.rewards-heading > div:first-child > span {
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .09em;
  text-transform: uppercase;
}

.rewards-heading h1 {
  margin: 5px 0 7px;
  font-size: clamp(32px, 5vw, 52px);
  font-weight: 700;
  letter-spacing: -.045em;
  line-height: .95;
}

.rewards-heading p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.collection-status {
  display: grid;
  gap: 8px;
}

.collection-status > div:first-child {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.collection-status span,
.collection-status small {
  color: var(--text-muted);
  font-size: 9px;
  text-transform: uppercase;
}

.collection-status strong {
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}

.collection-status__track,
.reward-card__track {
  height: 3px;
  overflow: hidden;
  background: var(--border-color);
}

.collection-status__track i,
.reward-card__track i {
  display: block;
  height: 100%;
  background: var(--accent);
}

.rewards-filters {
  display: flex;
  gap: 20px;
  border-bottom: 1px solid var(--border-color);
}

.rewards-filters button {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 0 0 10px;
  color: var(--text-muted);
  background: transparent;
  font-size: 11px;
}

.rewards-filters button:hover,
.rewards-filters button.active {
  color: var(--text-primary);
}

.rewards-filters button.active {
  border-bottom-color: var(--text-primary);
}

.rewards-filters button span {
  color: var(--text-muted);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--border-color);
  border-left: 1px solid var(--border-color);
}

.reward-card {
  --reward-color: var(--text-muted);
  min-height: 250px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 30px;
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  padding: 18px;
  background: var(--card-solid);
  opacity: .58;
}

.reward-card.unlocked {
  opacity: 1;
}

.reward-card--bronze { --reward-color: #a76f48; }
.reward-card--silver { --reward-color: #7b8796; }
.reward-card--gold { --reward-color: #b58a2c; }
.reward-card--violet { --reward-color: #7666a8; }
.reward-card--final { --reward-color: #9f5268; }

.reward-card > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reward-card > header > span {
  color: var(--reward-color);
  font-size: 20px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.reward-card > header small {
  color: var(--text-muted);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
}

.reward-card__copy {
  align-self: end;
}

.reward-card__copy > span {
  color: var(--reward-color);
  font-size: 9px;
  font-weight: 650;
}

.reward-card h2 {
  margin: 5px 0 7px;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -.015em;
}

.reward-card p {
  max-width: 32ch;
  margin: 0;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.55;
}

.reward-card footer {
  display: grid;
  gap: 8px;
  padding-top: 13px;
  border-top: 1px solid var(--border-color);
}

.reward-card footer > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--text-muted);
  font-size: 9px;
}

.reward-card footer strong {
  color: var(--text-secondary);
  font-weight: 600;
}

.reward-card.unlocked footer strong {
  color: var(--reward-color);
}

.reward-card__track i {
  background: var(--reward-color);
}

.rewards-empty {
  min-height: 280px;
  display: grid;
  place-content: center;
  text-align: center;
}

.rewards-empty h2,
.rewards-empty p {
  margin: 0;
}

.rewards-empty p {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 11px;
}

@media (max-width: 920px) {
  .rewards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .rewards-page {
    gap: 18px;
    padding: 14px;
  }

  .rewards-heading {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .rewards-filters {
    overflow-x: auto;
  }

  .rewards-filters button {
    white-space: nowrap;
  }

  .rewards-grid {
    grid-template-columns: 1fr;
  }

  .reward-card {
    min-height: 225px;
  }
}
</style>
