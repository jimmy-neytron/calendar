<template>
  <section class="calendar-filters panel">
    <div class="calendar-filters__search">
      <input
        :value="filters.search"
        type="search"
        placeholder="Поиск: событие, место, заметка..."
        @input="update('search', $event.target.value)"
      />
    </div>

    <div class="calendar-filters__row">
      <label>
        <span>Календарь</span>
        <UiSelect :model-value="filters.calendarId" compact @update:model-value="update('calendarId', $event)">
          <option value="all">Все календари</option>
          <option v-for="calendar in calendars" :key="calendar.id" :value="calendar.id">
            {{ calendar.name }}
          </option>
        </UiSelect>
      </label>
      <label>
        <span>Категория</span>
        <UiSelect :model-value="filters.category" compact @update:model-value="update('category', $event)">
          <option v-for="category in categories" :key="category.value" :value="category.value">
            {{ category.label }}
          </option>
        </UiSelect>
      </label>

      <label>
        <span>Участник</span>
        <UiSelect :model-value="filters.memberId" compact @update:model-value="update('memberId', $event)">
          <option value="all">Все участники</option>
          <option value="family">Вся семья</option>
          <option v-for="member in members" :key="member.id" :value="member.id">
            {{ member.name }}
          </option>
        </UiSelect>
      </label>

      <label>
        <span>Важность</span>
        <UiSelect :model-value="filters.importance" compact @update:model-value="update('importance', $event)">
          <option value="all">Любая</option>
          <option v-for="importance in importances" :key="importance.value" :value="importance.value">
            {{ importance.label }}
          </option>
        </UiSelect>
      </label>

      <button class="calendar-filters__mine" :class="{ active: filters.onlyMine }" type="button" @click="update('onlyMine', !filters.onlyMine)">
        Только мои
      </button>

      <button class="calendar-filters__reset" type="button" @click="$emit('reset')">
        Сбросить
      </button>
    </div>
  </section>
</template>

<script setup>
import UiSelect from '../ui/UiSelect.vue'
import { EVENT_CATEGORIES, IMPORTANCE_OPTIONS } from '../../utils/constants/calendarConstants.js'

defineProps({
  filters: { type: Object, required: true },
  members: { type: Array, default: () => [] },
  calendars: { type: Array, default: () => [] },
})

const emit = defineEmits(['update-filter', 'reset'])
const categories = EVENT_CATEGORIES
const importances = IMPORTANCE_OPTIONS

function update(key, value) {
  emit('update-filter', key, value)
}
</script>

<style scoped>
.calendar-filters {
  display: grid;
  gap: 8px;
  padding: 10px;
}

.calendar-filters__search input {
  width: 100%;
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0 10px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  outline: none;
}

.calendar-filters__search input:focus {
  border-color: var(--border-strong);
}

.calendar-filters__row {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr)) auto auto;
  gap: 8px;
  align-items: end;
}

.calendar-filters label {
  display: grid;
  gap: 4px;
}

.calendar-filters span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.calendar-filters__mine,
.calendar-filters__reset {
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0 10px;
  color: var(--text-secondary);
  background: var(--card-soft);
  font-size: 12px;
  font-weight: 700;
}

.calendar-filters__mine.active {
  color: var(--text-inverse);
  background: var(--accent);
}

@media (max-width: 900px) {
  .calendar-filters__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .calendar-filters__row {
    grid-template-columns: 1fr;
  }
}
</style>
