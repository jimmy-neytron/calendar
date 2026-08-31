<template>
  <article class="today-card panel">
    <header>
      <span class="today-card__icon"><UiIcon :name="icon" /></span>
      <div>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
      <strong v-if="countLabel">{{ countLabel }}</strong>
    </header>

    <div v-if="items.length" class="today-card__items">
      <div v-for="item in items" :key="item.id" class="today-card__item">
        <span :class="{ 'today-card__dot--done': item.done }" />
        <div>
          <b>{{ item.label }}</b>
          <small v-if="item.meta">{{ item.meta }}</small>
        </div>
      </div>
    </div>
    <p v-else class="today-card__empty">{{ emptyLabel }}</p>

    <RouterLink :to="{ name: routeName }">
      Открыть раздел
      <UiIcon name="right" />
    </RouterLink>
  </article>
</template>

<script setup lang="ts">
import UiIcon from '../../../components/ui/UiIcon.vue'
import type { TodayCardItem } from '../composables/useTodaySections'

defineProps<{
  title: string
  description: string
  icon: string
  routeName: string
  countLabel: string
  emptyLabel: string
  items: TodayCardItem[]
}>()
</script>

<style scoped>
.today-card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 16px;
  min-height: 250px;
  padding: 16px;
}

.today-card > header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
}

.today-card__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--control-bg));
  font-size: 19px;
}

.today-card h2,
.today-card p {
  margin: 0;
}

.today-card h2 {
  font-size: 15px;
}

.today-card header p,
.today-card__empty {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 10px;
}

.today-card header > strong {
  border-radius: var(--radius-pill);
  padding: 4px 8px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 9%, var(--control-bg));
  font-size: 9px;
  white-space: nowrap;
}

.today-card__items {
  display: grid;
  align-content: start;
  gap: 7px;
}

.today-card__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 9px;
  border-radius: 10px;
  padding: 8px 9px;
  background: var(--card-soft);
}

.today-card__item > span {
  width: 7px;
  height: 7px;
  margin-top: 4px;
  border-radius: 50%;
  background: var(--accent);
}

.today-card__item > .today-card__dot--done {
  background: var(--success);
}

.today-card__item b,
.today-card__item small {
  display: block;
}

.today-card__item b {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.today-card__item small {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 9px;
}

.today-card__empty {
  display: grid;
  place-items: center;
  min-height: 82px;
  text-align: center;
}

.today-card > a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 750;
  text-decoration: none;
}

.today-card > a:hover {
  color: var(--accent);
}
</style>
