<template>
  <section class="meal-week" aria-label="Меню на неделю">
    <nav class="meal-week__days" aria-label="Дни недели">
      <button
        v-for="day in days"
        :key="day.key"
        type="button"
        :class="{ active: day.key === selectedDayKey, today: day.isToday }"
        :aria-pressed="day.key === selectedDayKey"
        @click="selectedDayKey = day.key"
      >
        <span>{{ day.weekday }}</span>
        <strong>{{ day.dayLabel }}</strong>
        <div class="meal-week__day-progress" aria-hidden="true">
          <i :style="{ width: `${filledPercent(day)}%` }" />
        </div>
        <small>{{ filledCount(day) }}/{{ day.slots.length }}</small>
      </button>
    </nav>

    <div v-if="selectedDay" class="meal-day-focus">
      <header class="meal-day-focus__header">
        <div>
          <span>{{ selectedDay.isToday ? 'Сегодня' : 'План на день' }}</span>
          <h2>{{ selectedDay.weekday }}, {{ selectedDay.dayLabel }}</h2>
        </div>
        <div class="meal-day-focus__stats">
          <strong>{{ selectedDay.caloriesLabel }}</strong>
          <small>{{ filledCount(selectedDay) }} из {{ selectedDay.slots.length }} приёмов запланировано</small>
        </div>
      </header>

      <div class="meal-day-focus__slots">
        <article
          v-for="slot in selectedDay.slots"
          :key="slot.mealType"
          class="meal-focus-slot"
          :class="{ 'meal-focus-slot--empty': !slot.recipe }"
        >
          <header>
            <span><i />{{ slot.label }}</span>
            <UiIconButton
              v-if="slot.recipe"
              icon="close"
              :label="`Убрать ${slot.recipe.title}`"
              variant="danger"
              @click="emit('remove', selectedDay.key, slot.mealType)"
            />
          </header>

          <button
            v-if="slot.recipe"
            class="meal-focus-slot__recipe"
            type="button"
            @click="emit('select', selectedDay.key, slot.mealType)"
          >
            <strong>{{ slot.recipe.title }}</strong>
            <span>{{ slot.recipe.nutritionLabel }}</span>
            <small>Нажми, чтобы заменить <UiIcon name="right" /></small>
          </button>

          <button
            v-else
            class="meal-focus-slot__add"
            type="button"
            @click="emit('select', selectedDay.key, slot.mealType)"
          >
            <span><UiIcon name="plus" /></span>
            <strong>Добавить блюдо</strong>
            <small>{{ slot.label }} пока не запланирован</small>
          </button>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiIconButton from '../../../components/ui/UiIconButton.vue'
import type { MealType } from '../types/meals.types'

export interface MealWeekSlotView {
  mealType: MealType
  label: string
  recipe: null | { title: string; nutritionLabel: string }
}

export interface MealWeekDayView {
  key: string
  weekday: string
  dayLabel: string
  isToday: boolean
  caloriesLabel: string
  missingCount: number
  slots: MealWeekSlotView[]
}

const props = defineProps<{ days: MealWeekDayView[] }>()

const emit = defineEmits<{
  select: [date: string, mealType: MealType]
  remove: [date: string, mealType: MealType]
}>()

const selectedDayKey = ref('')
const selectedDay = computed(() => props.days.find((day) => day.key === selectedDayKey.value) || props.days[0])

watch(() => props.days, (days) => {
  if (days.some((day) => day.key === selectedDayKey.value)) return
  selectedDayKey.value = days.find((day) => day.isToday)?.key || days[0]?.key || ''
}, { immediate: true })

function filledCount(day: MealWeekDayView) {
  return day.slots.filter((slot) => slot.recipe).length
}

function filledPercent(day: MealWeekDayView) {
  return day.slots.length ? (filledCount(day) / day.slots.length) * 100 : 0
}
</script>

