<template>
  <section class="challenges-page">
    <UiPageHeader title="Челленджи" description="Все текущие цели и ежедневные отметки в одном месте.">
      <template #actions>
        <UiButton variant="secondary" @click="router.push({ name: 'challenge-rewards' })">Награды</UiButton>
        <UiButton @click="openCreate">Создать челлендж</UiButton>
      </template>
    </UiPageHeader>

    <div v-if="challenges.length" class="challenge-layout">
      <aside class="challenge-sidebar panel">
        <header>
          <span>Мои челленджи</span>
          <b>{{ challenges.length }}</b>
        </header>
        <button
          v-for="item in challenges"
          :key="item.id"
          type="button"
          :class="['challenge-nav-card', { active: item.id === activeChallenge?.id }]"
          :style="{ '--challenge-color': item.color }"
          @click="activeId = item.id"
        >
          <span class="challenge-nav-card__marker" />
          <span class="challenge-nav-card__copy">
            <strong>{{ item.title }}</strong>
            <small>{{ item.completedDates.length }} из {{ item.targetDays }} дней</small>
          </span>
          <b>{{ progress(item) }}%</b>
          <span class="challenge-nav-card__track"><i :style="{ width: `${progress(item)}%` }" /></span>
        </button>
      </aside>

      <main v-if="activeChallenge" class="challenge-content">
        <section class="challenge-summary panel" :style="{ '--challenge-color': activeChallenge.color }">
          <header class="challenge-summary__header">
            <span>Текущий челлендж</span>
            <span>День {{ currentDay }} / {{ activeChallenge.targetDays }}</span>
          </header>

          <div class="challenge-summary__body">
            <ChallengeProgressDoughnut :completed="completedCount" :target="activeChallenge.targetDays" :color="activeChallenge.color" />
            <div class="challenge-summary__copy">
              <h2>{{ activeChallenge.title }}</h2>
              <p>{{ activeChallenge.description || 'Описание не добавлено.' }}</p>
              <dl>
                <div><dt>Серия</dt><dd>{{ streak }} дней</dd></div>
                <div><dt>Начало</dt><dd>{{ shortDate(activeChallenge.startDate) }}</dd></div>
                <div><dt>Выполнено</dt><dd>{{ completedCount }} дней</dd></div>
              </dl>
            </div>
          </div>

          <footer class="challenge-summary__actions">
            <UiButton size="lg" :variant="isTodayDone ? 'secondary' : 'primary'" @click="toggleToday">
              {{ isTodayDone ? 'Сегодня выполнено' : 'Отметить сегодня' }}
            </UiButton>
            <div>
              <UiIconButton icon="edit" label="Редактировать челлендж" @click="openEdit" />
              <UiIconButton icon="trash" label="Удалить челлендж" variant="danger" @click="requestDelete" />
            </div>
          </footer>
        </section>

        <section class="challenge-calendar panel">
          <header>
            <div>
              <h3>Последние четыре недели</h3>
              <p>Можно изменить отметку за любой доступный день.</p>
            </div>
            <span><i /> Выполнено</span>
          </header>
          <div class="challenge-calendar__weekdays">
            <span v-for="day in ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']" :key="day">{{ day }}</span>
          </div>
          <div class="challenge-calendar__grid">
            <button
              v-for="day in recentDays"
              :key="day.key"
              type="button"
              :disabled="!day.available"
              :class="{ done: day.done, today: day.today }"
              :title="day.label"
              @click="toggleDay(day.key)"
            >
              {{ day.day }}
            </button>
          </div>
        </section>
      </main>
    </div>

    <div v-else class="challenge-empty panel">
      <span>Пока нет челленджей</span>
      <h2>Создай первую цель</h2>
      <p>Добавь действие, срок и отмечай выполненные дни.</p>
      <UiButton @click="openCreate">Создать челлендж</UiButton>
    </div>

    <ChallengeEditorModal v-model="isEditorOpen" :challenge="editingChallenge" @save="saveChallenge" />
    <UiConfirmModal
      v-model="isDeleteOpen"
      title="Удалить челлендж?"
      :message="`Прогресс «${activeChallenge?.title || ''}» и все дневные отметки будут удалены.`"
      confirm-label="Удалить челлендж"
      @confirm="confirmDelete"
    />
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ChallengeEditorModal from '../../components/challenges/ChallengeEditorModal.vue'
import ChallengeProgressDoughnut from '../../components/challenges/ChallengeProgressDoughnut.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiConfirmModal from '../../components/ui/UiConfirmModal.vue'
import UiIconButton from '../../components/ui/UiIconButton.vue'
import UiPageHeader from '../../components/ui/UiPageHeader.vue'
import { challengeStore } from '../../stores/challenge.store.js'
import { DateHelper } from '../../utils/date/dateHelper.js'
import { useNotification } from '../../composables/ui/useNotification.js'

