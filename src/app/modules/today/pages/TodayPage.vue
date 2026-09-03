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

    <section v-if="activeSections.length" class="today-page__focus">
      <header class="today-page__section-heading">
        <div><small>Фокус дня</small><h2>Ваши дела и планы</h2></div>
        <span>{{ activeSections.length }} активных разделов</span>
      </header>
      <div class="today-page__grid">
        <TodaySectionCard
          v-for="section in activeSections"
          :key="section.id"
          v-bind="section"
          @item-action="handleItemAction($event)"
          @open-item="openSectionItem(section, $event)"
        />
      </div>
    </section>

    <section v-if="quietSections.length" class="today-page__quiet">
      <header class="today-page__section-heading">
        <div><small>Всё спокойно</small><h2>Разделы без дел</h2></div>
      </header>
      <nav aria-label="Разделы без дел на сегодня">
        <RouterLink v-for="section in quietSections" :key="section.id" :to="{ name: section.routeName }">
          <span><UiIcon :name="section.icon" /></span>
          <b>{{ section.title }}</b>
          <UiIcon name="right" />
        </RouterLink>
      </nav>
    </section>
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
const activeSections = computed(() => visibleSections.value.filter((section) => section.items.length))
const quietSections = computed(() => visibleSections.value.filter((section) => !section.items.length))
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
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-flow: dense;
  grid-auto-rows: 56px;
  gap: 12px;
}
.today-page__grid > * { grid-column: span 4; grid-row: span 4; }
.today-page__grid > :deep([data-section='calendar']) { grid-column: span 8; grid-row: span 5; }
.today-page__grid > :deep([data-section='challenges']) { grid-column: span 4; grid-row: span 5; }
.today-page__grid > :deep([data-section='notes']),
.today-page__grid > :deep([data-section='ideas']) { grid-column: span 6; grid-row: span 4; }
.today-page__grid > :deep([data-section='time-tracking']) { grid-row: span 3; }
.today-page__focus,.today-page__quiet{display:grid;gap:11px}.today-page__section-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;padding:0 3px}.today-page__section-heading small{display:block;margin-bottom:3px;color:var(--text-muted);font-size:8px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.today-page__section-heading h2{margin:0;font-size:18px;letter-spacing:-.02em}.today-page__section-heading>span{color:var(--text-muted);font-size:9px}.today-page__quiet{margin-top:4px;padding-top:16px;border-top:1px solid var(--border-color)}.today-page__quiet nav{display:flex;flex-wrap:wrap;gap:7px}.today-page__quiet a{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:7px;min-width:150px;border:1px solid var(--border-color);border-radius:11px;padding:7px 9px;color:var(--text-secondary);background:var(--card-soft);font-size:9px;text-decoration:none;transition:border-color .18s ease,background .18s ease}.today-page__quiet a:hover{border-color:var(--border-strong);color:var(--text-primary);background:var(--control-bg-hover)}.today-page__quiet a>span{display:grid;place-items:center;width:25px;height:25px;border-radius:7px;color:var(--text-muted);background:var(--control-bg)}.today-page__quiet a>svg{color:var(--text-muted);font-size:11px}
.today-page__next{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:12px;padding:13px 15px;border-color:color-mix(in srgb,var(--warning) 32%,var(--border-color));background:linear-gradient(110deg,color-mix(in srgb,var(--warning) 12%,var(--card-solid)),var(--card-solid) 58%)}.today-page__next>span{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;color:#fff;background:linear-gradient(145deg,var(--orange),var(--warning));box-shadow:0 8px 22px color-mix(in srgb,var(--warning) 22%,transparent)}.today-page__next small,.today-page__next strong,.today-page__next p{display:block;margin:0}.today-page__next small{color:var(--warning);font-size:9px;font-weight:850;text-transform:uppercase}.today-page__next strong{margin-top:2px;font-size:14px}.today-page__next p{margin-top:2px;color:var(--text-muted);font-size:10px}.today-page__empty{display:grid;justify-items:center;gap:7px;padding:45px;text-align:center}.today-page__empty>svg{color:var(--accent);font-size:28px}.today-page__empty p{margin:0;color:var(--text-muted)}

@media (max-width: 1100px) {
  .today-page__grid > * { grid-column: span 6; grid-row: span 4; }
  .today-page__grid > :deep([data-section='calendar']) { grid-column: span 12; grid-row: span 5; }
  .today-page__grid > :deep([data-section='challenges']),
  .today-page__grid > :deep([data-section='notes']),
  .today-page__grid > :deep([data-section='ideas']) { grid-column: span 6; grid-row: span 4; }
}

@media (max-width: 680px) {
  .today-page__grid{display:grid;grid-template-columns:1fr;grid-auto-rows:auto}.today-page__grid > *,.today-page__grid > :deep([data-section]){grid-column:1;grid-row:auto}
  .today-page__section-heading>span{display:none}.today-page__quiet nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.today-page__quiet a{min-width:0}
  .today-page__next{grid-template-columns:38px minmax(0,1fr)}.today-page__next>.ui-button{grid-column:1/-1;width:100%}
}
</style>
