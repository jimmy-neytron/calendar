<template>
  <section class="analytics-summary" aria-label="Основные показатели за всё время">
    <article><span>Активные дни</span><strong>{{ activeDays }}</strong><small>дней с тренировками</small></article>
    <article><span>Упражнения</span><strong>{{ totalCompletions }}</strong><small>выполнено</small></article>
    <article><span>Время</span><strong>{{ duration }}</strong><small>по сохранённой длительности</small></article>
    <article><span>Лучшая серия</span><strong>{{ longestStreak }}</strong><small>{{ dayLabel(longestStreak) }} подряд</small></article>
  </section>
</template>

<script setup lang="ts">
defineProps<{ activeDays: number; totalCompletions: number; duration: string; longestStreak: number }>()
function dayLabel(value: number) {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'дней'
  if (last === 1) return 'день'
  if (last >= 2 && last <= 4) return 'дня'
  return 'дней'
}
</script>

<style scoped>
.analytics-summary { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--border-color); border-radius: 10px; background: var(--card-solid); }
.analytics-summary article { min-width: 0; display: grid; gap: 4px; padding: 15px 16px; }
.analytics-summary article + article { border-left: 1px solid var(--border-color); }
.analytics-summary span, .analytics-summary small { color: var(--text-muted); font-size: 10px; }
.analytics-summary strong { font-size: 24px; line-height: 1.1; }
@media (max-width: 760px) { .analytics-summary { grid-template-columns: 1fr 1fr; }.analytics-summary article:nth-child(3) { border-left: 0; }.analytics-summary article:nth-child(n + 3) { border-top: 1px solid var(--border-color); } }
@media (max-width: 430px) { .analytics-summary { grid-template-columns: 1fr; }.analytics-summary article + article { border-top: 1px solid var(--border-color); border-left: 0; } }
</style>
