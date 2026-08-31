<template>
  <section class="goals-page">
    <UiPageHeader title="Цели" description="Челленджи, измеримый прогресс и личные рекорды.">
      <template #actions><UiButton @click="openCreate">Новая цель</UiButton></template>
    </UiPageHeader>

    <GoalsTabs :active="activeView" @select="selectTab" />

    <section class="goals-summary">
      <article><span>Активные цели</span><strong>{{ challenges.filter((item) => item.active).length }}</strong></article>
      <article><span>Сегодня отмечено</span><strong>{{ todayCompletedCount }}</strong></article>
      <article><span>Всего выполнений</span><strong>{{ totalCheckIns }}</strong></article>
      <article><span>Числовые рекорды</span><strong>{{ recordsCount }}</strong></article>
    </section>

    <ChallengeRecordsPanel v-if="activeView === 'records'" :challenges="challenges" />

    <template v-else-if="challenges.length">
      <div class="goals-layout">
        <aside class="goals-list panel">
          <header><strong>Мои цели</strong><button type="button" @click="openCreate"><UiIcon name="plus" /> Добавить</button></header>
          <button v-for="item in challenges" :key="item.id" type="button" :class="['goal-row', { active: item.id === activeChallenge?.id }]" @click="activeId = item.id">
            <i :style="{ background: item.color }" />
            <span><strong>{{ item.title }}</strong><small>{{ goalTypeLabel(item) }}</small></span>
            <b>{{ challengeStore.getProgress(item).percent }}%</b>
          </button>
        </aside>

        <main v-if="activeChallenge" class="goal-content">
          <section class="goal-head panel" :style="{ '--goal-color': activeChallenge.color }">
            <header><span>{{ goalTypeLabel(activeChallenge) }}</span><span :class="['goal-status', goalStatus.kind]">{{ goalStatus.label }}</span><span>{{ dateRangeLabel }}</span></header>
            <div class="goal-head__body">
              <ChallengeProgressDoughnut :completed="activeProgress.current" :target="activeProgress.target" :percent="activeProgress.percent" :direction="activeChallenge.progressDirection" :color="activeChallenge.color" :unit="activeUnit" />
              <div>
                <h2>{{ activeChallenge.title }}</h2>
                <p v-if="activeChallenge.description">{{ activeChallenge.description }}</p>
                <dl>
                  <div><dt>Результат</dt><dd>{{ activeProgress.current }} / {{ activeProgress.target }} {{ activeUnit }}</dd></div>
                  <div><dt>Серия</dt><dd>{{ streak }} {{ dayWord(streak) }}</dd></div>
                  <div><dt>Осталось</dt><dd>{{ formatNumber(activeProgress.remaining) }} {{ activeUnit }}</dd></div>
                  <div><dt>До конца</dt><dd>{{ deadlineLabel }}</dd></div>
                </dl>
              </div>
            </div>
            <footer>
              <div class="goal-head__primary-actions">
                <UiButton :variant="isTodayDone ? 'secondary' : 'primary'" :disabled="!canCheckInToday" @click="handleTodayAction">{{ todayActionLabel }}</UiButton>
              </div>
              <div><UiIconButton :icon="activeChallenge.active ? 'minus' : 'play'" :label="activeChallenge.active ? 'Приостановить цель' : 'Возобновить цель'" @click="toggleActive" /><UiIconButton icon="edit" label="Настроить цель" @click="openEdit" /><UiIconButton icon="trash" label="Удалить цель" variant="danger" @click="isDeleteOpen = true" /></div>
            </footer>
          </section>

          <ChallengeJourneyGrid :start-date="activeChallenge.startDate" :target-days="activeChallenge.targetDays" :completed-dates="activeCompletedDates" :daily-values="activeChallenge.dailyValues" :unit="activeUnit" :today-key="todayKey" :color="activeChallenge.color" @toggle="handleDayAction" />

          <div class="goal-insights">
            <ChallengeProgressChart :challenge="activeChallenge" />
            <ChallengeRecordsPanel :challenges="[activeChallenge]" />
          </div>
        </main>
      </div>
    </template>

    <section v-else class="goals-empty panel">
      <h2>Создай первую цель</h2><p>Выбери готовый вариант и начни отмечать дни. Настройка займёт меньше минуты.</p><UiButton @click="openCreate">Выбрать цель</UiButton>
    </section>

    <ChallengeEditorModal v-model="isEditorOpen" :challenge="editingChallenge" @save="saveChallenge" />
    <ChallengeResultModal v-model="isResultOpen" :challenge="activeChallenge" :date-key="resultDate" @save="saveResult" @remove="removeResult" />
    <UiConfirmModal v-model="isDeleteOpen" title="Удалить цель?" :message="`Прогресс «${activeChallenge?.title || ''}» будет удалён.`" confirm-label="Удалить" @confirm="confirmDelete" />
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChallengeEditorModal from '../../components/challenges/ChallengeEditorModal.vue'
import ChallengeJourneyGrid from '../../components/challenges/ChallengeJourneyGrid.vue'
import ChallengeProgressChart from '../../components/challenges/ChallengeProgressChart.vue'
import ChallengeProgressDoughnut from '../../components/challenges/ChallengeProgressDoughnut.vue'
import ChallengeRecordsPanel from '../../components/challenges/ChallengeRecordsPanel.vue'
import ChallengeResultModal from '../../components/challenges/ChallengeResultModal.vue'
import GoalsTabs from '../../components/challenges/GoalsTabs.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiConfirmModal from '../../components/ui/UiConfirmModal.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import UiIconButton from '../../components/ui/UiIconButton.vue'
import UiPageHeader from '../../components/ui/UiPageHeader.vue'
import { challengeStore } from '../../stores/challenge.store.js'
import { DateHelper } from '../../utils/date/dateHelper.js'
import { useNotification } from '../../composables/ui/useNotification.js'

