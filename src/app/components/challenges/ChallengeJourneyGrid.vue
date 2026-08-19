<template>
  <section class="journey panel" :style="{ '--challenge-color': color }">
    <header class="journey__header">
      <div>
        <h3>Весь путь</h3>
        <p>{{ dateRangeLabel }} · {{ targetDays }} дней</p>
      </div>
      <div class="journey__legend" aria-label="Обозначения">
        <span><i /> Не выполнено</span>
        <span><i class="done" /> Выполнено</span>
        <span><i class="future" /> Впереди</span>
      </div>
    </header>

    <div class="journey__scroll">
      <div class="journey__content" :style="{ '--weeks': weeks.length }">
        <div class="journey__month-spacer" />
        <div class="journey__months">
          <span
            v-for="month in monthLabels"
            :key="`${month.label}-${month.weekIndex}`"
            :style="{ gridColumnStart: month.weekIndex + 1 }"
          >
            {{ month.label }}
          </span>
        </div>

        <div class="journey__weekdays">
          <span v-for="day in weekdays" :key="day">{{ day }}</span>
        </div>

        <div class="journey__weeks">
          <div v-for="(week, weekIndex) in weeks" :key="weekIndex" class="journey__week">
            <button
              v-for="day in week"
              :key="day.key"
              type="button"
              :disabled="!day.available"
              :class="{
                outside: !day.inRange,
                done: day.done,
                today: day.today,
                future: day.inRange && day.future,
              }"
              :title="day.label"
              :aria-label="day.label"
              @click="day.available && $emit('toggle', day.key)"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { DateHelper } from '../../utils/date/dateHelper.js'

const props = defineProps({
  startDate: { type: String, required: true },
  targetDays: { type: Number, required: true },
  completedDates: { type: Array, default: () => [] },
  todayKey: { type: String, required: true },
  color: { type: String, default: 'var(--accent)' },
})

defineEmits(['toggle'])

const weekdays = ['Пн', '', 'Ср', '', 'Пт', '', 'Вс']
const completedSet = computed(() => new Set(props.completedDates))
const challengeEnd = computed(() => DateHelper.addDays(DateHelper.parseKey(props.startDate), Math.max(0, props.targetDays - 1)))
const dateRangeLabel = computed(() => `${formatShort(props.startDate)} — ${formatShort(DateHelper.toKey(challengeEnd.value))}`)

const gridDays = computed(() => {
  const start = DateHelper.parseKey(props.startDate)
  const startOffset = (start.getDay() + 6) % 7
  const gridStart = DateHelper.addDays(start, -startOffset)
  const endOffset = 6 - ((challengeEnd.value.getDay() + 6) % 7)
  const gridEnd = DateHelper.addDays(challengeEnd.value, endOffset)
  const length = Math.round((gridEnd - gridStart) / 86400000) + 1

  return Array.from({ length }, (_, index) => {
    const date = DateHelper.addDays(gridStart, index)
    const key = DateHelper.toKey(date)
    const inRange = key >= props.startDate && key <= DateHelper.toKey(challengeEnd.value)
    const done = inRange && completedSet.value.has(key)
    const future = key > props.todayKey
    const state = done ? 'выполнено' : future ? 'впереди' : inRange ? 'не выполнено' : ''

    return {
      key,
      inRange,
      done,
      future,
      today: key === props.todayKey,
      available: inRange && !future,
      label: `${formatLong(key)}${state ? ` — ${state}` : ''}`,
      month: date.getMonth(),
      year: date.getFullYear(),
      dayOfMonth: date.getDate(),
    }
  })
})

const weeks = computed(() => Array.from(
  { length: Math.ceil(gridDays.value.length / 7) },
  (_, index) => gridDays.value.slice(index * 7, index * 7 + 7),
))

const monthLabels = computed(() => {
  const labels = []
  let previousMonthKey = ''

  weeks.value.forEach((week, weekIndex) => {
    const representative = week.find((day) => day.inRange && day.dayOfMonth <= 7)
      || (weekIndex === 0 ? week.find((day) => day.inRange) : null)
    if (!representative) return

    const monthKey = `${representative.year}-${representative.month}`
    if (monthKey === previousMonthKey) return
    previousMonthKey = monthKey
    labels.push({
      weekIndex,
      label: new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(DateHelper.parseKey(representative.key)).replace('.', ''),
    })
  })

  return labels
})

function formatShort(key) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(DateHelper.parseKey(key))
}

function formatLong(key) {
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(DateHelper.parseKey(key))
}
</script>

<style scoped>
.journey {
  --cell-size: 18px;
  --cell-gap: 4px;
  min-width: 0;
  padding: 20px;
}

.journey__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.journey h3 {
  margin: 0;
  font-size: 15px;
}

.journey__header p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 10px;
}

.journey__legend {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-muted);
  font-size: 9px;
}

.journey__legend span {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.journey__legend i,
.journey__week button {
  width: var(--cell-size);
  height: var(--cell-size);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: color-mix(in srgb, var(--text-muted) 10%, var(--card-solid));
}

.journey__legend i.done,
.journey__week button.done {
  border-color: var(--challenge-color);
  background: var(--challenge-color);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #fff 14%, transparent);
}

.journey__legend i.future,
.journey__week button.future {
  border-style: dashed;
  background: var(--card-solid);
  opacity: .48;
}

.journey__scroll {
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  padding: 15px 14px 13px;
  background: var(--card-soft);
  scrollbar-width: thin;
}

.journey__content {
  width: max-content;
  min-width: 100%;
  display: grid;
  grid-template-columns: 28px max-content;
  grid-template-rows: 20px auto;
  gap: 7px 10px;
}

.journey__months,
.journey__weeks {
  display: grid;
  grid-template-columns: repeat(var(--weeks), var(--cell-size));
  gap: var(--cell-gap);
}

.journey__months {
  align-items: end;
}

.journey__months span {
  color: var(--text-muted);
  font-size: 9px;
  text-transform: capitalize;
  white-space: nowrap;
}

.journey__weekdays,
.journey__week {
  display: grid;
  grid-template-rows: repeat(7, var(--cell-size));
  gap: var(--cell-gap);
}

.journey__weekdays span {
  align-self: center;
  color: var(--text-muted);
  font-size: 8px;
  line-height: var(--cell-size);
  text-align: right;
}

.journey__week button {
  display: block;
  padding: 0;
}

.journey__week button:not(:disabled):hover {
  border-color: var(--text-primary);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--text-primary) 15%, transparent);
  transform: translateY(-1px) scale(1.12);
}

.journey__week button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.journey__week button.today {
  outline: 2px solid var(--text-primary);
  outline-offset: 2px;
}

.journey__week button.outside {
  border-color: transparent;
  background: transparent;
  opacity: 0;
}

@media (max-width: 640px) {
  .journey__header {
    flex-direction: column;
  }

  .journey__legend {
    width: 100%;
    overflow-x: auto;
  }
}
</style>