<style scoped>
.meal-week{display:grid;gap:12px}.meal-week__days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.meal-week__days button{position:relative;display:grid;min-width:0;gap:5px;border:1px solid transparent;border-radius:14px;padding:11px 12px;color:var(--text-secondary);background:var(--card-soft);text-align:left;transition:transform .18s var(--ease-out),border-color .18s var(--ease-out),background .18s var(--ease-out)}.meal-week__days button:hover{border-color:var(--border-strong);transform:translateY(-1px)}.meal-week__days button.active{border-color:var(--accent-border);color:var(--text-primary);background:var(--accent-soft);box-shadow:0 8px 24px color-mix(in srgb,var(--accent) 10%,transparent)}.meal-week__days button.today::after{position:absolute;top:9px;right:9px;width:6px;height:6px;border-radius:50%;background:var(--accent);content:""}.meal-week__days span{font-size:8px;font-weight:850;text-transform:uppercase;letter-spacing:.08em}.meal-week__days strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.meal-week__days small{color:var(--text-muted);font-size:8px}.meal-week__day-progress{height:3px;overflow:hidden;border-radius:99px;background:var(--control-bg)}.meal-week__day-progress i{display:block;height:100%;border-radius:inherit;background:var(--accent);transition:width .22s var(--ease-out)}.meal-day-focus{overflow:hidden;border:1px solid var(--border-color);border-radius:20px;background:var(--card-solid);box-shadow:var(--shadow-sm)}.meal-day-focus__header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding:22px 24px 17px}.meal-day-focus__header span{color:var(--accent);font-size:8px;font-weight:850;text-transform:uppercase;letter-spacing:.1em}.meal-day-focus__header h2{margin:5px 0 0;font-size:21px;line-height:1.15;text-transform:capitalize}.meal-day-focus__stats{text-align:right}.meal-day-focus__stats strong,.meal-day-focus__stats small{display:block}.meal-day-focus__stats strong{font-size:13px}.meal-day-focus__stats small{margin-top:4px;color:var(--text-muted);font-size:8px}.meal-day-focus__slots{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid var(--border-color)}.meal-focus-slot{display:grid;grid-template-rows:auto 1fr;min-width:0;min-height:176px;border-right:1px solid var(--border-color);padding:16px}.meal-focus-slot:last-child{border-right:0}.meal-focus-slot>header{display:flex;min-height:28px;align-items:center;justify-content:space-between;gap:8px}.meal-focus-slot>header>span{display:flex;align-items:center;gap:7px;color:var(--text-secondary);font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.meal-focus-slot>header>span i{width:7px;height:7px;border-radius:50%;background:var(--accent)}.meal-focus-slot :deep(.ui-icon-button){width:25px;height:25px;min-height:25px;opacity:.55}.meal-focus-slot__recipe,.meal-focus-slot__add{display:flex;min-width:0;flex-direction:column;align-items:flex-start;justify-content:flex-end;border:0;padding:18px 0 2px;color:var(--text-primary);background:transparent;text-align:left}.meal-focus-slot__recipe strong{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;font-size:15px;line-height:1.25}.meal-focus-slot__recipe>span{margin-top:7px;color:var(--text-muted);font-size:9px}.meal-focus-slot__recipe small{display:flex;align-items:center;gap:5px;margin-top:20px;color:var(--accent);font-size:8px;font-weight:750}.meal-focus-slot__recipe small svg{font-size:11px;transition:transform .18s var(--ease-out)}.meal-focus-slot__recipe:hover small svg{transform:translateX(3px)}.meal-focus-slot--empty{background:color-mix(in srgb,var(--control-bg) 55%,transparent)}.meal-focus-slot__add{align-items:center;justify-content:center;padding:16px 0;text-align:center}.meal-focus-slot__add>span{display:grid;width:34px;height:34px;place-items:center;border-radius:50%;color:var(--accent);background:var(--accent-soft);font-size:16px;transition:transform .18s var(--ease-out)}.meal-focus-slot__add strong{margin-top:10px;font-size:11px}.meal-focus-slot__add small{margin-top:4px;color:var(--text-muted);font-size:8px}.meal-focus-slot__add:hover>span{transform:scale(1.08)}
@media(max-width:900px){.meal-week__days{gap:5px}.meal-week__days button{padding:9px}.meal-week__days strong{font-size:11px}.meal-day-focus__slots{grid-template-columns:repeat(2,minmax(0,1fr))}.meal-focus-slot:nth-child(2){border-right:0}.meal-focus-slot:nth-child(-n+2){border-bottom:1px solid var(--border-color)}}
@media(max-width:620px){.meal-week__days{grid-template-columns:repeat(7,72px);overflow-x:auto;margin:0 -2px;padding:2px 2px 7px;scrollbar-width:none}.meal-week__days::-webkit-scrollbar{display:none}.meal-week__days button{scroll-snap-align:start}.meal-day-focus__header{align-items:flex-start;flex-direction:column;padding:18px}.meal-day-focus__stats{text-align:left}.meal-day-focus__slots{grid-template-columns:1fr}.meal-focus-slot{min-height:135px;border-right:0;border-bottom:1px solid var(--border-color);padding:15px 18px}.meal-focus-slot:nth-child(2){border-bottom:1px solid var(--border-color)}.meal-focus-slot:last-child{border-bottom:0}.meal-focus-slot__recipe{padding-top:12px}.meal-focus-slot__recipe small{margin-top:12px}}
</style>
