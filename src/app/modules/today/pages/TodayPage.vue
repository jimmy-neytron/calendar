<template>
  <section class="today-page">
    <UiPageHeader
      eyebrow="Ежедневная сводка"
      :title="capitalizedTodayTitle"
      description="События и важные дела из доступных вам разделов — в одном месте."
    >
      <template #actions>
        <UiButton variant="secondary" icon="settings" @click="isCustomizeOpen = true">Настроить</UiButton>
        <UiButton icon="plus" @click="createEvent">Событие</UiButton>
        <div class="ui-page-header-stat">
          <small>В сводке</small>
          <strong>{{ visibleHighlights }}</strong>
          <span>пунктов</span>
        </div>
      </template>
    </UiPageHeader>

    <section v-if="nextEvent" class="today-page__next panel">
      <span><UiIcon name="clock" /></span>
      <div><small>Следующее событие</small><strong>{{ nextEvent.title }}</strong><p>{{ nextEventTimeLabel }}</p></div>
      <UiButton variant="secondary" size="sm" @click="openCalendarEvent(nextEvent)">Открыть</UiButton>
    </section>

    <div class="today-page__grid">
      <TodaySectionCard
        v-for="section in visibleSections"
        :key="section.id"
        v-bind="section"
        @item-action="handleItemAction($event)"
        @open-item="openSectionItem(section, $event)"
      />
    </div>
    <section v-if="!visibleSections.length" class="today-page__empty panel"><UiIcon name="home" /><strong>Сводка настроена</strong><p>Все карточки скрыты. Верните нужные разделы через настройки.</p><UiButton variant="secondary" @click="isCustomizeOpen = true">Настроить</UiButton></section>
    <TodayCustomizeModal v-model="isCustomizeOpen" :ordered-sections="orderedSections" :hidden-section-ids="hiddenSectionIds" @move="moveSection" @visibility="setSectionVisible" @reset="reset" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import UiPageHeader from '../../../components/ui/UiPageHeader.vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import TodaySectionCard from '../components/TodaySectionCard.vue'
import TodayCustomizeModal from '../components/TodayCustomizeModal.vue'
import { useTodaySections, type TodayCardItem, type TodaySection } from '../composables/useTodaySections'
import { useTodayPreferences } from '../composables/useTodayPreferences'
import { calendarStore } from '../../../stores/calendar.store.js'
import { challengeStore } from '../../../stores/challenge.store.js'
import { sportStore } from '../../../stores/sport.store.js'
import { useNotification } from '../../../composables/ui/useNotification.js'

const { sections, todayTitle } = useTodaySections()
const { preferences, hiddenSectionIds, setSectionVisible, moveSection, reset } = useTodayPreferences()
const router = useRouter()
const { notify } = useNotification()
const isCustomizeOpen = ref(false)
const capitalizedTodayTitle = computed(() => todayTitle.charAt(0).toUpperCase() + todayTitle.slice(1))
const orderedSections = computed(() => [...sections.value].sort((a, b) => preferences.value.sectionOrder.indexOf(a.id) - preferences.value.sectionOrder.indexOf(b.id)))
const visibleSections = computed(() => orderedSections.value.filter((section) => !hiddenSectionIds.value.has(section.id)))
const visibleHighlights = computed(() => visibleSections.value.reduce((total, section) => total + section.items.length, 0))
const nextEvent = computed(() => calendarStore.todayEvents.value.find((event) => {
  if (event.completedAt) return false
  if (event.allDay || !event.endTime) return true
  return event.endTime >= new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
}) || null)
const nextEventTimeLabel = computed(() => nextEvent.value?.allDay ? 'Весь день' : [nextEvent.value?.startTime, nextEvent.value?.location].filter(Boolean).join(' · '))

function createEvent() { router.push({ name: 'calendar', query: { create: String(Date.now()) } }) }
function openCalendarEvent(event: { id: string; date: string }) { router.push({ name: 'calendar', query: { event: event.id, eventDate: event.date } }) }
function openSectionItem(section: TodaySection, item: TodayCardItem) { router.push({ name: section.routeName, query: item.routeQuery || {} }) }
function handleItemAction(item: TodayCardItem) {
  if (item.action === 'toggle-event') {
    const event = calendarStore.todayEvents.value.find((candidate) => candidate.id === item.id)
    const result = event && calendarStore.updateEvent(event.id, { completedAt: event.completedAt ? null : new Date().toISOString() })
    notify(result?.ok ? (event?.completedAt ? 'Выполнение снято' : 'Событие выполнено') : 'Не удалось обновить событие', result?.ok ? 'success' : 'warning')
  } else if (item.action === 'toggle-challenge') {
    const result = challengeStore.toggleDate(item.id)
    notify(result.ok ? (result.completed ? 'Цель отмечена' : 'Отметка снята') : result.message, result.ok ? 'success' : 'warning')
  } else if (item.action === 'toggle-exercise') {
    sportStore.toggleExercise(item.id, sportStore.todayKey.value)
    notify(item.done ? 'Выполнение снято' : 'Упражнение выполнено', 'success')
  }
}
</script>

<style scoped>
.today-page {
  display: grid;
  gap: 18px;
  width: min(100%, 1320px);
  margin: 0 auto;
  padding-bottom: 28px;
}

.today-page__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.today-page__next{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:12px;padding:13px 15px;border-color:var(--accent-border);background:linear-gradient(120deg,var(--accent-soft),var(--card-solid))}.today-page__next>span{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;color:var(--text-inverse);background:var(--accent)}.today-page__next small,.today-page__next strong,.today-page__next p{display:block;margin:0}.today-page__next small{color:var(--accent);font-size:9px;font-weight:850;text-transform:uppercase}.today-page__next strong{margin-top:2px;font-size:14px}.today-page__next p{margin-top:2px;color:var(--text-muted);font-size:10px}.today-page__empty{display:grid;justify-items:center;gap:7px;padding:45px;text-align:center}.today-page__empty>svg{color:var(--accent);font-size:28px}.today-page__empty p{margin:0;color:var(--text-muted)}

@media (max-width: 1100px) {
  .today-page__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 680px) {
  .today-page__grid { grid-template-columns: 1fr; }
  .today-page__next{grid-template-columns:38px minmax(0,1fr)}.today-page__next>.ui-button{grid-column:1/-1;width:100%}
}
</style>