const router = useRouter()
const { notify } = useNotification()
const challenges = challengeStore.challenges
const activeId = ref('')
const isEditorOpen = ref(false)
const editingChallenge = ref(null)
const isDeleteOpen = ref(false)
const todayKey = DateHelper.toKey(new Date())

const activeChallenge = computed(() => challenges.value.find((item) => item.id === activeId.value) || challenges.value[0] || null)
const completedCount = computed(() => activeChallenge.value?.completedDates?.length || 0)
const streak = computed(() => challengeStore.getStreak(activeChallenge.value))
const isTodayDone = computed(() => activeChallenge.value?.completedDates?.includes(todayKey))
const currentDay = computed(() => activeChallenge.value
  ? Math.min(activeChallenge.value.targetDays, Math.max(1, daysBetween(activeChallenge.value.startDate, todayKey) + 1))
  : 0)
const recentDays = computed(() => {
  if (!activeChallenge.value) return []
  const monday = DateHelper.addDays(new Date(), -((new Date().getDay() + 6) % 7) - 21)
  return Array.from({ length: 28 }, (_, index) => {
    const date = DateHelper.addDays(monday, index)
    const key = DateHelper.toKey(date)
    return {
      key,
      day: date.getDate(),
      label: longDate(key),
      today: key === todayKey,
      done: activeChallenge.value.completedDates.includes(key),
      available: key >= activeChallenge.value.startDate && key <= todayKey,
    }
  })
})

watch(challenges, (items) => {
  if (!items.some((item) => item.id === activeId.value)) activeId.value = items[0]?.id || ''
}, { immediate: true })

function progress(item) {
  return Math.min(100, Math.round((item.completedDates?.length || 0) / item.targetDays * 100))
}

function daysBetween(start, end) {
  return Math.floor((DateHelper.parseKey(end) - DateHelper.parseKey(start)) / 86400000)
}

function shortDate(key) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(DateHelper.parseKey(key))
}

function longDate(key) {
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(DateHelper.parseKey(key))
}

function toggleToday() {
  toggleDay(todayKey)
}

function toggleDay(key) {
  const result = challengeStore.toggleDate(activeChallenge.value.id, key)
  notify(result.ok ? (result.completed ? 'День засчитан' : 'Отметка снята') : result.message, result.ok ? 'success' : 'warning')
}

function openCreate() {
  editingChallenge.value = null
  isEditorOpen.value = true
}

function openEdit() {
  editingChallenge.value = activeChallenge.value
  isEditorOpen.value = true
}

function saveChallenge(data) {
  const result = data.id ? challengeStore.updateChallenge(data.id, data) : challengeStore.addChallenge(data)
  if (!result.ok) return notify(result.message, 'warning')
  activeId.value = result.challenge.id
  isEditorOpen.value = false
  notify(data.id ? 'Челлендж обновлён' : 'Челлендж начат', 'success')
}

function requestDelete() {
  isDeleteOpen.value = true
}

async function confirmDelete() {
  isDeleteOpen.value = false
  const result = await challengeStore.deleteChallenge(activeChallenge.value.id)
  notify(result.ok ? 'Челлендж удалён' : result.message, result.ok ? 'info' : 'danger')
}
</script>

<style scoped>
.challenges-page {
  display: grid;
  gap: 18px;
  padding: 24px;
}

.page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 4px 2px 20px;
  border-bottom: 1px solid var(--border-color);
}

.page-heading h1 {
  margin: 0;
  font-size: clamp(28px, 3vw, 40px);
  font-weight: 720;
  letter-spacing: -.035em;
}

.page-heading p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.page-heading__actions {
  display: flex;
  gap: 8px;
}

.challenge-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  align-items: start;
  gap: 18px;
}

.challenge-sidebar {
  position: sticky;
  top: calc(var(--header-height) + 18px);
  display: grid;
  gap: 2px;
  padding: 8px;
}

.challenge-sidebar > header {
  display: flex;
  justify-content: space-between;
  padding: 8px 8px 12px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
}

.challenge-sidebar > header b {
  font-variant-numeric: tabular-nums;
}

.challenge-nav-card {
  display: grid;
  grid-template-columns: 4px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 7px;
  padding: 11px 10px;
  color: inherit;
  background: transparent;
  text-align: left;
}

