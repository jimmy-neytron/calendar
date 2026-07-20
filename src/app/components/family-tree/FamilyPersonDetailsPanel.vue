<template>
  <Transition name="person-panel">
    <aside v-if="person" class="person-panel" aria-label="Подробная информация о человеке">
      <UiIconButton class="person-panel__close" icon="close" label="Закрыть карточку" @click="$emit('close')" />

      <div class="person-panel__hero">
        <div class="person-panel__photo">
          <img v-if="person.photo" :src="person.photo" :alt="fullName(person)" />
          <span v-else>{{ initials(person) }}</span>
        </div>
        <div class="person-panel__summary">
          <UiChip :label="genderLabel(person.gender)" :dot="genderColor(person.gender)" />
          <h2>{{ fullName(person) }}</h2>
          <p>{{ lifePeriod(person) }}</p>
        </div>
      </div>

      <p v-if="person.birthPlace" class="person-panel__place">
        <UiIcon name="globe" />
        {{ person.birthPlace }}
      </p>

      <div v-if="person.notes" class="person-panel__section">
        <small>ИСТОРИЯ</small>
        <p>{{ person.notes }}</p>
      </div>

      <div v-if="person.tags?.length" class="person-panel__section">
        <small>ТЕГИ</small>
        <div class="person-panel__chips">
          <UiChip v-for="tag in person.tags" :key="tag" :label="`#${tag}`" />
        </div>
      </div>

      <div v-if="relations.length" class="person-panel__section">
        <small>СВЯЗИ</small>
        <div class="person-panel__relations">
          <button
            v-for="relation in relations"
            :key="relation.id"
            type="button"
            @click="$emit('select', relation.person.id)"
          >
            <span class="relation-avatar">
              <img v-if="relation.person.photo" :src="relation.person.photo" :alt="fullName(relation.person)" />
              <template v-else>{{ initials(relation.person) }}</template>
            </span>
            <span>
              <small>{{ relation.label }}</small>
              <strong>{{ fullName(relation.person) }}</strong>
            </span>
            <UiIcon name="right" />
          </button>
        </div>
      </div>

      <footer class="person-panel__actions">
        <UiButton variant="secondary" icon="edit" @click="$emit('edit')">Изменить</UiButton>
        <UiIconButton icon="trash" label="Удалить человека" variant="danger" @click="$emit('delete')" />
      </footer>
    </aside>
  </Transition>
</template>

<script setup>
import UiButton from '../ui/UiButton.vue'
import UiChip from '../ui/UiChip.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiIconButton from '../ui/UiIconButton.vue'

defineProps({
  person: { type: Object, default: null },
  relations: { type: Array, default: () => [] },
})

defineEmits(['close', 'edit', 'delete', 'select'])

function fullName(person) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Без имени'
}

function initials(person) {
  return [person?.firstName, person?.lastName]
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function genderLabel(gender) {
  if (gender === 'female') return 'Женщина'
  if (gender === 'male') return 'Мужчина'
  return 'Пол не указан'
}

function genderColor(gender) {
  if (gender === 'female') return '#d86aa3'
  if (gender === 'male') return '#4f93d2'
  return '#9b87db'
}

function lifePeriod(person) {
  const birth = formatDate(person.birthDate)
  const death = formatDate(person.deathDate)
  if (!birth && !death) return 'Даты жизни не указаны'
  if (!death) return `Родился / родилась ${birth || '—'}`
  return `${birth || '—'} — ${death}`
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
</script>

<style scoped>
.person-panel {
  position: absolute;
  z-index: 6;
  top: 14px;
  right: 14px;
  display: grid;
  gap: 13px;
  width: min(350px, calc(100% - 28px));
  max-height: calc(100% - 28px);
  overflow: auto;
  border: 1px solid var(--border-strong);
  border-radius: 20px;
  padding: 15px;
  background: color-mix(in srgb, var(--sidebar-floating-bg) 95%, transparent);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(18px);
}

.person-panel__close {
  position: absolute;
  z-index: 1;
  top: 9px;
  right: 9px;
}

.person-panel__hero {
  display: grid;
  grid-template-columns: 102px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding-right: 25px;
}

.person-panel__photo {
  display: grid;
  place-items: center;
  width: 102px;
  height: 88px;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  color: var(--text-inverse);
  background: linear-gradient(145deg, var(--accent), color-mix(in srgb, var(--accent) 45%, #111827));
  font-size: 25px;
  font-weight: 900;
}

.person-panel__photo img,
.relation-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.person-panel__summary h2 {
  margin: 7px 0 4px;
  font-size: 19px;
  line-height: 1.15;
}

.person-panel__summary p,
.person-panel__section p,
.person-panel__place {
  margin: 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.55;
}

.person-panel__place {
  display: flex;
  align-items: center;
  gap: 6px;
}

.person-panel__section {
  display: grid;
  gap: 7px;
  border-top: 1px solid var(--border-color);
  padding-top: 11px;
}

.person-panel small {
  color: var(--text-muted);
  font-size: 8px;
  font-weight: 850;
  letter-spacing: .1em;
}

.person-panel__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.person-panel__relations {
  display: grid;
  gap: 6px;
}

.person-panel__relations button {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 7px;
  color: var(--text-primary);
  background: var(--control-bg);
  text-align: left;
  transition: .16s var(--ease-out);
}

.person-panel__relations button:hover {
  border-color: var(--accent-border);
  background: var(--control-bg-hover);
  transform: translateX(-2px);
}

.person-panel__relations strong,
.person-panel__relations small {
  display: block;
}

.relation-avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  overflow: hidden;
  border-radius: 10px;
  color: var(--text-inverse);
  background: var(--accent);
  font-size: 9px;
  font-weight: 900;
}

.person-panel__actions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  border-top: 1px solid var(--border-color);
  padding-top: 11px;
}

.person-panel-enter-active,
.person-panel-leave-active {
  transition: opacity .18s var(--ease-out), transform .2s var(--ease-out);
}

.person-panel-enter-from,
.person-panel-leave-to {
  opacity: 0;
  transform: translateX(18px) scale(.98);
}

@media (max-width: 700px) {
  .person-panel {
    top: auto;
    bottom: 12px;
    left: 12px;
    right: 12px;
    width: auto;
    max-height: min(62%, 480px);
  }
}
</style>
