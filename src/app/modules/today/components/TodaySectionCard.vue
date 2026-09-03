<template>
  <article class="today-card panel" :data-section="id">
    <span class="today-card__watermark" aria-hidden="true"><UiIcon :name="icon" /></span>
    <header>
      <span class="today-card__icon"><UiIcon :name="icon" /></span>
      <div>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
      <strong v-if="countLabel">{{ countLabel }}</strong>
    </header>

    <div v-if="items.length" class="today-card__items">
      <div v-for="item in items" :key="item.id" class="today-card__item" :class="{ 'today-card__item--done': item.done }">
        <button v-if="item.action" type="button" class="today-card__check" :class="{ done: item.done }" :aria-label="item.done ? `Снять выполнение: ${item.label}` : `Отметить выполненным: ${item.label}`" @click="$emit('item-action', item)"><UiIcon name="check" /></button>
        <span v-else :class="{ 'today-card__dot--done': item.done }" />
        <button type="button" class="today-card__copy" @click="$emit('open-item', item)">
          <b>{{ item.label }}</b>
          <small v-if="item.meta">{{ item.meta }}</small>
        </button>
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
  id: string
  title: string
  description: string
  icon: string
  routeName: string
  countLabel: string
  emptyLabel: string
  items: TodayCardItem[]
}>()
defineEmits<{ 'item-action': [item: TodayCardItem]; 'open-item': [item: TodayCardItem] }>()
</script>

<style scoped>
.today-card {
  --today-card-accent: var(--info);
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 16px;
  min-height: 0;
  height: 100%;
  padding: 16px;
  overflow: hidden;
  background:
    radial-gradient(circle at 100% 0, color-mix(in srgb, var(--today-card-accent) 18%, transparent), transparent 42%),
    var(--panel-bg);
  transition: transform .2s var(--ease-out), border-color .2s ease, box-shadow .2s ease;
}

.today-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb,var(--today-card-accent) 30%,var(--border-color)); box-shadow: var(--shadow-md); }
.today-card[data-section='birthdays'],.today-card[data-section='coupons']{--today-card-accent:var(--pink)}
.today-card[data-section='budget'],.today-card[data-section='sport']{--today-card-accent:var(--success)}
.today-card[data-section='challenges']{--today-card-accent:var(--warning)}
.today-card[data-section='notes']{--today-card-accent:var(--cyan)}
.today-card[data-section='ideas'],.today-card[data-section='meals']{--today-card-accent:var(--orange)}
.today-card[data-section='calendar']{border-radius:22px 12px 22px 12px}
.today-card[data-section='challenges']{border-radius:12px 22px 12px 22px}
.today-card[data-section='notes']{border-radius:20px 12px 12px}
.today-card[data-section='ideas']{border-radius:12px 20px 12px 12px}

.today-card__watermark{position:absolute;right:-16px;bottom:-18px;z-index:0;color:var(--today-card-accent);font-size:104px;opacity:.045;pointer-events:none;transform:rotate(-8deg)}
.today-card > header,.today-card__items,.today-card__empty,.today-card > a{position:relative;z-index:1}

.today-card > header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  margin: -16px -16px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--today-card-accent) 16%, var(--border-color));
  padding: 15px 16px 13px;
  background: linear-gradient(100deg, color-mix(in srgb, var(--today-card-accent) 13%, var(--card-soft)), transparent 82%);
}

.today-card__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  color: var(--today-card-accent);
  background: color-mix(in srgb, var(--today-card-accent) 12%, var(--control-bg));
  font-size: 19px;
}

.today-card h2,
.today-card p {
  margin: 0;
}

.today-card h2 {
  font-size: 16px;
  letter-spacing: -.015em;
}

.today-card header p,
.today-card__empty {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 10px;
}

.today-card header > strong {
  display:grid;
  place-items:center;
  min-width:30px;
  height:30px;
  border:1px solid color-mix(in srgb,var(--today-card-accent) 22%,transparent);
  border-radius:9px;
  color: var(--today-card-accent);
  background: color-mix(in srgb, var(--today-card-accent) 11%, var(--control-bg));
  font-size: 12px;
  white-space: nowrap;
}

.today-card__items {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 7px;
}
.today-card[data-section='calendar'] .today-card__items,
.today-card[data-section='notes'] .today-card__items,
.today-card[data-section='ideas'] .today-card__items { grid-template-columns: repeat(2, minmax(0, 1fr)); }

.today-card__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 9px;
  border-left: 2px solid color-mix(in srgb,var(--today-card-accent) 58%,transparent);
  border-radius: 0 9px 9px 0;
  padding: 8px 9px;
  background: color-mix(in srgb,var(--today-card-accent) 4%,var(--card-soft));
  transition:background .16s ease;
}
.today-card__item:hover{background:color-mix(in srgb,var(--today-card-accent) 9%,var(--card-soft))}

.today-card__item > span {
  width: 7px;
  height: 7px;
  margin-top: 4px;
  border-radius: 50%;
  background: var(--today-card-accent);
}

.today-card__check{display:grid;place-items:center;width:18px;height:18px;border:1px solid var(--border-strong);border-radius:6px;color:transparent;background:var(--control-bg);font-size:11px}.today-card__check.done{border-color:var(--success);color:#fff;background:var(--success)}.today-card__copy{min-width:0;border:0;padding:0;color:inherit;background:transparent;text-align:left}.today-card__item--done .today-card__copy b{text-decoration:line-through;opacity:.7}

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
  color: var(--today-card-accent);
  font-size: 10px;
  font-weight: 750;
  text-decoration: none;
}

.today-card > a:hover {
  color: var(--today-card-accent);
}

@media(max-width:680px){.today-card[data-section='calendar'] .today-card__items,.today-card[data-section='notes'] .today-card__items,.today-card[data-section='ideas'] .today-card__items{grid-template-columns:1fr}.today-card{min-height:220px;border-radius:14px!important}.today-card__watermark{font-size:82px}}
</style>