const router = useRouter()
const route = useRoute()
const { notify } = useNotification()
const challenges = challengeStore.challenges
const activeId = ref('')
const activeView = ref(route.query.view === 'records' ? 'records' : 'goals')
const isEditorOpen = ref(false)
const editingChallenge = ref(null)
const isDeleteOpen = ref(false)
const isResultOpen = ref(false)
const resultDate = ref(DateHelper.toKey(new Date()))
const todayKey = DateHelper.toKey(new Date())
const activeChallenge = computed(() => challenges.value.find((item) => item.id === activeId.value) || challenges.value[0] || null)
const activeProgress = computed(() => challengeStore.getProgress(activeChallenge.value))
const activeGoalType = computed(() => activeChallenge.value?.goalType || 'consistency')
const activeUnit = computed(() => activeChallenge.value?.unit || 'дней')
const streak = computed(() => challengeStore.getStreak(activeChallenge.value))
const activeCompletedDates = computed(() => getCompletedDates(activeChallenge.value))
const isTodayDone = computed(() => activeCompletedDates.value.includes(todayKey))
const todayActionLabel = computed(() => activeGoalType.value === 'consistency' ? (isTodayDone.value ? 'Сегодня отмечено' : 'Отметить сегодня') : (isTodayDone.value ? 'Изменить результат' : 'Записать результат'))
const todayCompletedCount = computed(() => challenges.value.filter((item) => getCompletedDates(item).includes(todayKey)).length)
const totalCheckIns = computed(() => challenges.value.reduce((sum, item) => sum + getCompletedDates(item).length, 0))
const recordsCount = computed(() => challenges.value.filter((item) => ['total', 'best'].includes(item.goalType) && challengeStore.getProgress(item).record > 0).length)
const dateRangeLabel = computed(() => activeChallenge.value ? `${shortDate(activeChallenge.value.startDate)} — ${shortDate(DateHelper.toKey(DateHelper.addDays(DateHelper.parseKey(activeChallenge.value.startDate), activeChallenge.value.targetDays - 1)))}` : '')
const endDateKey = computed(() => activeChallenge.value ? DateHelper.toKey(DateHelper.addDays(DateHelper.parseKey(activeChallenge.value.startDate), activeChallenge.value.targetDays - 1)) : todayKey)
const daysUntilEnd = computed(() => Math.ceil((DateHelper.parseKey(endDateKey.value) - DateHelper.parseKey(todayKey)) / 86400000))
const daysUntilStart = computed(() => activeChallenge.value ? Math.ceil((DateHelper.parseKey(activeChallenge.value.startDate) - DateHelper.parseKey(todayKey)) / 86400000) : 0)
const canCheckInToday = computed(() => Boolean(activeChallenge.value?.active && todayKey >= activeChallenge.value.startDate && todayKey <= endDateKey.value))
const deadlineLabel = computed(() => daysUntilStart.value > 0 ? `старт через ${daysUntilStart.value} ${dayWord(daysUntilStart.value)}` : daysUntilEnd.value < 0 ? `срок вышел ${Math.abs(daysUntilEnd.value)} ${dayWord(Math.abs(daysUntilEnd.value))} назад` : daysUntilEnd.value === 0 ? 'последний день' : `${daysUntilEnd.value} ${dayWord(daysUntilEnd.value)}`)
const goalStatus = computed(() => {
  if (!activeChallenge.value?.active) return { kind: 'paused', label: 'Приостановлена' }
  if (activeProgress.value.percent >= 100) return { kind: 'completed', label: 'Цель достигнута' }
  if (daysUntilStart.value > 0) return { kind: 'scheduled', label: 'Запланирована' }
  if (daysUntilEnd.value < 0) return { kind: 'overdue', label: 'Срок вышел' }
  return { kind: 'active', label: 'В процессе' }
})