.challenge-nav-card:hover,
.challenge-nav-card.active {
  background: var(--control-bg);
}

.challenge-nav-card.active {
  box-shadow: inset 0 0 0 1px var(--border-color);
}

.challenge-nav-card__marker {
  width: 3px;
  height: 28px;
  border-radius: 2px;
  background: var(--challenge-color);
  opacity: .55;
}

.challenge-nav-card.active .challenge-nav-card__marker {
  opacity: 1;
}

.challenge-nav-card__copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.challenge-nav-card strong {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.challenge-nav-card small {
  color: var(--text-muted);
  font-size: 9px;
}

.challenge-nav-card > b {
  color: var(--text-secondary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.challenge-nav-card__track {
  grid-column: 2 / -1;
  height: 2px;
  overflow: hidden;
  background: var(--border-color);
}

.challenge-nav-card__track i {
  display: block;
  height: 100%;
  background: var(--challenge-color);
}

.challenge-content {
  min-width: 0;
  display: grid;
  gap: 18px;
}

.challenge-summary {
  padding: 22px;
  border-top: 3px solid var(--challenge-color);
}

.challenge-summary__header {
  display: flex;
  justify-content: space-between;
  padding-bottom: 18px;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.challenge-summary__body {
  display: flex;
  align-items: center;
  gap: 24px;
}

.challenge-summary__copy {
  min-width: 0;
  flex: 1;
}

.challenge-summary h2 {
  margin: 0;
  font-size: clamp(23px, 3vw, 32px);
  font-weight: 680;
  letter-spacing: -.025em;
}

.challenge-summary__copy > p {
  max-width: 660px;
  margin: 7px 0 20px;
  color: var(--text-secondary);
  line-height: 1.55;
}

.challenge-summary dl {
  display: flex;
  gap: 28px;
  margin: 0;
}

.challenge-summary dl div {
  display: grid;
  gap: 3px;
}

.challenge-summary dt {
  color: var(--text-muted);
  font-size: 9px;
}

.challenge-summary dd {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
}

.challenge-summary__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.challenge-summary__actions > div {
  display: flex;
  gap: 5px;
}

.challenge-calendar {
  padding: 18px;
}

.challenge-calendar > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.challenge-calendar h3 {
  margin: 0;
  font-size: 15px;
}

.challenge-calendar header p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 10px;
}

.challenge-calendar header > span {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 9px;
}

.challenge-calendar header > span i {
  width: 8px;
  height: 8px;
  background: var(--success);
}

.challenge-calendar__weekdays,
.challenge-calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.challenge-calendar__weekdays span {
  padding: 3px 4px 7px;
  color: var(--text-muted);
  font-size: 8px;
  text-align: right;
}

.challenge-calendar__grid button {
  min-height: 46px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.challenge-calendar__grid button:hover:not(:disabled) {
  border-color: var(--text-muted);
}

.challenge-calendar__grid button.done {
  border-color: var(--success);
  color: var(--text-inverse);
  background: var(--success);
}

.challenge-calendar__grid button.today {
  outline: 1px solid var(--accent);
  outline-offset: 2px;
}

.challenge-calendar__grid button:disabled {
  color: var(--text-muted);
  background: var(--control-bg);
  opacity: .35;
}

.challenge-empty {
  min-height: 420px;
  display: grid;
  justify-items: start;
  align-content: center;
  gap: 7px;
  border-style: dashed;
  padding: clamp(28px, 8vw, 80px);
}

.challenge-empty > span {
  color: var(--text-muted);
  font-size: 10px;
  text-transform: uppercase;
}

.challenge-empty h2,
.challenge-empty p {
  margin: 0;
}

.challenge-empty p {
  margin-bottom: 10px;
  color: var(--text-secondary);
}

@media (max-width: 960px) {
  .challenge-layout {
    grid-template-columns: 1fr;
  }

  .challenge-sidebar {
    position: static;
    display: flex;
    overflow-x: auto;
  }

  .challenge-sidebar > header {
    display: none;
  }

  .challenge-nav-card {
    min-width: 220px;
  }
}

@media (max-width: 640px) {
  .challenges-page {
    gap: 14px;
    padding: 14px;
  }

  .page-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .page-heading__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .challenge-summary__body {
    align-items: flex-start;
    flex-direction: column;
  }

  .challenge-summary dl {
    width: 100%;
    justify-content: space-between;
    gap: 12px;
  }

  .challenge-calendar__grid button {
    min-height: 36px;
  }
}
</style>