watch([challenges, () => route.query.goal], ([items, requestedGoal]) => {
  const requested = typeof requestedGoal === 'string' ? requestedGoal : ''
  if (requested && items.some((item) => item.id === requested)) activeId.value = requested
  else if (!items.some((item) => item.id === activeId.value)) activeId.value = items[0]?.id || ''
}, { immediate: true })
function goalTypeLabel(item) { return item.goalType === 'total' ? `Набрать ${item.targetValue} ${item.unit}` : item.goalType === 'best' ? `${item.progressDirection === 'decrease' ? 'Снизить до' : 'Достичь'} ${item.targetValue} ${item.unit}` : `${item.targetValue || item.targetDays} выполнений` }
function shortDate(key) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(DateHelper.parseKey(key)) }
function dayWord(value) { const last = value % 10; const lastTwo = value % 100; return lastTwo >= 11 && lastTwo <= 14 ? 'дней' : last === 1 ? 'день' : last >= 2 && last <= 4 ? 'дня' : 'дней' }
function formatNumber(value) { return Number.isInteger(value) ? value : Math.round(value * 10) / 10 }
function getCompletedDates(challenge) { return (challenge?.goalType || 'consistency') === 'consistency' ? [...new Set(challenge?.completedDates || [])] : Object.keys(challenge?.dailyValues || {}).filter((key) => Number(challenge.dailyValues[key]) > 0).sort() }
function handleTodayAction() { handleDayAction(todayKey) }
function handleDayAction(key) { if (!activeChallenge.value.active) return notify('Сначала возобнови цель', 'warning'); activeGoalType.value === 'consistency' ? toggleDay(key) : openResult(key) }
function toggleDay(key) { const result = challengeStore.toggleDate(activeChallenge.value.id, key); notify(result.ok ? (result.completed ? 'День отмечен' : 'Отметка снята') : result.message, result.ok ? 'success' : 'warning') }
function openResult(key) { resultDate.value = key; isResultOpen.value = true }
function saveResult(payload) { const existed = Number(activeChallenge.value.dailyValues?.[payload.date]) > 0; const result = challengeStore.recordResult(activeChallenge.value.id, payload.date, payload.value); if (result.ok) { isResultOpen.value = false; notify(existed ? 'Результат обновлён' : 'Результат записан', 'success') } else notify(result.message, 'warning') }
function removeResult(date) { const result = challengeStore.removeResult(activeChallenge.value.id, date); if (result.ok) { isResultOpen.value = false; notify('Результат удалён', 'info') } else notify(result.message, 'warning') }
function toggleActive() { const result = challengeStore.toggleActive(activeChallenge.value.id); notify(result.ok ? (result.challenge.active ? 'Цель возобновлена' : 'Цель приостановлена') : result.message, result.ok ? 'info' : 'warning') }
function openCreate() { editingChallenge.value = null; isEditorOpen.value = true }
function selectTab(tab) { activeView.value = tab; router.replace({ query: tab === 'records' ? { view: 'records' } : {} }) }
function openEdit() { editingChallenge.value = activeChallenge.value; isEditorOpen.value = true }
function saveChallenge(data) { const result = data.id ? challengeStore.updateChallenge(data.id, data) : challengeStore.addChallenge(data); if (!result.ok) return notify(result.message, 'warning'); activeId.value = result.challenge.id; isEditorOpen.value = false; notify(data.id ? 'Цель обновлена' : 'Цель создана', 'success') }
async function confirmDelete() { isDeleteOpen.value = false; const challenge = activeChallenge.value; if (!challenge) return; const result = await challengeStore.deleteChallenge(challenge.id); if (!result.ok) return notify(result.message, 'danger'); notify('Цель удалена', 'info', { duration: 8000, actionLabel: 'Вернуть', action: async () => { const restored = await challengeStore.restoreChallenge(challenge); notify(restored.ok ? 'Цель восстановлена' : restored.message, restored.ok ? 'success' : 'danger') } }) }
</script>

<style scoped>
.goals-page { display: grid; gap: 12px; padding: 2px; }
.goals-summary { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--border-color); border-radius: 10px; background: var(--card-solid); }.goals-summary article { display: grid; gap: 4px; padding: 13px 15px; }.goals-summary article + article { border-left: 1px solid var(--border-color); }.goals-summary span { color: var(--text-muted); font-size: 9px; }.goals-summary strong { font-size: 20px; }
.goals-layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); align-items: start; gap: 12px; }.goals-list { position: sticky; top: calc(var(--header-height) + 12px); display: grid; gap: 2px; padding: 7px; }.goals-list > header { display: flex; align-items: center; justify-content: space-between; padding: 7px 7px 10px; }.goals-list > header strong { font-size: 11px; }.goals-list > header button { display: flex; align-items: center; gap: 4px; border: 0; color: var(--text-muted); background: transparent; font-size: 9px; }.goal-row { display: grid; grid-template-columns: 4px 1fr auto; align-items: center; gap: 9px; border: 0; border-radius: 8px; padding: 10px 8px; color: inherit; background: transparent; text-align: left; }.goal-row:hover, .goal-row.active { background: var(--control-bg); }.goal-row > i { width: 3px; height: 30px; border-radius: 3px; }.goal-row > span { min-width: 0; display: grid; gap: 3px; }.goal-row > span strong, .goal-row > span small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.goal-row > span strong { font-size: 10px; }.goal-row > span small { color: var(--text-muted); font-size: 8px; }.goal-row > b { font-size: 9px; }
.goal-content { min-width: 0; display: grid; gap: 12px; }.goal-head { display: grid; gap: 16px; border-top: 3px solid var(--goal-color); padding: 18px; }.goal-head > header { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text-muted); font-size: 9px; }.goal-status { margin-right: auto; border-radius: 999px; padding: 4px 7px; font-weight: 800; }.goal-status.active { color: var(--info); background: color-mix(in srgb,var(--info) 9%,var(--control-bg)); }.goal-status.completed { color: var(--success); background: color-mix(in srgb,var(--success) 9%,var(--control-bg)); }.goal-status.scheduled { color: var(--warning); background: color-mix(in srgb,var(--warning) 9%,var(--control-bg)); }.goal-status.overdue { color: var(--danger); background: color-mix(in srgb,var(--danger) 9%,var(--control-bg)); }.goal-status.paused { color: var(--text-muted); background: var(--control-bg); }.goal-head__body { display: flex; align-items: center; gap: 20px; }.goal-head__body > div { min-width: 0; flex: 1; }.goal-head h2 { margin: 0; font-size: 25px; }.goal-head__body p { margin: 5px 0 0; color: var(--text-secondary); font-size: 10px; }.goal-head dl { display: flex; flex-wrap: wrap; gap: 24px; margin: 16px 0 0; }.goal-head dl div { display: grid; gap: 3px; }.goal-head dt { color: var(--text-muted); font-size: 8px; }.goal-head dd { margin: 0; font-size: 10px; font-weight: 700; }.goal-head > footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid var(--border-color); padding-top: 13px; }.goal-head > footer > div { display: flex; gap: 6px; }.goal-insights { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(250px, .7fr); gap: 12px; }.goals-empty { min-height: 360px; display: grid; justify-items: center; align-content: center; gap: 8px; padding: 30px; text-align: center; }.goals-empty h2, .goals-empty p { margin: 0; }.goals-empty p { max-width: 430px; margin-bottom: 7px; color: var(--text-muted); }
@media (max-width: 900px) { .goals-layout { grid-template-columns: 1fr; }.goals-list { position: static; display: flex; overflow-x: auto; }.goals-list > header { min-width: 100px; }.goal-row { min-width: 190px; }.goal-insights { grid-template-columns: 1fr; } }
@media (max-width: 620px) { .goals-summary { grid-template-columns: 1fr 1fr; }.goals-summary article:nth-child(3) { border-left: 0; }.goals-summary article:nth-child(n + 3) { border-top: 1px solid var(--border-color); }.goal-head__body { align-items: flex-start; flex-direction: column; }.goal-head > footer, .goal-head__primary-actions { align-items: stretch; flex-direction: column; }.goal-head > footer > div:last-child { align-self: flex-end; } }
</style>
